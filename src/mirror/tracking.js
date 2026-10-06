// Camera tracking. Body tracking always runs; the face and hand trackers load in the
// background only when their add-on is switched on, and never hold up the body.
import { pc, MEDIAPIPE, POSE_MODEL, FACE_MODEL, HAND_MODEL } from './lib.js';
import { $, state, target, visible, shown, points, SHOW_AT, HIDE_AT, tuning } from './state.js';
import { makeFilters } from './filters.js';
import { features, setStatus } from './features.js';
import * as skeleton from './skeleton.js';

const video = $('cam');
// Data counts as fresh for 500 ms, or three detection frames on slower machines
export const freshMs = () => Math.max(500, 3000 / Math.max(stats.fps, 1));

export const stats = {
  fps: 0, frames: 0, since: performance.now(), delegate: '–',
  ms: { pose: 0, face: 0, hands: 0 }, handEvery: 1, busy: false,
};

// ---------- Loading ----------
let vision = null;      // the tasks-vision module, once imported
let filesetPromise = null;
function fileset() {
  filesetPromise ??= import(/* @vite-ignore */ `${MEDIAPIPE}/vision_bundle.mjs`).then(async (mod) => {
    vision = mod;
    return mod.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
  });
  return filesetPromise;
}
export const visionModule = () => vision;

// Download a model with progress; a failed download rejects instead of hanging
async function fetchModel(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress?.(got / total);
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  return buf;
}

async function create(Task, options, onProgress) {
  const [files, model] = await Promise.all([fileset(), fetchModel(options.baseOptions.modelAssetPath, onProgress)]);
  options = { ...options, baseOptions: { modelAssetBuffer: model } };
  try {
    const task = await Task().createFromOptions(files, { ...options, baseOptions: { modelAssetBuffer: model.slice(), delegate: 'GPU' } }); // a copy: the CPU retry needs the original
    return { task, delegate: 'GPU' };
  } catch {
    const task = await Task().createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
    return { task, delegate: 'CPU' };
  }
}

export const trackers = { pose: null, face: null, hands: null };
const loading = {};

export async function loadPose(onProgress) {
  if (trackers.pose) return trackers.pose;
  const { task, delegate } = await create(() => vision.PoseLandmarker, {
    baseOptions: { modelAssetPath: POSE_MODEL }, runningMode: 'VIDEO', numPoses: 1,
  }, onProgress);
  stats.delegate = delegate;
  return (trackers.pose = task);
}

const ADDON_TRACKERS = {
  face: (progress) => create(() => vision.FaceLandmarker, {
    baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: 'VIDEO', numFaces: 1,
    outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
    minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }, progress),
  hands: (progress) => create(() => vision.HandLandmarker, {
    baseOptions: { modelAssetPath: HAND_MODEL }, runningMode: 'VIDEO', numHands: 2,
    minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }, progress),
};

// Start loading any add-on tracker that is switched on; safe to call repeatedly
export function ensureAddonTrackers() {
  for (const [id, load] of Object.entries(ADDON_TRACKERS)) {
    if (!features[id].enabled || trackers[id] || loading[id]) continue;
    setStatus(id, 'loading');
    loading[id] = load((f) => setStatus(id, 'loading', `${Math.round(f * 100)}%`))
      .then(({ task }) => { trackers[id] = task; setStatus(id, 'waiting'); })
      .catch((e) => { setStatus(id, 'failed', String(e?.message ?? e).slice(0, 120)); })
      .finally(() => { if (!trackers[id]) loading[id] = null; });
  }
}

// ---------- Body ----------
const poseFilters = makeFilters(33 * 3 + 2);
const LIFT = 33 * 3, ROOT = LIFT + 1;

function ingestPose(result, t) {
  const world = result.worldLandmarks?.[0];
  const norm = result.landmarks?.[0];
  state.lastNorm = norm ?? null;
  if (!world || !norm) {
    if (performance.now() - state.lastSeen > 800) {
      state.hasPose = false;
      poseFilters.forEach((f) => f.reset());
      shown.fill(0);
    }
    return;
  }
  state.lastSeen = performance.now();
  const { minCutoff, beta } = tuning();

  // World landmarks are metres, hip-centred, y down, z away from camera.
  // Negating x turns the camera view into a mirror.
  for (let i = 0; i < 33; i++) {
    const w = world[i];
    target[i].set(
      poseFilters[i * 3].filter(-w.x, t, minCutoff, beta),
      poseFilters[i * 3 + 1].filter(-w.y, t, minCutoff, beta),
      poseFilters[i * 3 + 2].filter(-w.z, t, minCutoff, beta),
    );
    visible[i] = state.hasPose ? pc.math.lerp(visible[i], w.visibility ?? 1, 0.3) : (w.visibility ?? 1);
    shown[i] = shown[i] ? +(visible[i] > HIDE_AT) : +(visible[i] > SHOW_AT);
  }

  skeleton.constrain(target);

  // Put the feet on the floor; if they drop out of view, keep the last height instead of bouncing
  let lowest = Infinity;
  for (const i of [27, 28, 29, 30, 31, 32]) if (shown[i]) lowest = Math.min(lowest, target[i].y);
  if (Number.isFinite(lowest)) state.lift = poseFilters[LIFT].filter(-lowest, t, minCutoff * 0.5, beta * 0.5);
  for (const p of target) p.y += state.lift;

  // Follow side-to-side movement across the frame (mirrored)
  const hipX = (norm[23].x + norm[24].x) / 2;
  state.rootXTarget = poseFilters[ROOT].filter((0.5 - hipX) * 2.6, t, minCutoff, beta) - state.centerOffset;
  if (!state.hasPose) { points.forEach((p, i) => p.copy(target[i])); state.rootX = state.rootXTarget; }
  state.hasPose = true;
}

// ---------- Face ----------
// At full-body distance the face is only a few dozen pixels wide, so the face tracker runs on a
// zoomed-in square crop around the head instead of the whole frame.
const CROP_PX = 256;
const cropCanvas = document.createElement('canvas');
cropCanvas.width = cropCanvas.height = CROP_PX;
const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
export const cropImage = cropCtx;
const cropFilters = makeFilters(3);
let faceMisses = 0;

export const face = {
  landmarks: null,   // 478 points in full camera-image coordinates (x, y in 0..1, z in x units)
  blend: {},         // blendshape name -> score
  matrix: null,      // 4x4 column-major head transform from the face tracker
  time: 0,
  rect: null,        // the crop that produced the last result, in video pixels
  frameIndex: 0,     // increments with every new result
};

function headRect(W, H) {
  // Prefer the last face result: it frames the head more tightly than the body landmarks
  if (face.landmarks && performance.now() - face.time < freshMs()) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of face.landmarks) {
      x0 = Math.min(x0, p.x * W); x1 = Math.max(x1, p.x * W);
      y0 = Math.min(y0, p.y * H); y1 = Math.max(y1, p.y * H);
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(x1 - x0, y1 - y0) * 1.7 };
  }
  const n = state.lastNorm;
  if (!n) return null;
  const px = (i) => [n[i].x * W, n[i].y * H];
  const [nx, ny] = px(0);
  const span = Math.max(
    Math.hypot(px(7)[0] - px(8)[0], px(7)[1] - px(8)[1]),
    Math.hypot(px(2)[0] - px(5)[0], px(2)[1] - px(5)[1]) * 2.2,
    Math.hypot(px(11)[0] - px(12)[0], px(11)[1] - px(12)[1]) * 0.5,
  );
  return { cx: nx, cy: ny - span * 0.15, size: span * 2.6 };
}

function trackFace(t, now) {
  const W = video.videoWidth, H = video.videoHeight;
  let rect = faceMisses >= 3 ? null : headRect(W, H);
  if (rect) {
    rect.cx = cropFilters[0].filter(rect.cx, t, 1.5, 0.02);
    rect.cy = cropFilters[1].filter(rect.cy, t, 1.5, 0.02);
    rect.size = Math.max(96, cropFilters[2].filter(rect.size, t, 1, 0.01));
    rect = { sx: rect.cx - rect.size / 2, sy: rect.cy - rect.size / 2, size: rect.size };
  } else {
    // Whole frame, letterboxed into the same square
    const size = Math.max(W, H);
    rect = { sx: (W - size) / 2, sy: (H - size) / 2, size };
    cropFilters.forEach((f) => f.reset());
  }
  cropCtx.fillStyle = '#000';
  cropCtx.fillRect(0, 0, CROP_PX, CROP_PX);
  cropCtx.drawImage(video, rect.sx, rect.sy, rect.size, rect.size, 0, 0, CROP_PX, CROP_PX);

  const t0 = performance.now();
  const result = trackers.face.detectForVideo(cropCanvas, now);
  stats.ms.face = pc.math.lerp(stats.ms.face, performance.now() - t0, 0.1);

  const lm = result.faceLandmarks?.[0];
  if (!lm) {
    faceMisses = faceMisses >= 3 ? 0 : faceMisses + 1; // after one whole-frame try, go back to the crop
    return;
  }
  faceMisses = 0;
  const k = rect.size / CROP_PX;
  face.landmarks = lm.map((p) => ({
    x: (rect.sx + p.x * CROP_PX * k) / W,
    y: (rect.sy + p.y * CROP_PX * k) / H,
    z: (p.z * CROP_PX * k) / W,
  }));
  face.blend = Object.fromEntries((result.faceBlendshapes?.[0]?.categories ?? []).map((c) => [c.categoryName, c.score]));
  face.matrix = result.facialTransformationMatrixes?.[0]?.data ?? null;
  face.rect = rect;
  face.time = performance.now();
  face.frameIndex++;
}

// ---------- Hands ----------
// Each hand is stored relative to its wrist, mirrored and filtered, keyed by the body wrist
// it belongs to (15 = person's left, 16 = right).
const handFilters = { 15: makeFilters(63), 16: makeFilters(63) };
export const hands = {
  15: { local: Array.from({ length: 21 }, () => new pc.Vec3()), time: 0, norm: null },
  16: { local: Array.from({ length: 21 }, () => new pc.Vec3()), time: 0, norm: null },
};

// Why a hand did or didn't get finger data, for the checklist
export const handDiag = {
  lastRun: 0,        // when the hand tracker last ran
  found: 0,          // hands it saw on that run
  lastFound: 0,      // when it last saw any hand
  rejected: { 15: null, 16: null }, // { dist, time } when a hand was seen but too far from that wrist
};
// How far (in image widths) a detected hand may be from the body tracker's wrist and still be
// attached: at least 15% of the frame, or one shoulder width, since the body tracker's wrist
// can be well off when the arm is partly hidden
function maxWristDist(n) {
  const shoulders = Math.hypot(n[11].x - n[12].x, n[11].y - n[12].y);
  return Math.max(0.15, shoulders);
}

function trackHands(t, now) {
  const t0 = performance.now();
  const result = trackers.hands.detectForVideo(video, now);
  stats.ms.hands = pc.math.lerp(stats.ms.hands, performance.now() - t0, 0.1);
  handDiag.lastRun = performance.now();
  handDiag.found = result.landmarks?.length ?? 0;
  if (handDiag.found) handDiag.lastFound = handDiag.lastRun;
  const n = state.lastNorm;
  if (!n || !result.landmarks?.length) return;

  // Match hands to body wrists by image distance, not by the tracker's left/right label
  const found = result.landmarks.map((lm, h) => ({ lm, world: result.worldLandmarks[h] }));
  const dist = (f, w) => Math.hypot(f.lm[0].x - n[w].x, f.lm[0].y - n[w].y);
  let pairs;
  if (found.length === 1) pairs = [[found[0], dist(found[0], 15) < dist(found[0], 16) ? 15 : 16]];
  else {
    const straight = dist(found[0], 15) + dist(found[1], 16);
    const swapped = dist(found[0], 16) + dist(found[1], 15);
    pairs = straight <= swapped ? [[found[0], 15], [found[1], 16]] : [[found[0], 16], [found[1], 15]];
  }

  const { minCutoff, beta } = tuning();
  const limit = maxWristDist(n);
  for (const [f, wrist] of pairs) {
    if (dist(f, wrist) > limit) { // too far from any wrist to trust
      handDiag.rejected[wrist] = { dist: dist(f, wrist), time: performance.now() };
      continue;
    }
    handDiag.rejected[wrist] = null;
    const hand = hands[wrist];
    const fl = handFilters[wrist];
    if (performance.now() - hand.time > handFreshMs()) fl.forEach((x) => x.reset());
    const w0 = f.world[0];
    f.world.forEach((p, j) => hand.local[j].set(
      fl[j * 3].filter(-(p.x - w0.x), t, minCutoff * 1.5, beta * 2),
      fl[j * 3 + 1].filter(-(p.y - w0.y), t, minCutoff * 1.5, beta * 2),
      fl[j * 3 + 2].filter(-(p.z - w0.z), t, minCutoff * 1.5, beta * 2),
    ));
    hand.norm = f.lm;
    hand.time = performance.now();
  }
}

// ---------- Per-frame scheduling ----------
let lastVideoTime = -1;
let frameNo = 0;
let lastStamp = 0;

export function resetTracking() {
  lastVideoTime = -1;
  state.hasPose = false;
  state.lastNorm = null;
}

export function track() {
  const now = performance.now();
  if (trackers.pose && state.stream && !state.frozen && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    // Every tracker needs strictly increasing timestamps
    const stamp = Math.max(now, lastStamp + 1);
    lastStamp = stamp;
    const t = stamp / 1000;
    frameNo++;

    const t0 = performance.now();
    ingestPose(trackers.pose.detectForVideo(video, stamp), t);
    stats.ms.pose = pc.math.lerp(stats.ms.pose, performance.now() - t0, 0.1);
    stats.frames++;

    const faceOn = features.face.enabled && trackers.face;
    if (faceOn && state.hasPose) trackFace(t, stamp);

    // Hands share the budget with the face; drop them to every third frame when the machine is struggling
    const total = stats.ms.pose + (faceOn ? stats.ms.face : 0) + stats.ms.hands;
    stats.busy = total > 45;
    stats.handEvery = stats.busy ? 3 : faceOn ? 2 : 1;
    if (features.hands.enabled && trackers.hands && state.hasPose && frameNo % stats.handEvery === 0) trackHands(t, stamp);
  }
  if (now - stats.since > 1000) { stats.fps = stats.frames; stats.frames = 0; stats.since = now; }

  // Add-on status follows the age of their data
  if (trackers.face) setStatus('face', now - face.time < freshMs() ? 'active' : 'waiting', now - face.time < freshMs() ? '' : 'looking for your face');
  if (trackers.hands) {
    const live = [15, 16].filter((w) => now - hands[w].time < handFreshMs()).length;
    setStatus('hands', live ? 'active' : 'waiting', live ? `${live} hand${live > 1 ? 's' : ''}` : 'show your hands');
  }
}

// Hands are sampled every `handEvery` frames, so their data stays fresh for that much longer
export const handFreshMs = () => freshMs() * stats.handEvery;
export const handFresh = (wrist) => performance.now() - hands[wrist].time < handFreshMs();

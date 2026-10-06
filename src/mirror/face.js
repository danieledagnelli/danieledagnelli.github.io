// Face add-on: a 478-point face mesh painted with the live camera picture, plus head
// orientation. Without fresh face data the head falls back to the body tracker's estimate.
import { pc } from './lib.js';
import { $, points, ok, tuning } from './state.js';
import { app, material } from './scene.js';
import { makeFilters } from './filters.js';
import { features } from './features.js';
import { face, visionModule, cropImage, freshMs } from './tracking.js';

const video = $('cam');
const N = 478;
const NOSE_TIP = 1, CHEEK_L = 234, CHEEK_R = 454;
const FACE_WIDTH_M = 0.14; // typical cheekbone-to-cheekbone width
// Openings in the face mesh, as rings of landmark indices: both eyes and the inner lips
const HOLES = [
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191],
];

export const figureHead = new pc.Entity('head-root'); // added to the figure by avatar.js

// ---------- Skin colour, learned from the cheeks once the face is visible ----------
export const skinMat = material(0.42, 0.55, 0.48);
skinMat.gloss = 0.35;
skinMat.update();
const skinGoal = skinMat.diffuse.clone();
let skinSampledAt = 0;
let skinKnown = false;
export const skinLearned = () => skinKnown;
function sampleSkin() {
  if (!face.rect || performance.now() - skinSampledAt < 1000) return;
  skinSampledAt = performance.now();
  const W = video.videoWidth, H = video.videoHeight, k = 256 / face.rect.size;
  let r = 0, g = 0, b = 0, n = 0;
  for (const i of [50, 280, 101, 330]) { // cheeks, away from eyes and mouth
    const p = face.landmarks[i];
    const x = Math.round((p.x * W - face.rect.sx) * k), y = Math.round((p.y * H - face.rect.sy) * k);
    if (x < 2 || y < 2 || x > 253 || y > 253) continue;
    const d = cropImage.getImageData(x - 2, y - 2, 5, 5).data;
    for (let j = 0; j < d.length; j += 4) { r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; }
  }
  if (!n) return;
  skinGoal.set(r / n / 255, g / n / 255, b / n / 255);
  skinKnown = true;
}

// ---------- Head shell (always used when the skin or face add-on is on) ----------
const shell = new pc.Entity('head-shell');
shell.addComponent('render', { type: 'sphere', material: skinMat, castShadows: true });
figureHead.addChild(shell);

// ---------- Face mesh ----------
let mesh = null, maskEntity = null, videoTex = null;
const positions = new Float32Array(N * 3);
const uvs = new Float32Array(N * 2);
let indices = null;
const filters = makeFilters(N * 3);
let sharp = null; // lips and eyes: less smoothing so speech and blinks stay crisp
let lastFrameIndex = -1;

function buildMesh(vision) {
  const tess = vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  const tris = [];
  for (let i = 0; i + 2 < tess.length; i += 3) tris.push(tess[i].start, tess[i + 1].start, tess[i + 2].start);
  // The tessellation leaves the eyes and mouth open; fan-fill them so the camera's own
  // eyes and open mouth show through instead of holes
  for (const hole of HOLES) for (let i = 1; i + 1 < hole.length; i++) tris.push(hole[0], hole[i], hole[i + 1]);
  indices = new Uint16Array(tris);
  sharp = new Uint8Array(N);
  for (const set of [vision.FaceLandmarker.FACE_LANDMARKS_LIPS, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
    vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
    vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW]) {
    for (const c of set ?? []) { sharp[c.start] = 1; sharp[c.end] = 1; }
  }

  const device = app.graphicsDevice;
  videoTex = new pc.Texture(device, {
    name: 'camera', format: pc.PIXELFORMAT_SRGBA8, mipmaps: false,
    minFilter: pc.FILTER_LINEAR, magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });
  videoTex.setSource(video);

  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color(1, 1, 1);
  mat.emissiveMap = videoTex;
  mat.useLighting = false;
  mat.cull = pc.CULLFACE_NONE;
  mat.update();

  mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update();
  maskEntity = new pc.Entity('face-mask');
  maskEntity.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows: true });
  figureHead.addChild(maskEntity);
}

// Mesh vertices in metres, relative to the nose tip, mirrored like the rest of the figure
const local = Array.from({ length: N }, () => new pc.Vec3());
function updateMeshFromFace() {
  const W = video.videoWidth || 1, H = video.videoHeight || 1;
  const lm = face.landmarks;
  const P = (i) => [lm[i].x * W, lm[i].y * H, lm[i].z * W];
  const a = P(CHEEK_L), b = P(CHEEK_R);
  const s = FACE_WIDTH_M / Math.max(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), 1e-3);
  const [nx, ny, nz] = P(NOSE_TIP);
  const t = performance.now() / 1000;
  const { minCutoff, beta } = tuning();
  for (let i = 0; i < N; i++) {
    const [x, y, z] = P(i);
    const mc = sharp[i] ? minCutoff * 3 : minCutoff;
    const bt = sharp[i] ? beta * 2 : beta;
    local[i].set(
      filters[i * 3].filter(-(x - nx) * s, t, mc, bt),
      filters[i * 3 + 1].filter(-(y - ny) * s, t, mc, bt),
      filters[i * 3 + 2].filter(-(z - nz) * s, t, mc, bt),
    );
    uvs[i * 2] = lm[i].x;
    uvs[i * 2 + 1] = lm[i].y;
  }
}

// ---------- Head orientation ----------
export const head = { quat: new pc.Quat(), fromFace: false, yaw: 0, pitch: 0, roll: 0 };
const goalQuat = new pc.Quat();
const basis = new pc.Mat4();
const vx = new pc.Vec3(), vy = new pc.Vec3(), vz = new pc.Vec3();

function setBasis() {
  basis.set([vx.x, vx.y, vx.z, 0, vy.x, vy.y, vy.z, 0, vz.x, vz.y, vz.z, 0, 0, 0, 0, 1]);
  goalQuat.setFromMat4(basis);
}

// The face tracker's rotation, mirrored across x like everything else (M·R·M with M = diag(-1,1,1))
function orientationFromFace(d) {
  vx.set(d[0], -d[1], -d[2]).normalize();
  vy.set(-d[4], d[5], d[6]).normalize();
  vz.set(-d[8], d[9], d[10]).normalize();
  setBasis();
}

// Estimate from the body tracker: ear to ear gives sideways, ears to nose gives forward
function orientationFromBody() {
  const earMid = new pc.Vec3().add2(points[7], points[8]).mulScalar(0.5);
  vx.sub2(points[8], points[7]).normalize();
  vz.sub2(points[0], earMid);
  vz.sub(vx.clone().mulScalar(vz.dot(vx))).normalize();
  vy.cross(vz, vx).normalize();
  setBasis();
}

// ---------- Per frame ----------
export function updateHead(dt, skinBlend) {
  const vision = visionModule();
  if (!mesh && vision && features.face.enabled) buildMesh(vision);

  const fresh = face.landmarks && performance.now() - face.time < freshMs();
  const faceBlend = features.face.blend;
  const headBlend = Math.max(skinBlend, faceBlend);
  figureHead.enabled = ok(0, 7, 8) && headBlend > 0.001;
  if (!figureHead.enabled) { if (maskEntity) maskEntity.enabled = false; return { headBlend }; }

  // Orientation: the face tracker's when fresh, otherwise the body estimate
  if (fresh && face.matrix) orientationFromFace(face.matrix);
  else orientationFromBody();
  head.fromFace = Boolean(fresh && face.matrix);
  head.quat.slerp(head.quat, goalQuat, 1 - Math.exp(-dt * 18));
  const e = head.quat.getEulerAngles();
  [head.pitch, head.yaw, head.roll] = [e.x, e.y, e.z];

  const forward = head.quat.transformVector(pc.Vec3.FORWARD.clone().mulScalar(-1)); // local +z
  const up = head.quat.transformVector(pc.Vec3.UP.clone());

  // The head is anchored on the body tracker's nose so it always stays on the body
  // Without face data the shell is a whole head between the ears; with it, the shell shrinks to a
  // skull that sits behind the face mesh so the face stays in front
  const nose = points[0];
  const earMid = new pc.Vec3().add2(points[7], points[8]).mulScalar(0.5);
  const bodyCenter = new pc.Vec3().lerp(earMid, nose, 0.35);
  const faceCenter = nose.clone().sub(forward.clone().mulScalar(0.14)).add(up.clone().mulScalar(0.025));
  const fk = faceBlend; // follows the same fade as the mask, so the two always match
  const shellCenter = new pc.Vec3().lerp(bodyCenter, faceCenter, fk);
  shell.setLocalPosition(shellCenter);
  shell.setLocalRotation(head.quat);
  const size = pc.math.clamp(points[7].distance(points[8]) * 1.6, 0.16, 0.3);
  shell.setLocalScale(
    pc.math.lerp(size * 0.92, 0.15, fk) * headBlend,
    pc.math.lerp(size * 1.18, 0.21, fk) * headBlend,
    pc.math.lerp(size * 1.02, 0.19, fk) * headBlend, // front stays ~4.5 cm behind the nose tip, behind the eyes
  );

  // Face mesh, grown out from the nose tip as the add-on blends in
  if (maskEntity) {
    if (fresh && face.frameIndex !== lastFrameIndex) {
      lastFrameIndex = face.frameIndex;
      updateMeshFromFace();
      sampleSkin();
    }
    maskEntity.enabled = faceBlend > 0.001;
    if (maskEntity.enabled) {
      for (let i = 0; i < N; i++) {
        positions[i * 3] = local[i].x * faceBlend;
        positions[i * 3 + 1] = local[i].y * faceBlend;
        positions[i * 3 + 2] = local[i].z * faceBlend;
      }
      mesh.setPositions(positions);
      mesh.setUvs(0, uvs);
      mesh.update(pc.PRIMITIVE_TRIANGLES, true);
      maskEntity.setLocalPosition(nose);
      videoTex.upload();
    }
  }

  // Ease the skin colour towards what the camera sees
  if (skinKnown) {
    skinMat.diffuse.lerp(skinMat.diffuse, skinGoal, 1 - Math.exp(-dt * 2));
    skinMat.update();
  }
  return { headBlend, shellCenter, up };
}

// Dev-only inspection hook for tests
export function faceDebug() {
  const mi = maskEntity?.render?.meshInstances?.[0];
  return {
    nose: points[0].toString(),
    maskPos: maskEntity?.getPosition().toString(),
    aabb: mi ? { center: mi.aabb.center.toString(), half: mi.aabb.halfExtents.toString() } : null,
    sample: [1, 10, 152, 234, 454].map((i) => local[i].toString()),
    uv: [1, 10, 152].map((i) => [uvs[i * 2].toFixed(3), uvs[i * 2 + 1].toFixed(3)]),
  };
}

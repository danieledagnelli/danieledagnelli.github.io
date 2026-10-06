// Validation aids: grid, axes, ruler, 3D measures, the camera-preview overlay and the readout
import { pc, POSE_MODEL_NAME } from './lib.js';
import { $, state, points, shown, ok, isLeft, wp, VIS } from './state.js';
import { app, camera } from './scene.js';
import { figure, BONES } from './avatar.js';
import { features, STATUS_TEXT } from './features.js';
import { stats, face, freshMs } from './tracking.js';
import { head } from './face.js';
import { lengths, SEGMENT_NAMES } from './skeleton.js';

const video = $('cam');

// ---------- Grid, axes and ruler ----------
const gridColor = new pc.Color(0.1, 0.28, 0.17);
const gridMajor = new pc.Color(0.16, 0.45, 0.27);
const gridLines = [], gridColors = [];
for (let v = -3; v <= 3.001; v += 0.5) {
  const c = Math.abs(v % 1) < 1e-6 ? gridMajor : gridColor;
  gridLines.push(new pc.Vec3(v, 0, -3), new pc.Vec3(v, 0, 3), new pc.Vec3(-3, 0, v), new pc.Vec3(3, 0, v));
  gridColors.push(c, c, c, c);
}

const AXIS_LEN = 0.5;
const ORIGIN = new pc.Vec3(0, 0.002, 0);
const AXES = [
  { end: new pc.Vec3(AXIS_LEN, 0.002, 0), color: new pc.Color(1, 0.35, 0.35), label: '+X', cls: 'ax-x' },
  { end: new pc.Vec3(0, AXIS_LEN, 0), color: new pc.Color(0.22, 1, 0.53), label: '+Y', cls: 'ax-y' },
  { end: new pc.Vec3(0, 0.002, AXIS_LEN), color: new pc.Color(0.35, 0.66, 1), label: '+Z', cls: 'ax-z' },
];

// Height ruler beside the figure, 10 cm ticks, labelled every 50 cm
const RULER_X = 1.3;
const rulerLines = [new pc.Vec3(RULER_X, 0, 0), new pc.Vec3(RULER_X, 2, 0)];
const rulerTicks = [];
for (let cm = 0; cm <= 200; cm += 10) {
  const y = cm / 100;
  const w = cm % 50 === 0 ? 0.08 : 0.035;
  rulerLines.push(new pc.Vec3(RULER_X, y, 0), new pc.Vec3(RULER_X - w, y, 0));
  if (cm % 50 === 0) rulerTicks.push({ pos: new pc.Vec3(RULER_X + 0.14, y, 0), text: `${(cm / 100).toFixed(1)} m` });
}
const rulerColor = new pc.Color(0.45, 0.55, 0.5);

// HTML labels projected from 3D each frame
const labelsEl = $('labels');
function makeTag(text, cls) {
  const el = document.createElement('span');
  el.className = `tag ${cls}`;
  el.style.cssText = 'position:absolute;left:0;top:0;';
  el.textContent = text;
  labelsEl.appendChild(el);
  return el;
}
function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
const axisTags = AXES.map((a) => ({ el: makeTag(a.label, a.cls), pos: a.end }));
const tickTags = rulerTicks.map((t) => ({ el: makeTag(t.text, 'tick'), pos: t.pos }));
const screen = new pc.Vec3();
function placeTag(el, pos, dy = 0) {
  camera.camera.worldToScreen(pos, screen);
  const show = screen.z > 0;
  el.hidden = !show;
  if (show) el.style.transform = `translate(${screen.x}px, ${screen.y + dy}px) translate(-50%, -50%)`;
}

// ---------- Tracked data mapped into 3D (toggle with M) ----------
// Every one of the 33 landmarks as a small dot, coloured by side
function dotMaterial(r, g, b) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(0, 0, 0);
  m.emissive = new pc.Color(r, g, b);
  m.useLighting = false;
  // Drawn in the transparent pass without depth testing, so points inside the body stay visible
  m.blendType = pc.BLEND_NORMAL;
  m.depthTest = false;
  m.depthWrite = false;
  m.update();
  return m;
}
const dotMats = { L: dotMaterial(0.77, 0.6, 1), R: dotMaterial(1, 0.7, 0.28), C: dotMaterial(1, 1, 1) };
const dots = Array.from({ length: 33 }, (_, i) => {
  const e = new pc.Entity(`landmark-${i}`);
  e.addComponent('render', { type: 'sphere', material: i === 0 ? dotMats.C : isLeft(i) ? dotMats.L : dotMats.R, castShadows: false });
  e.setLocalScale(0.03, 0.03, 0.03);
  figure.addChild(e);
  return e;
});

// Coordinates on wrists, ankles and nose, with a drop line to the floor
const TRACKED = [
  { i: 16, name: 'R hand', cls: 'R' }, { i: 15, name: 'L hand', cls: 'L' },
  { i: 28, name: 'R foot', cls: 'R' }, { i: 27, name: 'L foot', cls: 'L' },
  { i: 0, name: 'nose', cls: 'C' },
].map((t) => ({ ...t, el: makeTag(t.name, t.cls) }));

// Joint angles drawn as arcs at the joint
const ANGLES = [
  { name: 'R elbow', a: 12, b: 14, c: 16 }, { name: 'L elbow', a: 11, b: 13, c: 15 },
  { name: 'R knee', a: 24, b: 26, c: 28 }, { name: 'L knee', a: 23, b: 25, c: 27 },
  { name: 'R shoulder', a: 14, b: 12, c: 24 }, { name: 'L shoulder', a: 13, b: 11, c: 23 },
].map((t) => ({ ...t, el: makeTag('', `m ${isLeft(t.b) ? 'L' : 'R'}`) }));
const shoulderTag = makeTag('', 'm');
const heightTag = makeTag('', 'm');

const ARC_R = 0.09, ARC_STEPS = 14;
const arcColor = new pc.Color(1, 0.95, 0.55);
const measureColor = new pc.Color(0.85, 0.9, 0.88);
const dropColor = new pc.Color(0.5, 0.6, 0.55);
const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2);
const deg = (n) => `${Math.round(n)}°`;

function drawArc(t) {
  const B = wp(t.b);
  const u = wp(t.a).sub(B).normalize();
  const v = wp(t.c).sub(B).normalize();
  const theta = Math.acos(pc.math.clamp(u.dot(v), -1, 1));
  const sinT = Math.sin(theta);
  const line = [];
  let prev = null, midPt = null;
  for (let s = 0; s <= ARC_STEPS; s++) {
    const f = s / ARC_STEPS;
    // Spherical interpolation from u to v
    const wu = sinT < 1e-4 ? 1 - f : Math.sin((1 - f) * theta) / sinT;
    const wv = sinT < 1e-4 ? f : Math.sin(f * theta) / sinT;
    const pnt = new pc.Vec3(u.x * wu + v.x * wv, u.y * wu + v.y * wv, u.z * wu + v.z * wv).mulScalar(ARC_R).add(B);
    if (prev) line.push(prev, pnt);
    if (s === ARC_STEPS / 2) midPt = pnt;
    prev = pnt;
  }
  line.push(B, u.clone().mulScalar(ARC_R).add(B), B, v.clone().mulScalar(ARC_R).add(B));
  app.drawLines(line, arcColor, false);
  setText(t.el, `${t.name} ${Math.round(theta * pc.math.RAD_TO_DEG)}°`);
  placeTag(t.el, new pc.Vec3().sub2(midPt, B).mulScalar(2.2).add(B));
}

function drawMeasures() {
  const on = state.debug && state.measures && state.hasPose;
  dots.forEach((e, i) => { e.enabled = on && shown[i] === 1; if (e.enabled) e.setLocalPosition(points[i]); });
  for (const t of TRACKED) {
    if (!state.debug || !state.hasPose || !ok(t.i)) { t.el.hidden = true; continue; }
    const P = wp(t.i);
    const label = state.measures ? `${t.name} ${fmt(P.x)}, ${fmt(P.y)}, ${fmt(P.z)}` : t.name;
    setText(t.el, label);
    placeTag(t.el, P, -18);
    if (state.measures) {
      const F = new pc.Vec3(P.x, 0.003, P.z);
      app.drawLine(P, F, dropColor, true);
      app.drawLines([new pc.Vec3(F.x - 0.04, F.y, F.z), new pc.Vec3(F.x + 0.04, F.y, F.z),
        new pc.Vec3(F.x, F.y, F.z - 0.04), new pc.Vec3(F.x, F.y, F.z + 0.04)], dropColor, true);
    }
  }
  for (const t of ANGLES) {
    if (!on || !ok(t.a, t.b, t.c)) { t.el.hidden = true; continue; }
    drawArc(t);
  }
  if (on && ok(11, 12)) {
    const lift = new pc.Vec3(0, 0.07, 0);
    const A = wp(11).add(lift), B = wp(12).add(lift);
    app.drawLines([A, B, A, wp(11), B, wp(12)], measureColor, false);
    setText(shoulderTag, `${A.distance(B).toFixed(2)} m`);
    placeTag(shoulderTag, new pc.Vec3().add2(A, B).mulScalar(0.5), -12);
  } else shoulderTag.hidden = true;
  if (on && ok(0)) {
    const top = points[0].y + 0.12;
    const A = new pc.Vec3(state.rootX, top, points[0].z), R = new pc.Vec3(RULER_X, top, 0);
    app.drawLine(A, R, measureColor, false);
    setText(heightTag, `≈ ${top.toFixed(2)} m`);
    placeTag(heightTag, R, -12);
  } else heightTag.hidden = true;
}

export function drawDebug() {
  labelsEl.hidden = !state.debug;
  if (state.debug) {
    app.drawLines(gridLines, gridColors, true);
    for (const a of AXES) app.drawLine(ORIGIN, a.end, a.color, false);
    app.drawLines(rulerLines, rulerColor, false);
    // Hip-height line across the ruler so you can read the figure against it
    if (state.hasPose && ok(23, 24)) {
      const hipY = (points[23].y + points[24].y) / 2;
      app.drawLine(new pc.Vec3(RULER_X, hipY, 0), new pc.Vec3(state.rootX, hipY, 0), new pc.Color(0.3, 0.4, 0.35), true);
    }
    for (const t of axisTags) placeTag(t.el, t.pos);
    for (const t of tickTags) placeTag(t.el, t.pos);
  }
  drawMeasures();
}

// ---------- 2D landmark overlay on the camera preview ----------
const overlay = $('overlay');
const octx = overlay.getContext('2d');
const FACE_OUTLINE = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
export function drawOverlay() {
  const w = overlay.clientWidth, h = overlay.clientHeight;
  if (!w) return;
  const dpr = devicePixelRatio || 1;
  if (overlay.width !== Math.round(w * dpr)) { overlay.width = Math.round(w * dpr); overlay.height = Math.round(h * dpr); }
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, w, h);
  const n = state.lastNorm;
  if (!state.debug || !n) return;
  // Match object-fit: cover so dots land on the right pixels
  const vw = video.videoWidth || 4, vh = video.videoHeight || 3;
  const s = Math.max(w / vw, h / vh);
  const ox = (w - vw * s) / 2, oy = (h - vh * s) / 2;
  const at = (p) => [ox + p.x * vw * s, oy + p.y * vh * s];
  octx.lineWidth = 2;
  octx.strokeStyle = 'rgba(57,255,136,.8)';
  for (const [a, b] of BONES) {
    if ((n[a].visibility ?? 1) < VIS || (n[b].visibility ?? 1) < VIS) continue;
    const [x1, y1] = at(n[a]), [x2, y2] = at(n[b]);
    octx.beginPath(); octx.moveTo(x1, y1); octx.lineTo(x2, y2); octx.stroke();
  }
  n.forEach((p, i) => {
    if ((p.visibility ?? 1) < VIS) return;
    const [x, y] = at(p);
    octx.fillStyle = i === 0 ? '#fff' : [15, 27].includes(i) ? '#c49bff' : [16, 28].includes(i) ? '#ffb347' : '#39ff88';
    octx.beginPath(); octx.arc(x, y, [15, 16, 27, 28].includes(i) ? 4 : 2.5, 0, Math.PI * 2); octx.fill();
  });
  // Face add-on: the crop the face tracker looks at, and the face outline it found
  if (face.rect && performance.now() - face.time < freshMs()) {
    const [x0, y0] = at({ x: face.rect.sx / vw, y: face.rect.sy / vh });
    octx.strokeStyle = 'rgba(255,255,255,.5)';
    octx.lineWidth = 1;
    octx.strokeRect(x0, y0, face.rect.size * s, face.rect.size * s);
    octx.strokeStyle = 'rgba(255,243,166,.9)';
    octx.beginPath();
    FACE_OUTLINE.forEach((i, j) => { const [x, y] = at(face.landmarks[i]); j ? octx.lineTo(x, y) : octx.moveTo(x, y); });
    octx.stroke();
  }
}

// ---------- Readout ----------
const readout = $('readout');
const angle = (a, b, c) => {
  const v1 = new pc.Vec3().sub2(points[a], points[b]).normalize();
  const v2 = new pc.Vec3().sub2(points[c], points[b]).normalize();
  return Math.acos(pc.math.clamp(v1.dot(v2), -1, 1)) * pc.math.RAD_TO_DEG;
};
let readoutAt = 0;
export const refreshReadout = () => { readoutAt = 0; };

export function updateReadout(now) {
  readout.hidden = !state.debug || !state.stream;
  if (readout.hidden || now - readoutAt < 150) return;
  readoutAt = now;
  const row = (label, i) => {
    if (!ok(i)) return `<tr><td>${label}</td><td colspan="3">not visible</td></tr>`;
    const p = points[i];
    return `<tr><td>${label}</td><td class="x">${fmt(p.x + state.rootX)}</td><td class="y">${fmt(p.y)}</td><td class="z">${fmt(p.z)}</td></tr>`;
  };
  const ang = (label, a, b, c) => `<tr><td>${label}</td><td>${ok(a, b, c) ? deg(angle(a, b, c)) : '–'}</td></tr>`;
  const vis = shown.reduce((acc, v) => acc + v, 0);
  const shoulderW = ok(11, 12) ? points[11].distance(points[12]).toFixed(2) + ' m' : '–';
  const top = ok(0) ? (points[0].y + 0.12).toFixed(2) + ' m' : '–';
  const featureRows = Object.values(features).map((f) =>
    `<tr><td>${f.label}</td><td class="wrap st-${f.status}">${STATUS_TEXT[f.status]}${f.detail ? ` · ${f.detail}` : ''}</td></tr>`).join('');
  const b = face.blend;
  const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
  const faceRows = performance.now() - face.time < freshMs() ? `
    <tr><td>head yaw / pitch / roll</td><td>${deg(head.yaw)} ${deg(head.pitch)} ${deg(head.roll)} (${head.fromFace ? 'face' : 'body'})</td></tr>
    <tr><td>jaw open</td><td>${pct(b.jawOpen)}</td></tr>
    <tr><td>blink L / R</td><td>${pct(b.eyeBlinkLeft)} / ${pct(b.eyeBlinkRight)}</td></tr>
    <tr><td>smile L / R</td><td>${pct(b.mouthSmileLeft)} / ${pct(b.mouthSmileRight)}</td></tr>
    <tr><td>face crop</td><td>${Math.round(face.rect.size)} px</td></tr>` : '<tr><td colspan="2">no face data yet</td></tr>';
  const boneRows = SEGMENT_NAMES.map((k) => `<tr><td>${k}</td><td>${lengths[k] ? `${(lengths[k] * 100).toFixed(1)} cm` : '–'}</td></tr>`).join('');
  readout.innerHTML = `
    <h2>Tracking</h2>
    <table>
      <tr><td>render / detect</td><td>${Math.round(app.stats.frame.fps)} / ${stats.fps} fps</td></tr>
      <tr><td>body</td><td>${stats.ms.pose.toFixed(1)} ms (${POSE_MODEL_NAME}, ${stats.delegate})</td></tr>
      <tr><td>face / hands</td><td>${stats.ms.face.toFixed(1)} / ${stats.ms.hands.toFixed(1)} ms</td></tr>
      <tr><td>hands every</td><td>${stats.handEvery} frame${stats.handEvery > 1 ? 's' : ''}${stats.busy ? ' (busy)' : ''}</td></tr>
      <tr><td>smoothing</td><td>${Math.round(state.smoothing * 100)}%</td></tr>
      <tr><td>landmarks visible</td><td>${state.hasPose ? vis : 0} / 33</td></tr>
      <tr><td>camera</td><td>${video.videoWidth}×${video.videoHeight}</td></tr>
    </table>
    <h2>Add-ons</h2>
    <table>${featureRows}</table>
    <h2>Face</h2>
    <table>${faceRows}</table>
    <h2>Bone lengths <kbd>K</kbd> recalibrate</h2>
    <table>${boneRows}</table>
    <h2>Positions (m) <span class="x">x</span> <span class="y">y</span> <span class="z">z</span></h2>
    <table>${row('R wrist', 16)}${row('L wrist', 15)}${row('R ankle', 28)}${row('L ankle', 27)}${row('nose', 0)}</table>
    <h2>Angles</h2>
    <table>
      ${ang('R elbow', 12, 14, 16)}${ang('L elbow', 11, 13, 15)}
      ${ang('R knee', 24, 26, 28)}${ang('L knee', 23, 25, 27)}
      ${ang('R shoulder', 14, 12, 24)}${ang('L shoulder', 13, 11, 23)}
    </table>
    <h2>Body</h2>
    <table><tr><td>shoulder width</td><td>${shoulderW}</td></tr><tr><td>approx. height</td><td>${top}</td></tr></table>
    <h2>Checks</h2>
    <div class="keys">Raise your right hand: the <span style="color:#ffb347">orange R</span> joint should rise on <em>your</em> right of the screen.
      Lean toward the camera: <span class="z">z</span> grows. Press <kbd>2</kbd> for a side view to check depth.
      Talk: <em>jaw open</em> should move.</div>
    <h2>Keys</h2>
    <div class="keys"><kbd>1</kbd> front <kbd>2</kbd> side <kbd>3</kbd> top <kbd>4</kbd> ¾ · drag orbit · wheel zoom<br>
      right/Shift-drag or two fingers pan · arrows pan<br>
      <kbd>R</kbd>/double-click recenter <kbd>F</kbd> follow<br>
      <kbd>D</kbd> debug <kbd>M</kbd> 3D measures <kbd>Space</kbd> freeze <kbd>C</kbd> camera<br>
      <kbd>X</kbd> checklist <kbd>S</kbd> skin <kbd>E</kbd> face <kbd>H</kbd> hands <kbd>B</kbd> steady bones <kbd>L</kbd> shadows <kbd>K</kbd> recalibrate</div>`;
}

// The figure: the original stick figure (always available as the fallback), the solid skin
// add-on that blends in over it, and hands that gain fingers when the hand add-on has data.
import { pc } from './lib.js';
import { state, points, ok, isLeft } from './state.js';
import { app, ring, material } from './scene.js';
import { features } from './features.js';
import { hands, handFresh, visionModule } from './tracking.js';
import { figureHead, skinMat, updateHead } from './face.js';

export const figure = new pc.Entity('figure');
app.root.addChild(figure);
figure.addChild(figureHead);
figure.enabled = false;

const UP = pc.Vec3.UP;
const tmpDir = new pc.Vec3();
const tmpMid = new pc.Vec3();
const tmpAxis = new pc.Vec3();
const tmpQuat = new pc.Quat();

// Stretch a +Y-aligned primitive between two points
export function placeSegment(entity, from, to, radius, radiusIsScale = false) {
  tmpDir.sub2(to, from);
  const len = tmpDir.length();
  if (len < 1e-4 || radius <= 0) { entity.enabled = false; return; }
  entity.enabled = true;
  tmpDir.mulScalar(1 / len);
  tmpMid.add2(from, to).mulScalar(0.5);
  entity.setLocalPosition(tmpMid);
  const r = radiusIsScale ? radius : radius * 2;
  entity.setLocalScale(r, len, r);
  const dot = pc.math.clamp(UP.dot(tmpDir), -1, 1);
  if (dot > 0.9999) tmpQuat.set(0, 0, 0, 1);
  else if (dot < -0.9999) tmpQuat.setFromAxisAngle(pc.Vec3.RIGHT, 180);
  else {
    tmpAxis.cross(UP, tmpDir).normalize();
    tmpQuat.setFromAxisAngle(tmpAxis, Math.acos(dot) * pc.math.RAD_TO_DEG);
  }
  entity.setLocalRotation(tmpQuat);
}

const mid = (a, b) => new pc.Vec3().add2(a, b).mulScalar(0.5);

// ---------- Stick figure (the original look) ----------
export const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],          // shoulders, arms
  [11, 23], [12, 24], [23, 24],                              // torso
  [23, 25], [25, 27], [24, 26], [26, 28],                    // legs
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32], // feet
  [15, 17], [15, 19], [17, 19], [16, 18], [16, 20], [18, 20], // hands
  [15, 21], [16, 22],
];
const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const boneMat = material(0.16, 0.95, 0.5, 0.35);
const jointMat = material(0.85, 1, 0.9, 0.5);
const headMat = material(0.16, 0.95, 0.5, 0.25);
const rightMat = material(1, 0.7, 0.28, 0.5);  // the person's right side
const leftMat = material(0.77, 0.6, 1, 0.5);   // the person's left side

const stick = new pc.Entity('stick');
figure.addChild(stick);
const add = (parent, type, mat, shadows = true) => {
  const e = new pc.Entity();
  e.addComponent('render', { type, material: mat, castShadows: shadows });
  parent.addChild(e);
  return e;
};
const stickBones = BONES.map(([a, b]) => {
  const thin = [a, b].some((i) => (i >= 15 && i <= 22) || i >= 29); // hands and feet
  return { a, b, e: add(stick, 'cylinder', boneMat), radius: thin ? 0.018 : 0.045 };
});
const stickJoints = JOINTS.map((i) => ({ i, e: add(stick, 'sphere', jointMat) }));
const stickHead = add(stick, 'sphere', headMat);
const stickNeck = add(stick, 'cylinder', boneMat);

function drawStick(k, headK) {
  stick.enabled = k > 0.001;
  if (!stick.enabled) return;
  for (const j of stickJoints) {
    j.e.enabled = ok(j.i);
    if (!j.e.enabled) continue;
    j.e.setLocalPosition(points[j.i]);
    j.e.setLocalScale(0.085 * k, 0.085 * k, 0.085 * k);
    // In debug mode, tint the wrists and ankles by side so left/right is unambiguous
    const sided = state.debug && [15, 16, 27, 28].includes(j.i);
    j.e.render.material = sided ? (isLeft(j.i) ? leftMat : rightMat) : jointMat;
  }
  for (const b of stickBones) {
    // Fingers replace the stick hand once real hand data arrives
    const handPart = b.a >= 15 && b.a <= 22;
    const handK = handPart ? 1 - features.hands.blend * +handFresh(isLeft(b.a) ? 15 : 16) : 1;
    if (ok(b.a, b.b)) placeSegment(b.e, points[b.a], points[b.b], b.radius * k * handK);
    else b.e.enabled = false;
  }
  // Head sits between the ears; neck joins it to the shoulder midpoint
  if (ok(7, 8, 11, 12)) {
    const ears = mid(points[7], points[8]);
    const center = new pc.Vec3().lerp(ears, points[0], 0.35);
    const size = pc.math.clamp(points[7].distance(points[8]) * 1.6, 0.16, 0.3) * k * headK;
    stickHead.enabled = size > 0.001;
    stickHead.setLocalPosition(center);
    stickHead.setLocalScale(size, size * 1.15, size);
    placeSegment(stickNeck, mid(points[11], points[12]), center, 0.04 * k);
  } else {
    stickHead.enabled = stickNeck.enabled = false;
  }
}

// ---------- Skin: tapered limbs, seamless joints and a solid torso ----------
const suitMat = material(0.09, 0.16, 0.12, 0.15);
suitMat.gloss = 0.35;
suitMat.update();

const coneMeshes = new Map();
function coneEntity(parent, r0, r1, mat) {
  const ratio = (r1 / r0).toFixed(3);
  if (!coneMeshes.has(ratio)) {
    coneMeshes.set(ratio, pc.Mesh.fromGeometry(app.graphicsDevice,
      new pc.ConeGeometry({ baseRadius: 0.5, peakRadius: 0.5 * Number(ratio), height: 1, heightSegments: 1, capSegments: 18 })));
  }
  const e = new pc.Entity();
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(coneMeshes.get(ratio), mat)], castShadows: true });
  parent.addChild(e);
  return e;
}

const skin = new pc.Entity('skin');
figure.addChild(skin);
// [from, to, radius at from, radius at to]
const LIMBS = [
  [11, 13, 0.055, 0.045], [12, 14, 0.055, 0.045],   // upper arms
  [13, 15, 0.045, 0.034], [14, 16, 0.045, 0.034],   // forearms
  [23, 25, 0.08, 0.06], [24, 26, 0.08, 0.06],       // thighs
  [25, 27, 0.058, 0.042], [26, 28, 0.058, 0.042],   // shins
  [29, 31, 0.038, 0.03], [30, 32, 0.038, 0.03],     // feet, heel to toe
].map(([a, b, r0, r1]) => ({ a, b, r0, e: coneEntity(skin, r0, r1, suitMat) }));
const SKIN_JOINTS = [[11, 0.055], [12, 0.055], [13, 0.045], [14, 0.045], [15, 0.034], [16, 0.034],
  [25, 0.06], [26, 0.06], [27, 0.042], [28, 0.042]]
  .map(([i, r]) => ({ i, r, e: add(skin, 'sphere', [15, 16].includes(i) ? skinMat : suitMat) }));
const neck = coneEntity(skin, 0.05, 0.045, skinMat);
const mittens = { 15: coneEntity(skin, 0.034, 0.03, skinMat), 16: coneEntity(skin, 0.034, 0.03, skinMat) };

// Torso: rings from shoulders to hips, rebuilt each frame
const RING = 16;
const RINGS = [
  { t: -0.04, w: 0.8, d: 0.09 },  // just above the shoulder line, under the shoulder joints
  { t: 0.25, w: 0.98, d: 0.12 },  // chest
  { t: 0.62, w: 0.8, d: 0.1 },    // waist
  { t: 1.0, w: 1.0, d: 0.11 },    // hips
];
const torsoPos = new Float32Array((RINGS.length * RING + 2) * 3);
const torsoIdx = [];
for (let r = 0; r < RINGS.length - 1; r++) {
  for (let s = 0; s < RING; s++) {
    const a = r * RING + s, b = r * RING + (s + 1) % RING, c = a + RING, d = b + RING;
    torsoIdx.push(a, c, b, b, c, d);
  }
}
const TOP = RINGS.length * RING, BOTTOM = TOP + 1;
for (let s = 0; s < RING; s++) {
  torsoIdx.push(TOP, s, (s + 1) % RING);
  const base = (RINGS.length - 1) * RING;
  torsoIdx.push(BOTTOM, base + (s + 1) % RING, base + s);
}
const torsoMesh = new pc.Mesh(app.graphicsDevice);
// Normals are set from the start so the vertex format never changes after the shader is built
torsoMesh.setPositions(torsoPos);
torsoMesh.setNormals(new Float32Array(torsoPos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)));
torsoMesh.setIndices(torsoIdx);
torsoMesh.update();
const torso = new pc.Entity('torso');
torso.addComponent('render', { meshInstances: [new pc.MeshInstance(torsoMesh, suitMat)], castShadows: true });
skin.addChild(torso);
// Hip balls fill the gap between the torso and the thighs
const hipBalls = [23, 24].map((i) => ({ i, e: add(skin, 'sphere', suitMat) }));

function updateTorso(k) {
  const sL = points[11], sR = points[12], hL = points[23], hR = points[24];
  const sMid = mid(sL, sR), hMid = mid(hL, hR);
  const up = new pc.Vec3().sub2(sMid, hMid);
  const height = up.length();
  up.normalize();
  const sSide = new pc.Vec3().sub2(sR, sL), hSide = new pc.Vec3().sub2(hR, hL);
  const sHalf = sSide.length() / 2, hHalf = hSide.length() / 2 + 0.05;
  const side = new pc.Vec3(), front = new pc.Vec3(), c = new pc.Vec3();
  RINGS.forEach((ring, r) => {
    const t = ring.t;
    side.lerp(sSide, hSide, pc.math.clamp(t, 0, 1));
    side.sub(up.clone().mulScalar(side.dot(up))).normalize();
    front.cross(side, up).normalize();
    c.lerp(sMid, hMid, t);
    if (t < 0) c.add(up.clone().mulScalar(-t * height));
    const half = pc.math.lerp(sHalf, hHalf, pc.math.clamp(t, 0, 1)) * ring.w * k;
    const depth = ring.d * k;
    for (let s = 0; s < RING; s++) {
      const a = (s / RING) * Math.PI * 2;
      const x = Math.cos(a) * half, z = Math.sin(a) * depth;
      const o = (r * RING + s) * 3;
      torsoPos[o] = c.x + side.x * x + front.x * z;
      torsoPos[o + 1] = c.y + side.y * x + front.y * z;
      torsoPos[o + 2] = c.z + side.z * x + front.z * z;
    }
    if (r === 0) torsoPos.set([c.x, c.y, c.z], TOP * 3);
    if (r === RINGS.length - 1) torsoPos.set([c.x, c.y, c.z], BOTTOM * 3);
  });
  torsoMesh.setPositions(torsoPos);
  torsoMesh.setNormals(pc.calculateNormals(torsoPos, torsoIdx));
  torsoMesh.update(pc.PRIMITIVE_TRIANGLES, true);
}

function drawSkin(k, neckTo) {
  skin.enabled = k > 0.001;
  if (!skin.enabled) return;
  for (const l of LIMBS) {
    if (ok(l.a, l.b)) placeSegment(l.e, points[l.a], points[l.b], l.r0 * 2 * k, true);
    else l.e.enabled = false;
  }
  for (const j of SKIN_JOINTS) {
    j.e.enabled = ok(j.i);
    if (!j.e.enabled) continue;
    j.e.setLocalPosition(points[j.i]);
    const d = j.r * 2 * k;
    j.e.setLocalScale(d, d, d);
  }
  for (const h of hipBalls) {
    h.e.enabled = ok(h.i);
    if (h.e.enabled) { h.e.setLocalPosition(points[h.i]); h.e.setLocalScale(0.15 * k, 0.15 * k, 0.15 * k); }
  }
  torso.enabled = ok(11, 12, 23, 24);
  if (torso.enabled) updateTorso(k);
  if (ok(11, 12) && neckTo) placeSegment(neck, mid(points[11], points[12]), neckTo, 0.1 * k, true);
  else neck.enabled = false;
  for (const w of [15, 16]) {
    const tip = mid(points[w + 2], points[w + 4]);
    const mk = k * (1 - features.hands.blend * +handFresh(w));
    if (ok(w, w + 2, w + 4) && mk > 0.001) placeSegment(mittens[w], points[w], tip, 0.068 * mk, true);
    else mittens[w].enabled = false;
  }
}

// ---------- Hands and fingers ----------
const fingerRoot = new pc.Entity('fingers');
figure.addChild(fingerRoot);
const fingerSets = {};

// Palm: a thick slab through the wrist, thumb base and the four knuckles, so the fingers
// join into one skinned hand instead of separate sticks
const PALM = [0, 1, 5, 9, 13, 17];
const PALM_HALF_THICKNESS = 0.012;
const palmIdx = [];
for (let i = 1; i + 1 < PALM.length; i++) {
  palmIdx.push(0, i, i + 1);                                         // front
  palmIdx.push(PALM.length, PALM.length + i + 1, PALM.length + i);   // back
}
for (let i = 0; i < PALM.length; i++) {                              // rim
  const a = i, b = (i + 1) % PALM.length, c = a + PALM.length, d = b + PALM.length;
  palmIdx.push(a, c, b, b, c, d);
}
function makePalm() {
  const mesh = new pc.Mesh(app.graphicsDevice);
  const pos = new Float32Array(PALM.length * 2 * 3);
  mesh.setPositions(pos);
  mesh.setNormals(pos.map((_, i) => (i % 3 === 1 ? 1 : 0))); // set from the start so the vertex format never changes
  mesh.setIndices(palmIdx);
  mesh.update();
  const e = new pc.Entity('palm');
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, skinMat)], castShadows: true });
  fingerRoot.addChild(e);
  return { e, mesh, pos };
}
function updatePalm(palm, pts) {
  const n = new pc.Vec3().cross(new pc.Vec3().sub2(pts[5], pts[0]), new pc.Vec3().sub2(pts[17], pts[0])).normalize()
    .mulScalar(PALM_HALF_THICKNESS);
  PALM.forEach((j, i) => {
    palm.pos.set([pts[j].x + n.x, pts[j].y + n.y, pts[j].z + n.z], i * 3);
    palm.pos.set([pts[j].x - n.x, pts[j].y - n.y, pts[j].z - n.z], (i + PALM.length) * 3);
  });
  palm.mesh.setPositions(palm.pos);
  palm.mesh.setNormals(pc.calculateNormals(palm.pos, palmIdx));
  palm.mesh.update(pc.PRIMITIVE_TRIANGLES, true);
}

function buildFingers() {
  const conns = visionModule()?.HandLandmarker?.HAND_CONNECTIONS;
  if (!conns) return false;
  skinMat.cull = pc.CULLFACE_NONE; // the palm slab is visible from both sides whatever its winding
  skinMat.update();
  for (const w of [15, 16]) {
    fingerSets[w] = {
      bones: conns.map((c) => ({ a: c.start, b: c.end, e: coneEntity(fingerRoot, 0.011, 0.009, skinMat) })),
      joints: Array.from({ length: 21 }, () => add(fingerRoot, 'sphere', skinMat)),
      palm: makePalm(),
    };
  }
  return true;
}
const handPt = Array.from({ length: 21 }, () => new pc.Vec3());

// What each hand currently looks like, for the checklist
export const handLook = { 15: 'hidden', 16: 'hidden' };

function drawFingers(skinK) {
  if (!fingerSets[15] && !(features.hands.enabled && buildFingers())) return;
  for (const w of [15, 16]) {
    const set = fingerSets[w];
    const k = features.hands.blend * +handFresh(w) * (ok(w) ? 1 : 0);
    const visible = k > 0.001;
    if (!visible) {
      set.bones.forEach((b) => { b.e.enabled = false; });
      set.joints.forEach((j) => { j.enabled = false; });
      set.palm.e.enabled = false;
      continue;
    }
    // Fingers grow out of the wrist as they blend in
    for (let j = 0; j < 21; j++) handPt[j].copy(hands[w].local[j]).mulScalar(k).add(points[w]);
    const r = pc.math.lerp(0.75, 1, skinK); // a little slimmer on the stick figure
    for (const b of set.bones) placeSegment(b.e, handPt[b.a], handPt[b.b], 0.022 * r, true);
    set.joints.forEach((e, j) => {
      e.enabled = true;
      e.setLocalPosition(handPt[j]);
      const d = (j === 0 ? 0.03 : 0.02) * r;
      e.setLocalScale(d, d, d);
    });
    set.palm.e.enabled = true;
    updatePalm(set.palm, handPt);
  }
}

function updateHandLook(skinK) {
  for (const w of [15, 16]) {
    const fingers = features.hands.blend * +handFresh(w) > 0.5 && ok(w);
    handLook[w] = fingers ? (skinK > 0.5 ? 'skinned hand' : 'fingers on stick figure')
      : !ok(w) ? 'hidden'
      : skinK > 0.5 ? (ok(w, w + 2, w + 4) ? 'mitten' : 'wrist only') : 'stick hand';
  }
}

// ---------- Per frame ----------
export function drawFigure(dt) {
  figure.enabled = state.hasPose;
  if (!state.hasPose) return;
  figure.setLocalPosition(state.rootX, 0, 0);
  ring.setLocalPosition(state.rootX, 0.005, 0);

  const skinK = features.skin.blend;
  const { headBlend, shellCenter, up } = updateHead(dt, skinK);
  drawStick(1 - skinK, 1 - headBlend);
  // The neck reaches to the bottom of the head shell
  const neckTo = shellCenter && up ? shellCenter.clone().sub(up.clone().mulScalar(0.08)) : null;
  drawSkin(skinK, neckTo);
  drawFingers(skinK);
  updateHandLook(skinK);
}

import { pc } from './lib.js';
import { $, state } from './state.js';

// ---------- PlayCanvas app ----------
export const canvas = $('scene');
export const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true } });
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());
app.scene.ambientLight = new pc.Color(0.12, 0.16, 0.14);

export const camera = new pc.Entity('camera');
camera.addComponent('camera', { clearColor: new pc.Color(0, 0, 0), fov: 45 });
app.root.addChild(camera);

const key = new pc.Entity('key');
key.addComponent('light', {
  type: 'directional', color: new pc.Color(1, 1, 1), intensity: 1.1,
  castShadows: false, shadowType: pc.SHADOW_PCF3_32F, shadowResolution: 2048, shadowDistance: 6,
  shadowBias: 0.2, normalOffsetBias: 0.05,
});
key.setEulerAngles(40, 30, 0);
app.root.addChild(key);

const rim = new pc.Entity('rim');
rim.addComponent('light', { type: 'omni', color: new pc.Color(0.2, 1, 0.55), intensity: 2, range: 6 });
rim.setPosition(0, 2, -2);
app.root.addChild(rim);

// Soft front fill, only with the lighting add-on
const fill = new pc.Entity('fill');
fill.addComponent('light', { type: 'directional', color: new pc.Color(0.85, 0.92, 1), intensity: 0.35, castShadows: false });
fill.setEulerAngles(-20, 180 + 15, 0);
fill.enabled = false;
app.root.addChild(fill);

export function material(r, g, b, glow = 0) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(r, g, b);
  m.emissive = new pc.Color(r * glow, g * glow, b * glow);
  m.gloss = 0.6;
  m.metalness = 0.1;
  m.useMetalness = true;
  m.update();
  return m;
}

const floor = new pc.Entity('floor');
floor.addComponent('render', { type: 'plane', material: material(0.02, 0.06, 0.035), castShadows: false, receiveShadows: true });
floor.setLocalScale(8, 1, 8);
floor.setLocalPosition(0, -0.002, 0);
app.root.addChild(floor);

// Faint ring on the floor showing where the figure stands
export const ring = new pc.Entity('ring');
ring.addComponent('render', { type: 'torus', material: material(0.03, 0.22, 0.11, 0.6), castShadows: false });
ring.setLocalScale(0.8, 0.01, 0.8);
app.root.addChild(ring);

// Lighting add-on: shadows, a front fill and gentle tone mapping. Off restores the plain look.
export function setLighting(on) {
  key.light.castShadows = on;
  fill.enabled = on;
  camera.camera.toneMapping = on ? pc.TONEMAP_NEUTRAL : pc.TONEMAP_LINEAR;
  app.scene.ambientLight = on ? new pc.Color(0.16, 0.19, 0.18) : new pc.Color(0.12, 0.16, 0.14);
}

// ---------- Orbit camera: drag to rotate, right/Shift-drag or two fingers to pan, wheel/pinch to zoom ----------
const VIEWS = { front: [0, -4, 3.4], side: [90, -4, 3.4], top: [0, -89, 4.2], three: [35, -18, 3.8] };
const orbit = { yaw: 0, pitch: -4, dist: 3.4, target: new pc.Vec3(0, 0.9, 0) };
const orbitGoal = { ...orbit };
export function setView(name) { [orbitGoal.yaw, orbitGoal.pitch, orbitGoal.dist] = VIEWS[name]; }
setView('front');
Object.assign(orbit, { yaw: orbitGoal.yaw, pitch: orbitGoal.pitch, dist: orbitGoal.dist });

// Pan is an offset added to the point the camera orbits around
const ORBIT_CENTER_Y = 0.9;
const pan = new pc.Vec3(), panGoal = new pc.Vec3();
let followX = 0;

// Slide the view so the scene moves with the cursor, in metres at the orbit distance
export function panBy(dxPx, dyPx) {
  const metresPerPx = 2 * orbit.dist * Math.tan(camera.camera.fov * pc.math.DEG_TO_RAD / 2) / Math.max(canvas.clientHeight, 1);
  panGoal.add(camera.right.clone().mulScalar(-dxPx * metresPerPx));
  panGoal.add(camera.up.clone().mulScalar(dyPx * metresPerPx));
  panGoal.set(
    pc.math.clamp(panGoal.x, -3, 3),
    pc.math.clamp(panGoal.y, -0.5 - ORBIT_CENTER_Y, 2.5 - ORBIT_CENTER_Y),
    pc.math.clamp(panGoal.z, -3, 3),
  );
}

// Reset the 3D view to the front and move the figure back to the middle of the scene
export function recenter() {
  setView('front');
  panGoal.set(0, 0, 0);
  if (state.hasPose) state.centerOffset += state.rootXTarget;
  state.rootXTarget = 0;
  // Spin the long way round less: bring yaw back within ±180° of the front view first
  orbit.yaw = ((orbit.yaw + 180) % 360 + 360) % 360 - 180;
}

const pointers = new Map(); // id -> { x, y, pan }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const isPan = e.button === 1 || e.button === 2 || e.shiftKey;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: isPan });
  if (isPan) canvas.style.cursor = 'move';
});
function releasePointer(e) {
  pointers.delete(e.pointerId);
  if (![...pointers.values()].some((p) => p.pan)) canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  if (pointers.size === 1) {
    if (prev.pan) panBy(dx, dy);
    else {
      orbitGoal.yaw -= dx * 0.3;
      orbitGoal.pitch = pc.math.clamp(orbitGoal.pitch - dy * 0.3, -89, 10);
    }
  } else if (pointers.size === 2) {
    // Two fingers: pinch to zoom, move the midpoint to pan
    const other = [...pointers].find(([id]) => id !== e.pointerId)[1];
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    orbitGoal.dist = pc.math.clamp(orbitGoal.dist * before / Math.max(after, 1), 1.2, 9);
    panBy(dx / 2, dy / 2);
  }
  prev.x = e.clientX;
  prev.y = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbitGoal.dist = pc.math.clamp(orbitGoal.dist * Math.exp(e.deltaY * 0.001), 1.2, 9);
}, { passive: false });
canvas.addEventListener('dblclick', recenter);

export function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 10);
  orbit.yaw = pc.math.lerp(orbit.yaw, orbitGoal.yaw, k);
  orbit.pitch = pc.math.lerp(orbit.pitch, orbitGoal.pitch, k);
  orbit.dist = pc.math.lerp(orbit.dist, orbitGoal.dist, k);
  followX = pc.math.lerp(followX, state.follow && state.hasPose ? state.rootX : 0, 1 - Math.exp(-dt * 4));
  pan.lerp(pan, panGoal, k);
  orbit.target.set(followX + pan.x, ORBIT_CENTER_Y + pan.y, pan.z);
  const yaw = orbit.yaw * pc.math.DEG_TO_RAD;
  const pitch = orbit.pitch * pc.math.DEG_TO_RAD;
  camera.setPosition(
    orbit.target.x + orbit.dist * Math.sin(yaw) * Math.cos(pitch),
    orbit.target.y - orbit.dist * Math.sin(pitch),
    orbit.target.z + orbit.dist * Math.cos(yaw) * Math.cos(pitch),
  );
  camera.lookAt(orbit.target);
}

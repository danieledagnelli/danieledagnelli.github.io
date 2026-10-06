import { pc } from './lib.js';

export const $ = (id) => document.getElementById(id);

// Storage can be blocked or throw (private windows, sandboxing); every access is guarded
export const store = {
  get(area, k) { try { return window[area].getItem(k); } catch { return null; } },
  set(area, k, v) { try { v === null ? window[area].removeItem(k) : window[area].setItem(k, v); } catch {} },
};

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let smoothing = Number(store.get('localStorage', 'mirror:smoothing') ?? 0.6);
if (!(smoothing >= 0 && smoothing <= 1)) smoothing = 0.6;

// Shared, mutable app state. Modules read and write it directly.
export const state = {
  debug: store.get('localStorage', 'mirror:debug') !== '0',
  measures: store.get('localStorage', 'mirror:measures') !== '0',
  follow: store.get('localStorage', 'mirror:follow') !== '0',
  frozen: false,
  smoothing,
  stream: null,

  hasPose: false,
  lastSeen: 0,
  lastNorm: null,      // latest pose landmarks in camera-image coordinates (0..1)
  rootX: 0,
  rootXTarget: 0,
  centerOffset: 0,     // set by Recenter so wherever you stand becomes the middle
  lift: 0.95,          // height that puts the feet on the floor
};

// Body landmarks in figure space: `target` is the filtered tracker output,
// `points` eases towards it every rendered frame.
export const points = Array.from({ length: 33 }, () => new pc.Vec3());
export const target = Array.from({ length: 33 }, () => new pc.Vec3());
export const visible = new Float32Array(33); // smoothed confidence per landmark

// Visibility with hysteresis: a point appears above SHOW_AT and only disappears below HIDE_AT,
// so limbs don't flicker when the model's confidence hovers around one threshold
export const VIS = 0.45, SHOW_AT = 0.55, HIDE_AT = 0.3;
export const shown = new Uint8Array(33);
export const ok = (...ids) => ids.every((i) => shown[i]);

// MediaPipe "left/right" is the person's own left/right; odd indices are left
export const isLeft = (i) => i > 0 && i % 2 === 1;

// Figure space -> world space
export const wp = (i) => new pc.Vec3(points[i].x + state.rootX, points[i].y, points[i].z);

export function tuning() {
  const s = reduceMotion.matches ? Math.max(state.smoothing, 0.8) : state.smoothing;
  return {
    minCutoff: pc.math.lerp(4, 0.25, s),   // Hz: lower = smoother when still
    beta: pc.math.lerp(1.5, 0.25, s),      // higher = less lag on fast moves
    ease: pc.math.lerp(40, 9, s),          // per-second rate the figure eases towards the filtered pose
  };
}

export function toggle(id, on) {
  const btn = $(id);
  const next = on ?? btn.getAttribute('aria-pressed') !== 'true';
  btn.setAttribute('aria-pressed', String(next));
  return next;
}

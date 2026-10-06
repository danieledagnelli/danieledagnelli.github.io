// Optional add-ons. Each one can be switched on or off, reports a status, and only takes
// over the figure when it has fresh data; otherwise the simpler version stays in place.
import { $, store, reduceMotion } from './state.js';

const DEFS = [
  { id: 'skin', label: 'Skin', key: 'S', title: 'Solid body instead of the stick figure' },
  { id: 'face', label: 'Face', key: 'E', title: 'Your face from the camera on a 3D face mesh, with head turn and tilt' },
  { id: 'hands', label: 'Hands', key: 'H', title: 'Finger tracking' },
  { id: 'bones', label: 'Steady bones', key: 'B', title: 'Learn your limb lengths and hold them fixed' },
  { id: 'shadows', label: 'Shadows', key: 'L', title: 'Soft shadows and fuller lighting' },
];

export const STATUS_TEXT = {
  off: 'off', loading: 'loading…', waiting: 'waiting for data', active: 'active', failed: 'failed',
};

export const features = Object.fromEntries(DEFS.map((d) => [d.id, {
  ...d,
  enabled: store.get('localStorage', `mirror:feature:${d.id}`) !== '0',
  status: 'off',
  detail: '',
  blend: 0, // 0 = simple fallback, 1 = add-on fully in place; eased over ~300 ms
  btn: null,
}]));

const listeners = new Set();
export const onFeatureChange = (fn) => listeners.add(fn);

export function setStatus(id, status, detail = '') {
  const f = features[id];
  if (!f.enabled && status !== 'failed') status = 'off';
  if (f.status === status && f.detail === detail) return;
  f.status = status;
  f.detail = detail;
  if (f.btn) {
    f.btn.dataset.status = status;
    f.btn.title = `${f.title} — ${STATUS_TEXT[status]}${detail ? ` (${detail})` : ''}${f.key ? ` [${f.key}]` : ''}`;
  }
}

export function setEnabled(id, on) {
  const f = features[id];
  f.enabled = on ?? !f.enabled;
  store.set('localStorage', `mirror:feature:${id}`, f.enabled ? '1' : '0');
  f.btn?.setAttribute('aria-pressed', String(f.enabled));
  if (!f.enabled) setStatus(id, 'off');
  listeners.forEach((fn) => fn(id, f.enabled));
}

// The add-on is on and has fresh data
export const isActive = (id) => features[id].enabled && features[id].status === 'active';

export function updateBlends(dt) {
  const rate = reduceMotion.matches ? 1 / 0.5 : 1 / 0.3;
  for (const f of Object.values(features)) {
    const goal = isActive(f.id) ? 1 : 0;
    f.blend = goal > f.blend ? Math.min(goal, f.blend + dt * rate) : Math.max(goal, f.blend - dt * rate);
  }
}

export function mountFeatureChips(container) {
  for (const f of Object.values(features)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost chip';
    btn.innerHTML = `<span class="dot" aria-hidden="true"></span>${f.label}`;
    btn.setAttribute('aria-pressed', String(f.enabled));
    btn.addEventListener('click', () => setEnabled(f.id));
    f.btn = btn;
    container.appendChild(btn);
    f.status = '';
    setStatus(f.id, f.enabled ? 'waiting' : 'off');
  }
  $('features').hidden = false;
}

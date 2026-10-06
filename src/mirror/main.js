import { pc } from './lib.js';
import { $, store, state, points, target, tuning, toggle } from './state.js';
import { app, setView, panBy, recenter, updateCamera, setLighting } from './scene.js';
import { features, setEnabled, setStatus, onFeatureChange, updateBlends, mountFeatureChips } from './features.js';
import { loadPose, ensureAddonTrackers, track, resetTracking, trackers } from './tracking.js';
import { recalibrate } from './skeleton.js';
import { drawFigure } from './avatar.js';
import { drawDebug, drawOverlay, updateReadout, refreshReadout } from './debug.js';
import { updateChecklist, setChecklist } from './checklist.js';

const video = $('cam');
const statusEl = $('status');

function setStatusText(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = cls;
}

// ---------- Add-ons ----------
// Add-ons that need no tracker are active as soon as they are on
function applyFeature(id) {
  const f = features[id];
  if (id === 'shadows') setLighting(f.enabled);
  if (id === 'skin' || id === 'shadows') setStatus(id, f.enabled ? 'active' : 'off');
  if (id === 'bones' && f.enabled && f.status === 'off') setStatus(id, 'waiting', 'calibrating 0%');
  if ((id === 'face' || id === 'hands') && f.enabled) {
    if (trackers.pose) ensureAddonTrackers();
    else setStatus(id, 'waiting', 'starts with the camera');
  }
  refreshReadout();
}
onFeatureChange(applyFeature);
mountFeatureChips($('features'));
Object.keys(features).forEach(applyFeature);

// ---------- Frame loop ----------
app.on('update', (dt) => {
  track();
  if (state.hasPose) {
    const k = 1 - Math.exp(-dt * tuning().ease);
    for (let i = 0; i < 33; i++) points[i].lerp(points[i], target[i], k);
    state.rootX = pc.math.lerp(state.rootX, state.rootXTarget, k);
  }
  if (state.stream && !state.frozen) setStatusText(state.hasPose ? 'Tracking' : 'Step into view', state.hasPose ? 'live' : '');
  updateBlends(dt);
  updateCamera(dt);
  drawFigure(dt);
  drawDebug();
  drawOverlay();
  updateReadout(performance.now());
  updateChecklist(performance.now());
});
app.start();

// ---------- Camera on/off ----------
async function start() {
  const btn = $('start');
  const err = $('error');
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Starting…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access the camera (it needs HTTPS or localhost).');
    const [s] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }),
      loadPose((f) => { btn.textContent = `Loading body tracking ${Math.round(f * 100)}%`; }),
    ]);
    state.stream = s;
    video.srcObject = s;
    await video.play();
    $('preview').hidden = $('togglePreview').getAttribute('aria-pressed') !== 'true';
    $('intro').hidden = true;
    $('hud').hidden = false;
    setStatusText('Step into view');
    // Face and hands load in the background; the body figure works without them
    ensureAddonTrackers();
    // Remember for this tab so a hot reload reconnects without another click
    store.set('sessionStorage', 'mirror:running', '1');
  } catch (e) {
    store.set('sessionStorage', 'mirror:running', null);
    err.textContent = e?.name === 'NotAllowedError'
      ? 'Camera permission was denied. Allow it in your browser settings and try again.'
      : `Could not start: ${e?.message ?? e}`;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Turn on camera';
  }
}

function stop({ remember = false } = {}) {
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  video.srcObject = null;
  $('preview').hidden = true;
  resetTracking();
  setFrozen(false);
  $('hud').hidden = true;
  $('intro').hidden = false;
  if (!remember) store.set('sessionStorage', 'mirror:running', null);
  $('start').focus();
}

// ---------- HUD ----------
function setDebug(on) {
  state.debug = toggle('toggleDebug', on);
  document.body.classList.toggle('debug', state.debug);
  store.set('localStorage', 'mirror:debug', state.debug ? '1' : '0');
  refreshReadout();
}
function setMeasures(on) {
  state.measures = toggle('toggleMeasures', on);
  store.set('localStorage', 'mirror:measures', state.measures ? '1' : '0');
}
function setFollow(on) {
  state.follow = toggle('follow', on);
  store.set('localStorage', 'mirror:follow', state.follow ? '1' : '0');
}
function setFrozen(on) {
  state.frozen = toggle('freeze', on);
  if (state.stream && state.frozen) setStatusText('Frozen', 'frozen');
}
function togglePreview() {
  const show = toggle('togglePreview');
  $('preview').hidden = !show || !state.stream;
}

$('start').addEventListener('click', start);
$('stop').addEventListener('click', () => stop());
$('togglePreview').addEventListener('click', togglePreview);
$('toggleDebug').addEventListener('click', () => setDebug());
$('freeze').addEventListener('click', () => setFrozen());
$('toggleMeasures').addEventListener('click', () => setMeasures());
$('recenter').addEventListener('click', recenter);
$('follow').addEventListener('click', () => setFollow());
$('toggleChecklist').addEventListener('click', () => setChecklist());
setChecklist(store.get('localStorage', 'mirror:checklist') === '1');
setFollow(state.follow);
setDebug(state.debug);
setMeasures(state.measures);
$('smoothing').value = String(state.smoothing);
$('smoothing').addEventListener('input', (e) => {
  state.smoothing = Number(e.currentTarget.value);
  store.set('localStorage', 'mirror:smoothing', String(state.smoothing));
});

const FEATURE_KEYS = Object.fromEntries(Object.values(features).filter((f) => f.key).map((f) => [f.key.toLowerCase(), f.id]));

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
  if (e.target instanceof HTMLInputElement) return; // let the smoothing slider keep its arrow keys
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === '1') setView('front');
  else if (k === '2') setView('side');
  else if (k === '3') setView('top');
  else if (k === '4') setView('three');
  else if (k === 'd') setDebug();
  else if (k === 'r') recenter();
  else if (k === 'k') recalibrate();
  else if (k === 'x') setChecklist();
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = 40;
    panBy({ ArrowLeft: step, ArrowRight: -step }[e.key] ?? 0, { ArrowUp: step, ArrowDown: -step }[e.key] ?? 0);
  }
  else if (k === 'f') setFollow();
  else if (k === 'm') setMeasures();
  else if (k === 'c') togglePreview();
  else if (FEATURE_KEYS[k]) setEnabled(FEATURE_KEYS[k]);
  else if (k === ' ' && state.stream) { e.preventDefault(); setFrozen(); }
});

// Release the camera when the tab is hidden; reconnect when it comes back
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.stream) stop({ remember: true });
  else if (!document.hidden && !state.stream && store.get('sessionStorage', 'mirror:running')) start();
});
if (store.get('sessionStorage', 'mirror:running')) start();

if (import.meta.env.DEV) {
  import('./face.js').then((m) => { window.__mirror = { state, features, faceDebug: m.faceDebug }; });
}

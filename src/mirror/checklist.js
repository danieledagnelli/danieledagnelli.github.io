// Checklist: every part of the figure with ✓ / … / ✗ and the reason, so you can see at a glance
// what is working and why something isn't (for example, why a hand has no fingers).
import { $, store, state, shown, ok, toggle } from './state.js';
import { features } from './features.js';
import { trackers, stats, face, hands, handDiag, freshMs, handFreshMs } from './tracking.js';
import { handLook } from './avatar.js';
import { head, skinLearned } from './face.js';
import { lengths, SEGMENT_NAMES } from './skeleton.js';

const panel = $('checklist');
const video = $('cam');
let open = store.get('localStorage', 'mirror:checklist') === '1';

export function setChecklist(on) {
  open = toggle('toggleChecklist', on);
  store.set('localStorage', 'mirror:checklist', open ? '1' : '0');
  renderedAt = 0;
}

const ICON = { ok: '✓', wait: '…', fail: '✗', off: '–' };
const row = (st, label, note = '') => ({ st, label, note });
const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
const SIDE = { 15: 'Left', 16: 'Right' };

// Status of an add-on's tracker, as a checklist row
function trackerRow(id, label) {
  const f = features[id];
  if (!f.enabled) return row('off', label, `${f.label} add-on is off`);
  if (f.status === 'failed') return row('fail', label, `could not load: ${f.detail}`);
  if (!trackers[id]) return row('wait', label, f.status === 'loading' ? `downloading ${f.detail}` : 'starts with the camera');
  return row('ok', label, 'loaded');
}

function handRow(w) {
  const label = `${SIDE[w]} hand skinned`;
  const look = handLook[w];
  if (look === 'skinned hand') return row('ok', label, 'fingers and palm from hand tracking');
  if (!features.hands.enabled) return row('off', label, `Hands add-on is off — showing a ${look}`);
  if (!trackers.hands) return row('wait', label, 'hand tracking still loading');
  if (!ok(w)) return row('wait', label, 'wrist not visible to the body tracker');
  const now = performance.now();
  const fresh = now - hands[w].time < handFreshMs();
  if (fresh && look === 'fingers on stick figure') return row('ok', label, 'fingers tracked — turn on Skin for a solid hand');
  const rej = handDiag.rejected[w];
  if (rej && now - rej.time < 2000) {
    return row('fail', label, `a hand was found ${Math.round(rej.dist * 100)}% of the frame away from this wrist — more than a shoulder width, too far to attach`);
  }
  if (now - handDiag.lastRun > 2000) return row('wait', label, 'hand tracker idle (needs the body tracked first)');
  if (!handDiag.found) return row('wait', label, 'no hand detected — show your open hand to the camera');
  return row('wait', label, 'a hand was detected, but for the other wrist');
}

function sections() {
  const now = performance.now();
  const vis = shown.reduce((a, v) => a + v, 0);
  const faceFresh = face.landmarks && now - face.time < freshMs();
  const skinOff = (label) => row('off', label, 'Skin add-on is off');
  const skin = features.skin.enabled;
  const limb = (label, ids, need) => (!skin ? skinOff(label) : ok(...ids) ? row('ok', label) : row('wait', label, `needs ${need} in view`));

  return [
    ['Camera and body', [
      state.stream && video.videoWidth ? row('ok', 'Camera', `${video.videoWidth}×${video.videoHeight}`) : row('fail', 'Camera', 'off'),
      state.hasPose ? row('ok', 'Body tracked', `${vis}/33 points`) : row('wait', 'Body tracked', 'step into view'),
      stats.fps >= 15 ? row('ok', 'Tracking speed', `${stats.fps} fps`)
        : stats.fps >= 8 ? row('wait', 'Tracking speed', `${stats.fps} fps — movement will look choppy`)
          : row('fail', 'Tracking speed', `${stats.fps} fps — try ?model=lite or turn off Hands`),
      ok(27, 28) ? row('ok', 'Feet on the floor') : row('wait', 'Feet on the floor', 'feet out of view — height is estimated'),
    ]],
    ['Skin', [
      limb('Torso', [11, 12, 23, 24], 'shoulders and hips'),
      limb('Left arm', [11, 13, 15], 'shoulder, elbow and wrist'),
      limb('Right arm', [12, 14, 16], 'shoulder, elbow and wrist'),
      limb('Left leg', [23, 25, 27], 'hip, knee and ankle'),
      limb('Right leg', [24, 26, 28], 'hip, knee and ankle'),
    ]],
    ['Hands', [
      trackerRow('hands', 'Hand tracking'),
      handRow(15),
      handRow(16),
    ]],
    ['Face', [
      trackerRow('face', 'Face tracking'),
      !features.face.enabled || !trackers.face ? row('off', 'Face found')
        : faceFresh ? row('ok', 'Face found', `${Math.round(face.rect.size)} px crop`)
          : row('wait', 'Face found', 'face the camera with your face lit'),
      faceFresh && face.rect.size < 120 ? row('wait', 'Face detail', 'face is small in the frame — move closer for more detail')
        : faceFresh ? row('ok', 'Face detail') : row('off', 'Face detail'),
      features.face.blend > 0.5 ? row('ok', 'Face on the 3D head') : row(features.face.enabled ? 'wait' : 'off', 'Face on the 3D head'),
      head.fromFace ? row('ok', 'Head turn and tilt', `from the face (yaw ${Math.round(head.yaw)}°)`)
        : row('wait', 'Head turn and tilt', 'estimated from ears and nose'),
      faceFresh ? row('ok', 'Mouth and blinks', `jaw ${pct(face.blend.jawOpen)}, blink ${pct(face.blend.eyeBlinkLeft)}/${pct(face.blend.eyeBlinkRight)}`)
        : row(features.face.enabled ? 'wait' : 'off', 'Mouth and blinks'),
      skinLearned() ? row('ok', 'Skin colour', 'sampled from your cheeks')
        : row(features.face.enabled ? 'wait' : 'off', 'Skin colour', 'learned once the face is found'),
    ]],
    ['Steady bones', features.bones.enabled
      ? SEGMENT_NAMES.map((k) => (lengths[k] ? row('ok', k, `${(lengths[k] * 100).toFixed(1)} cm`) : row('wait', k, 'calibrating — keep it in view')))
      : [row('off', 'Bone lengths', 'Steady bones add-on is off')]],
    ['Lighting', [
      features.shadows.enabled ? row('ok', 'Shadows') : row('off', 'Shadows', 'Shadows add-on is off'),
    ]],
  ];
}

let renderedAt = 0;
export function updateChecklist(now) {
  panel.hidden = !open || !state.stream;
  if (panel.hidden || now - renderedAt < 250) return;
  renderedAt = now;
  const all = sections();
  const flat = all.flatMap(([, rows]) => rows);
  const count = (s) => flat.filter((r) => r.st === s).length;
  panel.innerHTML = `
    <h2>Checklist <span class="sum">${count('ok')} ✓ · ${count('wait')} … · ${count('fail')} ✗</span></h2>
    ${all.map(([title, rows]) => `
      <h3>${title}</h3>
      <ul>${rows.map((r) => `<li class="${r.st}"><span class="ic" aria-label="${r.st}">${ICON[r.st]}</span>
        <span class="lb">${r.label}</span>${r.note ? `<span class="nt">${r.note}</span>` : ''}</li>`).join('')}</ul>`).join('')}`;
}

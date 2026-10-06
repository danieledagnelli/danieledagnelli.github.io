// Steady bone lengths: learn each segment's length from the first few seconds of confident
// tracking (median), then rebuild the joints outward from the hips at those lengths so limbs
// stop stretching. Until a segment is calibrated it is left exactly as tracked.
import { pc } from './lib.js';
import { visible, shown } from './state.js';
import { features, setStatus } from './features.js';

// Left/right pairs share one length; people are close enough to symmetric and it halves the noise
const SEGMENTS = {
  pelvis: [[23, 24]],
  shoulders: [[11, 12]],
  spine: [],               // hip midpoint to shoulder midpoint, measured separately
  upperArm: [[11, 13], [12, 14]],
  forearm: [[13, 15], [14, 16]],
  thigh: [[23, 25], [24, 26]],
  shin: [[25, 27], [26, 28]],
  heel: [[27, 29], [28, 30]],
  foot: [[27, 31], [28, 32]],
};
export const SEGMENT_NAMES = Object.keys(SEGMENTS);
const CORE = ['shoulders', 'spine', 'upperArm', 'forearm'];
const NEEDED = 45;      // samples before a segment counts as calibrated (~1.5–3 s)
const MAX_SAMPLES = 120;
const CONFIDENT = 0.7;

const samples = Object.fromEntries(SEGMENT_NAMES.map((k) => [k, []]));
export const lengths = Object.fromEntries(SEGMENT_NAMES.map((k) => [k, 0])); // 0 = not calibrated

export function recalibrate() {
  for (const k of SEGMENT_NAMES) { samples[k].length = 0; lengths[k] = 0; }
}

const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[s.length >> 1]; };
const mid = (a, b) => new pc.Vec3().add2(a, b).mulScalar(0.5);
const sure = (...ids) => ids.every((i) => shown[i] && visible[i] > CONFIDENT);

function addSample(k, len) {
  if (!(len > 0.02 && len < 1.2)) return;
  if (lengths[k]) {
    lengths[k] += (len - lengths[k]) * 0.005; // slow drift so a poor start can still settle
    return;
  }
  samples[k].push(len);
  if (samples[k].length > MAX_SAMPLES) samples[k].shift();
  if (samples[k].length >= NEEDED) lengths[k] = median(samples[k]);
}

function sample(pts) {
  for (const [k, pairs] of Object.entries(SEGMENTS)) {
    for (const [a, b] of pairs) if (sure(a, b)) addSample(k, pts[a].distance(pts[b]));
  }
  if (sure(11, 12, 23, 24)) addSample('spine', mid(pts[11], pts[12]).distance(mid(pts[23], pts[24])));
}

const orig = Array.from({ length: 33 }, () => new pc.Vec3());
const dir = new pc.Vec3();

// Rebuild `pts` in place (figure space, before the floor lift is applied)
export function constrain(pts) {
  if (!features.bones.enabled) return;
  sample(pts);
  reportStatus();
  if (!CORE.some((k) => lengths[k])) return;

  for (let i = 0; i < 33; i++) orig[i].copy(pts[i]);
  const delta = (i) => new pc.Vec3().sub2(pts[i], orig[i]);
  const move = (ids, d) => ids.forEach((i) => pts[i].add(d));
  const placeFrom = (anchor, from, i, len) => {
    dir.sub2(orig[i], from);
    const d = dir.length();
    if (d < 1e-5) return;
    pts[i].copy(anchor).add(dir.mulScalar(len / d));
  };
  // child = parent + original direction * calibrated length; uncalibrated segments just follow their parent
  const chain = (parent, child, k) => {
    if (lengths[k]) placeFrom(pts[parent], orig[parent], child, lengths[k]);
    else pts[child].copy(orig[child]).add(delta(parent));
  };

  const hipMid = mid(orig[23], orig[24]);
  if (lengths.pelvis) {
    placeFrom(hipMid, hipMid, 23, lengths.pelvis / 2);
    placeFrom(hipMid, hipMid, 24, lengths.pelvis / 2);
  }

  const shoulderMid = mid(orig[11], orig[12]);
  const newShoulderMid = shoulderMid.clone();
  if (lengths.spine) {
    dir.sub2(shoulderMid, hipMid);
    newShoulderMid.copy(hipMid).add(dir.mulScalar(lengths.spine / Math.max(dir.length(), 1e-5)));
  }
  const shift = new pc.Vec3().sub2(newShoulderMid, shoulderMid);
  if (lengths.shoulders) {
    placeFrom(newShoulderMid, shoulderMid, 11, lengths.shoulders / 2);
    placeFrom(newShoulderMid, shoulderMid, 12, lengths.shoulders / 2);
  } else move([11, 12], shift);
  move([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], shift); // the head rides on the shoulders

  for (const [s, e, w, hand] of [[11, 13, 15, [17, 19, 21]], [12, 14, 16, [18, 20, 22]]]) {
    chain(s, e, 'upperArm');
    chain(e, w, 'forearm');
    move(hand, delta(w));
  }
  for (const [h, k, a, heel, toe] of [[23, 25, 27, 29, 31], [24, 26, 28, 30, 32]]) {
    chain(h, k, 'thigh');
    chain(k, a, 'shin');
    chain(a, heel, 'heel');
    chain(a, toe, 'foot');
  }
}

function reportStatus() {
  const done = SEGMENT_NAMES.filter((k) => lengths[k]).length;
  if (CORE.some((k) => lengths[k])) {
    setStatus('bones', 'active', `${done}/${SEGMENT_NAMES.length} lengths`);
  } else {
    const progress = Math.max(...CORE.map((k) => samples[k].length / NEEDED));
    setStatus('bones', 'waiting', `calibrating ${Math.round(Math.min(progress, 1) * 100)}%`);
  }
}

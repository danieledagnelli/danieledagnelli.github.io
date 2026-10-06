// One Euro filter: heavy smoothing when a value is nearly still (kills jitter),
// light smoothing when it moves fast (keeps lag low). See https://gery.casiez.net/1euro/
export class OneEuro {
  constructor() { this.x = null; this.dx = 0; this.t = 0; }
  reset() { this.x = null; }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(v, t, minCutoff, beta) {
    if (this.x === null) { this.x = v; this.dx = 0; this.t = t; return v; }
    const dt = Math.max(t - this.t, 1e-3);
    this.t = t;
    const dv = (v - this.x) / dt;
    this.dx += OneEuro.alpha(1, dt) * (dv - this.dx);
    const cutoff = minCutoff + beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
}

export const makeFilters = (n) => Array.from({ length: n }, () => new OneEuro());

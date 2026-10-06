export type Track = 'arcade' | 'edm' | 'hiphop' | 'rooftop';

/** Original procedural score. No AudioContext is created before the sound button is used. */
export class Synth {
  private context?: AudioContext;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private nextNote = 0;
  private step = 0;
  private volume = 0.28;
  private hidden = false;
  enabled = false;
  track: Track = 'arcade';

  async toggle(): Promise<boolean> {
    if (this.enabled) { this.enabled = false; this.stop(); return false; }
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
      }
      await this.context.resume();
      if (this.context.state !== 'running') return false;
      this.enabled = true;
      if (!this.hidden) this.start();
      return true;
    } catch { this.enabled = false; return false; }
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.fade(this.enabled && !this.hidden ? this.volume * 0.45 : 0);
  }
  setTrack(track: Track) {
    if (this.track === track) return;
    this.track = track;
    this.step = 0;
    if (this.enabled && !this.hidden && this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(Math.min(this.volume * 0.45, 0.015), now, 0.06);
      this.master.gain.setTargetAtTime(this.volume * 0.45, now + 0.2, 0.15);
    }
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) this.stop();
    else if (this.enabled) {
      void this.context?.resume().then(() => { if (this.enabled && !this.hidden) this.start(); }).catch(() => {});
    }
  }
  effect(note = 76) {
    if (this.enabled && !this.hidden && this.context) this.tone(note, this.context.currentTime, 0.13, 'sine', 0.32);
  }
  dispose() { this.enabled = false; this.stop(); void this.context?.close(); }

  private fade(target: number) {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.04);
  }
  private stop() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.fade(0);
  }
  private start() {
    if (!this.context || this.timer) return;
    this.nextNote = this.context.currentTime + 0.05;
    this.fade(this.volume * 0.45);
    this.timer = setInterval(() => this.schedule(), 40);
    this.schedule();
  }
  private tone(midi: number, time: number, length: number, type: OscillatorType, gain: number) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + length);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + length + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  private drum(time: number, kick: boolean) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = kick ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(kick ? 130 : 2600, time);
    oscillator.frequency.exponentialRampToValueAtTime(kick ? 42 : 900, time + 0.11);
    envelope.gain.setValueAtTime(kick ? 0.65 : 0.09, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + (kick ? 0.18 : 0.04));
    oscillator.connect(envelope); envelope.connect(this.master);
    oscillator.start(time); oscillator.stop(time + 0.2);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  private schedule() {
    if (!this.context || !this.enabled || this.hidden) return;
    const bpm = this.track === 'hiphop' ? 88 : this.track === 'rooftop' ? 80 : 116;
    const interval = 60 / bpm / 4;
    const melody = [0, 7, 12, 16, 14, 7, 12, 7, 0, 7, 11, 14, 12, 7, 4, 7];
    // A minor → F → C → G, a small original sixteen-step arpeggio.
    const roots = [45, 41, 48, 43];
    while (this.nextNote < this.context.currentTime + 0.14) {
      const beat = this.step % 16;
      const root = roots[Math.floor(this.step / 16) % roots.length];
      const gentle = this.track === 'rooftop';
      if (!gentle || beat % 2 === 0) this.tone(root + 12 + melody[beat], this.nextNote, gentle ? 0.5 : 0.16, gentle ? 'sine' : 'triangle', 0.20);
      if (beat % 4 === 0) this.tone(root, this.nextNote, interval * 3, 'triangle', 0.4);
      if (!gentle) {
        if (beat % (this.track === 'hiphop' ? 8 : 4) === 0) this.drum(this.nextNote, true);
        if (beat % 2 === 1) this.drum(this.nextNote, false);
        if (beat === 4 || beat === 12) this.tone(52, this.nextNote, 0.065, 'square', 0.08);
      }
      this.step++;
      this.nextNote += interval;
    }
  }
}

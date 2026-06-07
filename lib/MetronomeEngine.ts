/**
 * MetronomeEngine
 *
 * Accurate beat scheduling using the Web Audio API "look-ahead" scheduler
 * pattern (Chris Wilson technique). This keeps timing rock-solid even when
 * the JavaScript main thread is busy or throttled.
 *
 * Beat interval at 82 BPM  =  60 / 82  ≈  0.7317 s  (731.7 ms)
 */

const LOOK_AHEAD_TIME = 0.1; // seconds — how far ahead to schedule audio
const SCHEDULE_INTERVAL_MS = 25; // ms — how often the scheduler runs

export type BeatCallback = (beatTime: number) => void;

export class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0; // AudioContext time of the next beat
  private beatCallbacks: BeatCallback[] = [];

  private _bpm: number;
  private _muted: boolean;

  constructor(bpm = 82, muted = false) {
    this._bpm = bpm;
    this._muted = muted;
  }

  get bpm(): number {
    return this._bpm;
  }

  get muted(): boolean {
    return this._muted;
  }

  get isRunning(): boolean {
    return this.schedulerTimer !== null;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  start(): void {
    if (this.isRunning) return;

    this.audioCtx = new AudioContext();
    // Schedule the first beat slightly ahead of "now" to avoid clipping
    this.nextBeatTime = this.audioCtx.currentTime + 0.05;

    this.schedulerTimer = setInterval(
      () => this.schedule(),
      SCHEDULE_INTERVAL_MS
    );
  }

  stop(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
  }

  onBeat(callback: BeatCallback): () => void {
    this.beatCallbacks.push(callback);
    return () => {
      this.beatCallbacks = this.beatCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private get beatInterval(): number {
    return 60 / this._bpm;
  }

  /**
   * Core look-ahead scheduler: fires the tick sound for every beat whose
   * scheduled time falls within the next LOOK_AHEAD_TIME window.
   */
  private schedule(): void {
    if (!this.audioCtx) return;

    const deadline = this.audioCtx.currentTime + LOOK_AHEAD_TIME;

    while (this.nextBeatTime < deadline) {
      this.scheduleTick(this.nextBeatTime);
      // Notify listeners at the scheduled beat time (clamped to now for UI)
      const beatTime = this.nextBeatTime;
      this.beatCallbacks.forEach((cb) => cb(beatTime));
      this.nextBeatTime += this.beatInterval;
    }
  }

  /**
   * Synthesise a short tick click using an OscillatorNode + GainNode.
   * The click is a short 1 kHz sine burst — enough to hear clearly without
   * being harsh.
   */
  private scheduleTick(time: number): void {
    if (this._muted || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.frequency.value = 1000;
    osc.type = "sine";

    // Sharp attack, fast decay — "click" feel
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.06);
  }
}

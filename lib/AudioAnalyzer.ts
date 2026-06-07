/**
 * AudioAnalyzer
 *
 * Wraps an AnalyserNode and provides continuous low-latency voice-activity
 * detection (VAD) via RMS energy analysis.
 *
 * Design goals:
 *  - No dependency on the browser SpeechRecognition API
 *  - Works entirely within the Web Audio graph
 *  - Provides raw RMS + debounced VAD events
 *
 * VAD algorithm:
 *  1. Compute RMS of the time-domain buffer every POLL_INTERVAL_MS.
 *  2. Apply a simple energy threshold (VOICE_THRESHOLD).
 *  3. Use a short hold-off timer (SILENCE_HOLD_MS) to avoid fragmenting
 *     continuous speech into many tiny bursts.
 */

/** How often we read the analyser buffer (ms) */
const POLL_INTERVAL_MS = 20;

/** RMS amplitude 0–1 above which we consider the mic "active" */
const VOICE_THRESHOLD = 0.012;

/**
 * How long silence must persist before we declare the burst ended (ms).
 * Keeps short pauses (plosive stops, breaths) from fragmenting a word.
 */
const SILENCE_HOLD_MS = 180;

export type VADEvent = "speechStart" | "speechEnd";
export type VADCallback = (event: VADEvent, timestamp: number) => void;
export type VolumeCallback = (rms: number) => void;

export class AudioAnalyzer {
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  private _isSpeaking = false;
  private vadCallbacks: VADCallback[] = [];
  private volumeCallbacks: VolumeCallback[] = [];

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Attach to an existing MediaStreamAudioSourceNode (or any AudioNode that
   * is already connected to the AudioContext graph).
   */
  connect(sourceNode: AudioNode, audioCtx: AudioContext): void {
    this.disconnect();

    this.analyser = audioCtx.createAnalyser();
    // fftSize 512 → 256 time-domain samples, ~11.6 ms frame at 44.1 kHz
    // Lower values = lower latency but less frequency resolution (fine for VAD)
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.3;

    sourceNode.connect(this.analyser);
    this.buffer = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));

    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  disconnect(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // ignore — already disconnected
      }
      this.analyser = null;
    }
    this.buffer = null;
    this._isSpeaking = false;
  }

  onVAD(callback: VADCallback): () => void {
    this.vadCallbacks.push(callback);
    return () => {
      this.vadCallbacks = this.vadCallbacks.filter((cb) => cb !== callback);
    };
  }

  onVolume(callback: VolumeCallback): () => void {
    this.volumeCallbacks.push(callback);
    return () => {
      this.volumeCallbacks = this.volumeCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private poll(): void {
    if (!this.analyser || !this.buffer) return;

    this.analyser.getFloatTimeDomainData(this.buffer);
    const rms = this.computeRMS(this.buffer);

    // Notify volume listeners
    this.volumeCallbacks.forEach((cb) => cb(rms));

    if (rms > VOICE_THRESHOLD) {
      // Clear any pending silence hold-off
      if (this.silenceTimer !== null) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      if (!this._isSpeaking) {
        this._isSpeaking = true;
        this.emit("speechStart");
      }
    } else {
      // Below threshold — start hold-off if we were speaking
      if (this._isSpeaking && this.silenceTimer === null) {
        this.silenceTimer = setTimeout(() => {
          this._isSpeaking = false;
          this.silenceTimer = null;
          this.emit("speechEnd");
        }, SILENCE_HOLD_MS);
      }
    }
  }

  private computeRMS(buffer: Float32Array<ArrayBuffer>): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private emit(event: VADEvent): void {
    const ts = performance.now();
    this.vadCallbacks.forEach((cb) => cb(event, ts));
  }
}

/**
 * SpeechTracker
 *
 * Manages the microphone stream lifecycle and uses AudioAnalyzer to produce
 * timestamped SpeechBurst records.
 *
 * Responsibilities:
 *  - Request mic access (getUserMedia)
 *  - Build the Web Audio graph: MediaStreamSource → AudioAnalyzer
 *  - Accumulate SpeechBurst objects
 *  - Expose callbacks for state changes so the React layer stays thin
 */

import { AudioAnalyzer } from "./AudioAnalyzer";
import type { SpeechBurst } from "@/types";

export type BurstsCallback = (bursts: SpeechBurst[]) => void;
export type SpeakingCallback = (isSpeaking: boolean) => void;
export type VolumeCallback = (rms: number) => void;
export type ErrorCallback = (message: string) => void;

export class SpeechTracker {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyzer = new AudioAnalyzer();

  private _bursts: SpeechBurst[] = [];
  private _isListening = false;
  private _isSpeaking = false;

  // Callbacks
  private burstsCallbacks: BurstsCallback[] = [];
  private speakingCallbacks: SpeakingCallback[] = [];
  private volumeCallbacks: VolumeCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  get isListening(): boolean {
    return this._isListening;
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  get bursts(): SpeechBurst[] {
    return this._bursts;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this._isListening) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : `Could not access microphone: ${err instanceof Error ? err.message : String(err)}`;
      this.emitError(msg);
      return;
    }

    this.audioCtx = new AudioContext();
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

    // Wire VAD
    this.analyzer.onVAD((event, timestamp) => {
      if (event === "speechStart") {
        this._isSpeaking = true;
        // Open a new burst
        this._bursts = [
          ...this._bursts,
          { startTime: timestamp, endTime: null, duration: null },
        ];
        this.emitSpeaking(true);
        this.emitBursts();
      } else {
        this._isSpeaking = false;
        // Close the most recent open burst
        const now = performance.now();
        this._bursts = this._bursts.map((b, i) => {
          if (i === this._bursts.length - 1 && b.endTime === null) {
            return { ...b, endTime: now, duration: now - b.startTime };
          }
          return b;
        });
        this.emitSpeaking(false);
        this.emitBursts();
      }
    });

    this.analyzer.onVolume((rms) => {
      this.volumeCallbacks.forEach((cb) => cb(rms));
    });

    this.analyzer.connect(this.sourceNode, this.audioCtx);
    this._isListening = true;
  }

  stop(): void {
    this.analyzer.disconnect();

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.sourceNode = null;
    this._isListening = false;
    this._isSpeaking = false;
  }

  reset(): void {
    this._bursts = [];
    this.emitBursts();
  }

  // ── Subscription API ──────────────────────────────────────────────────────

  onBursts(cb: BurstsCallback): () => void {
    this.burstsCallbacks.push(cb);
    return () => {
      this.burstsCallbacks = this.burstsCallbacks.filter((f) => f !== cb);
    };
  }

  onSpeaking(cb: SpeakingCallback): () => void {
    this.speakingCallbacks.push(cb);
    return () => {
      this.speakingCallbacks = this.speakingCallbacks.filter((f) => f !== cb);
    };
  }

  onVolume(cb: VolumeCallback): () => void {
    this.volumeCallbacks.push(cb);
    return () => {
      this.volumeCallbacks = this.volumeCallbacks.filter((f) => f !== cb);
    };
  }

  onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.push(cb);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((f) => f !== cb);
    };
  }

  // ── Private emitters ──────────────────────────────────────────────────────

  private emitBursts(): void {
    const snapshot = [...this._bursts];
    this.burstsCallbacks.forEach((cb) => cb(snapshot));
  }

  private emitSpeaking(v: boolean): void {
    this.speakingCallbacks.forEach((cb) => cb(v));
  }

  private emitError(msg: string): void {
    this.errorCallbacks.forEach((cb) => cb(msg));
  }
}

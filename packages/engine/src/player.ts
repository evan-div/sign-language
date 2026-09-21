/**
 * Playback clock.
 *
 * Deliberately dumb: it owns time, not motion. The renderer asks it for the
 * current time each frame and samples the plan itself. Keeping the clock free
 * of pose data is what lets the same clock drive fingerspelling now and a full
 * sign sequence later.
 */

export interface PlaybackState {
  readonly timeMs: number;
  readonly durationMs: number;
  readonly playing: boolean;
  readonly speed: number;
}

export class PlaybackClock {
  private timeMs = 0;
  private playing = false;
  private speed = 1;
  private durationMs: number;
  /** Set when playback runs off the end, so the UI can show a replay affordance. */
  private ended = false;

  constructor(durationMs = 0) {
    this.durationMs = durationMs;
  }

  /** Advance by a real-time delta. Returns the new time in milliseconds. */
  tick(deltaMs: number): number {
    if (!this.playing || this.durationMs <= 0) return this.timeMs;
    this.timeMs += deltaMs;
    if (this.timeMs >= this.durationMs) {
      this.timeMs = this.durationMs;
      this.playing = false;
      this.ended = true;
    }
    return this.timeMs;
  }

  play(): void {
    if (this.durationMs <= 0) return;
    // Replaying from the end should start over rather than sit at the end.
    if (this.timeMs >= this.durationMs) this.timeMs = 0;
    this.ended = false;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(timeMs: number): void {
    this.timeMs = Math.max(0, Math.min(this.durationMs, timeMs));
    this.ended = false;
  }

  /** Seek by fraction of the whole, which is what a scrub bar produces. */
  seekNormalized(t: number): void {
    this.seek(t * this.durationMs);
  }

  /**
   * Retime to a new duration, keeping the same relative position.
   *
   * Changing speed re-plans the motion and therefore changes its duration;
   * preserving normalised position stops the scrub handle jumping.
   */
  retime(durationMs: number): void {
    const ratio = this.durationMs > 0 ? this.timeMs / this.durationMs : 0;
    this.durationMs = durationMs;
    this.timeMs = Math.min(durationMs, ratio * durationMs);
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(4, speed));
  }

  reset(): void {
    this.timeMs = 0;
    this.playing = false;
    this.ended = false;
  }

  get state(): PlaybackState {
    return {
      timeMs: this.timeMs,
      durationMs: this.durationMs,
      playing: this.playing,
      speed: this.speed,
    };
  }

  get hasEnded(): boolean {
    return this.ended;
  }
}

/**
 * Frame statistics for the bench route. Pure: feed it requestAnimationFrame
 * timestamps and read the numbers back. No DOM, so Vitest can check it.
 */

const RATES = [120, 90, 60, 30];

/** The display's frame interval, from the median gap between frames, snapped to a common refresh rate. */
export function frameInterval(deltas: number[]): number {
  if (deltas.length === 0) return 1000 / 60;
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  let best = RATES[0]!;
  for (const hz of RATES) if (Math.abs(1000 / hz - median) < Math.abs(1000 / best - median)) best = hz;
  return 1000 / best;
}

/** How many frames were missed in one gap. A gap of 2 intervals means 1 dropped frame. */
export function droppedIn(delta: number, interval: number): number {
  return Math.max(0, Math.round(delta / interval) - 1);
}

export interface FrameSnapshot {
  fps: number;
  hz: number;
  frames: number;
  dropped: number;
  droppedPct: number;
  worstMs: number;
  seconds: number;
}

export class FrameMeter {
  private deltas: number[] = [];
  private recent: number[] = [];
  private last: number | null = null;
  private frames = 0;
  private dropped = 0;
  private worst = 0;
  private elapsed = 0;

  /** Record one frame. Call reset() or skip() after the page was hidden, so the gap isn't counted. */
  frame(t: number): void {
    if (this.last !== null) {
      const d = t - this.last;
      this.deltas.push(d);
      if (this.deltas.length > 600) this.deltas.shift();
      const interval = frameInterval(this.deltas);
      this.frames++;
      this.dropped += droppedIn(d, interval);
      this.worst = Math.max(this.worst, d);
      this.elapsed += d;
    }
    this.recent.push(t);
    while (this.recent.length && this.recent[0]! < t - 1000) this.recent.shift();
    this.last = t;
  }

  /** Forget the last timestamp, for example when the page comes back from the background. */
  skip(): void {
    this.last = null;
    this.recent = [];
  }

  reset(): void {
    this.deltas = [];
    this.recent = [];
    this.last = null;
    this.frames = 0;
    this.dropped = 0;
    this.worst = 0;
    this.elapsed = 0;
  }

  snapshot(): FrameSnapshot {
    const expected = this.frames + this.dropped;
    return {
      fps: this.recent.length > 1 ? this.recent.length - 1 : 0,
      hz: Math.round(1000 / frameInterval(this.deltas)),
      frames: this.frames,
      dropped: this.dropped,
      droppedPct: expected > 0 ? (this.dropped / expected) * 100 : 0,
      worstMs: this.worst,
      seconds: this.elapsed / 1000,
    };
  }
}

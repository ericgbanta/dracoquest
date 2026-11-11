import { describe, expect, it } from 'vitest';
import { droppedIn, FrameMeter, frameInterval } from '../src/ui/dev/frames';

describe('bench frame meter', () => {
  it('finds the display rate from the median frame gap', () => {
    expect(Math.round(1000 / frameInterval([16.6, 16.8, 16.7, 33.4, 16.6]))).toBe(60);
    expect(Math.round(1000 / frameInterval([8.3, 8.4, 8.3, 16.7, 8.3]))).toBe(120);
    expect(Math.round(1000 / frameInterval([]))).toBe(60);
  });

  it('counts a gap of two intervals as one dropped frame', () => {
    expect(droppedIn(16.7, 1000 / 60)).toBe(0);
    expect(droppedIn(33.3, 1000 / 60)).toBe(1);
    expect(droppedIn(50, 1000 / 60)).toBe(2);
  });

  it('reports fps and the dropped share over a run', () => {
    const m = new FrameMeter();
    let t = 0;
    // 99 frames on time, then one long frame that skips 2.
    for (let i = 0; i < 100; i++) { m.frame(t); t += 1000 / 60; }
    t += (1000 / 60) * 2;
    m.frame(t);
    const s = m.snapshot();
    expect(s.hz).toBe(60);
    expect(s.frames).toBe(100);
    expect(s.dropped).toBe(2);
    expect(s.droppedPct).toBeCloseTo((2 / 102) * 100, 5);
    // The last second holds the long gap, so it shows 3 fewer frames than 60.
    expect(s.fps).toBe(57);
    expect(Math.round(s.worstMs)).toBe(50);
  });

  it('ignores the gap while the page was hidden', () => {
    const m = new FrameMeter();
    m.frame(0); m.frame(16.7); m.frame(33.4);
    m.skip();
    m.frame(5000); m.frame(5016.7);
    expect(m.snapshot().dropped).toBe(0);
    expect(m.snapshot().frames).toBe(3);
  });
});

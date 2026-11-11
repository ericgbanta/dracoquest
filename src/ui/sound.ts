/**
 * Small synthesized sound effects (Web Audio, no files to download).
 * Sound is off by default and only plays when Settings turns it on.
 */
export type Sfx = 'hit' | 'crit' | 'miss' | 'heal' | 'ko' | 'victory' | 'defeat' | 'tap';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain = 0.15, slideTo?: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + start + dur);
  g.gain.setValueAtTime(gain, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

export function play(sfx: Sfx, enabled: boolean): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  switch (sfx) {
    case 'hit': tone(ac, 220, 0, 0.1, 'square', 0.08, 110); break;
    case 'crit': tone(ac, 440, 0, 0.08, 'square', 0.1); tone(ac, 660, 0.06, 0.14, 'square', 0.1, 330); break;
    case 'miss': tone(ac, 520, 0, 0.12, 'sine', 0.06, 760); break;
    case 'heal': tone(ac, 520, 0, 0.12, 'sine', 0.08); tone(ac, 780, 0.1, 0.16, 'sine', 0.08); break;
    case 'ko': tone(ac, 300, 0, 0.35, 'sawtooth', 0.08, 60); break;
    case 'victory': [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, i * 0.1, 0.18, 'triangle', 0.1)); break;
    case 'defeat': [392, 330, 262].forEach((f, i) => tone(ac, f, i * 0.16, 0.24, 'triangle', 0.09)); break;
    case 'tap': tone(ac, 880, 0, 0.04, 'sine', 0.05); break;
  }
}

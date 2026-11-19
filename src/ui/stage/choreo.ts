import layout from '../../data/stage.json';
import spellFx from '../../data/spellFx.json';

/**
 * Battle beats acted out on the stage. Every animation here moves only
 * transform and opacity, so it runs on the compositor. Effects come from a
 * fixed pool of nodes inside the stage; nothing is created per frame.
 */

export interface BeatOpts {
  fast: boolean;
  reduced: boolean;
  /** Called at the moment of impact, to update HP and the log. */
  onImpact?(): void;
}

export interface HitInfo {
  actor: string;
  target: string;
  text: string;
  kind?: 'dmg' | 'crit' | 'miss' | 'heal';
  /** Element color for projectiles and flashes. */
  color?: string;
  /** A big, telegraphed attack: longer wind-up. */
  big?: boolean;
  /** The element the attack used, when known (a hybrid's breath picks one of two). */
  element?: string | null;
}

const B = layout.beats;
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
let numIndex = 0;
let sparkTurn = 0;

interface Pt { x: number; y: number }

function fighter(stage: HTMLElement, id: string): HTMLElement | null {
  return stage.querySelector<HTMLElement>(`[data-fighter="${id}"]`);
}

function part(f: HTMLElement | null, id: string): HTMLElement | null {
  return f?.querySelector<HTMLElement>(`[data-part="${id}"]`) ?? null;
}

/**
 * Move a named part, or, for a one-piece painted sprite that has no such part, lean the whole
 * body by a share of the same angles (src/data/stage.json, onePiece). Parts with no share are skipped.
 */
function swingPart(f: HTMLElement | null, id: string, frames: Keyframe[], opts: KeyframeAnimationOptions): void {
  const own = part(f, id);
  if (own) { own.animate(frames, opts); return; }
  const share = (layout.onePiece as Record<string, number>)[id];
  // Lean the group that holds every pose, so a swapped-in attack pose leans too.
  const body = part(f, 'torso') ?? part(f, 'body');
  if (!share || !body) return;
  const leaned = frames.map((k) => ({
    ...k,
    transform: String(k.transform ?? '').replace(/rotate\((-?[\d.]+)deg\)/g, (_, d: string) => `rotate(${(Number(d) * share).toFixed(2)}deg)`),
  }));
  body.animate(leaned, opts);
}

/**
 * Swap a one-piece sprite to its attack pose from `from` to `to` (ms into a move of `total` ms).
 * Opacity only, in hard steps. Does nothing when the character has no attack pose.
 */
function strike(f: HTMLElement | null, from: number, to: number, total: number): void {
  const pose = part(f, 'pose-attack');
  const body = part(f, 'body');
  if (!pose || !body) return;
  const a = at(from, total);
  const b = Math.max(a, at(to, total));
  const steps = (on: number, off: number): Keyframe[] => [
    { opacity: off, offset: 0, easing: 'steps(1, end)' }, { opacity: on, offset: a, easing: 'steps(1, end)' }, { opacity: off, offset: b }, { opacity: off, offset: 1 },
  ];
  pose.animate(steps(1, 0), { duration: total });
  body.animate(steps(0, 1), { duration: total });
}

const speed = (o: { fast: boolean }) => (o.fast ? layout.fastFactor : 1);
const scaled = <T extends Record<string, number>>(b: T, k: number): T =>
  Object.fromEntries(Object.entries(b).map(([key, v]) => [key, v * k])) as T;

/** A named point on a fighter's rig (mouth, hit, front), in stage pixels. Read once per beat. */
function point(stage: HTMLElement, f: HTMLElement, name: string): Pt {
  const s = stage.getBoundingClientRect();
  const r = f.getBoundingClientRect();
  const pts = JSON.parse(f.dataset.points ?? '{}') as Record<string, [number, number]>;
  const [px, py] = pts[name] ?? (name === 'front' ? [0.8, 0.5] : [0.5, 0.55]);
  const fx = f.dataset.facing === 'left' ? 1 - px : px;
  return { x: r.left - s.left + fx * r.width, y: r.top - s.top + py * r.height };
}

const at = (ms: number, total: number) => Math.min(1, Math.max(0, ms / total));
/** Which way a fighter faces: +1 right (party), -1 left (enemies). */
const facing = (f: HTMLElement) => (f.dataset.facing === 'left' ? -1 : 1);

function knockback(stage: HTMLElement, target: HTMLElement, k: number, strong = false): void {
  const d = (B.knockback.dist / 100) * stage.clientWidth * -facing(target) * (strong ? 1.6 : 1);
  target.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${d}px)`, offset: 0.25 }, { transform: 'translateX(0)' }],
    { duration: B.knockback.ms * k, easing: 'ease-out' },
  );
  target.querySelector('.rig')?.animate(
    [{ opacity: 1 }, { opacity: 0.35, offset: 0.2 }, { opacity: 1, offset: 0.45 }, { opacity: 0.6, offset: 0.7 }, { opacity: 1 }],
    { duration: B.knockback.ms * k },
  );
}

/** A dodge: the target hops back and returns. */
function sidestep(stage: HTMLElement, target: HTMLElement, k: number): void {
  const d = stage.clientWidth * 0.05 * -facing(target);
  target.animate(
    [{ transform: 'translate(0, 0)' }, { transform: `translate(${d}px, -6%)`, offset: 0.4 }, { transform: 'translate(0, 0)' }],
    { duration: 320 * k, easing: 'ease-out' },
  );
}

function burst(stage: HTMLElement, cls: string, p: Pt, k: number, frames: (base: string) => Keyframe[], ms: number): HTMLElement | null {
  const el = stage.querySelector<HTMLElement>(`.${cls}`);
  if (!el) return null;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  el.animate(frames(`translate(${p.x - w / 2}px, ${p.y - h / 2}px)`), { duration: ms * k, easing: 'ease-out' });
  return el;
}

function spark(stage: HTMLElement, p: Pt, k: number, big = false): void {
  const r = (sparkTurn++ % 3) * 25;
  const s = big ? 1.5 : 1.1;
  burst(stage, 'fx-spark', p, k, (b) => [
    { transform: `${b} rotate(${r}deg) scale(0.3)`, opacity: 1 },
    { transform: `${b} rotate(${r + 20}deg) scale(${s})`, opacity: 0 },
  ], 220);
}

function slash(stage: HTMLElement, p: Pt, k: number): void {
  burst(stage, 'fx-slash', p, k, (b) => [
    { transform: `${b} rotate(-30deg) scale(0.6)`, opacity: 0 },
    { transform: `${b} rotate(-5deg) scale(1)`, opacity: 1, offset: 0.35 },
    { transform: `${b} rotate(10deg) scale(1.15)`, opacity: 0 },
  ], 240);
}

/** A soft burst of light in the attack's color where the blow lands. */
function glow(stage: HTMLElement, p: Pt, k: number, color: string | undefined, big: boolean): void {
  const el = stage.querySelector<HTMLElement>('.fx-glow');
  if (!el) return;
  el.style.setProperty('--fx', color ?? '#fff');
  const s = big ? 1.25 : 0.7;
  burst(stage, 'fx-glow', p, k, (b) => [
    { transform: `${b} scale(${s * 0.35})`, opacity: 0.95 },
    { transform: `${b} scale(${s})`, opacity: 0.6, offset: 0.3 },
    { transform: `${b} scale(${s * 1.15})`, opacity: 0 },
  ], B.glow.ms);
}

/** A heavy blow: the view punches in on the hit point and rattles, then settles. */
function punch(stage: HTMLElement, p: Pt, k: number): void {
  const world = stage.querySelector<HTMLElement>('.stage-world');
  if (!world) return;
  const d = (B.shake.dist / 100) * stage.clientWidth;
  const z = B.punch.scale;
  world.style.transformOrigin = `${p.x}px ${p.y}px`;
  world.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${-d}px, ${d * 0.6}px) scale(${z})`, offset: 0.12 },
      { transform: `translate(${d}px, ${-d * 0.5}px) scale(${z})`, offset: 0.3 },
      { transform: `translate(${-d * 0.5}px, ${d * 0.3}px) scale(${1 + (z - 1) * 0.5})`, offset: 0.5 },
      { transform: `translate(${d * 0.25}px, 0) scale(${1 + (z - 1) * 0.2})`, offset: 0.72 },
      { transform: 'translate(0, 0) scale(1)' },
    ],
    { duration: B.punch.ms * k, easing: 'ease-out' },
  );
}

/** Hit-stop: everything already moving freezes for a few frames, so the blow reads as heavy. */
function hitStop(stage: HTMLElement, k: number): void {
  const running = stage.getAnimations({ subtree: true }).filter((a) => a.playState === 'running');
  if (running.length === 0) return;
  running.forEach((a) => a.pause());
  window.setTimeout(() => running.forEach((a) => { if (a.playState === 'paused') a.play(); }), B.hitStop * k);
}

/** A crit: a white flash over the target. */
function flash(stage: HTMLElement, p: Pt, k: number): void {
  burst(stage, 'fx-flash', p, k, (b) => [
    { transform: `${b} scale(0.4)`, opacity: 0.85 },
    { transform: `${b} scale(1.3)`, opacity: 0 },
  ], 260);
}

/** A ring pulse at a fighter's feet, in a given color (element shift). */
export function ring(stage: HTMLElement, id: string, color: string, fast: boolean): void {
  const f = fighter(stage, id);
  const el = stage.querySelector<HTMLElement>('.fx-ring');
  if (!f || !el) return;
  el.style.setProperty('--fx', color);
  const s = stage.getBoundingClientRect();
  const r = f.getBoundingClientRect();
  burst(stage, 'fx-ring', { x: r.left - s.left + r.width / 2, y: r.bottom - s.top - r.height * 0.05 }, speed({ fast }), (b) => [
    { transform: `${b} scale(0.5)`, opacity: 1 },
    { transform: `${b} scale(1.6)`, opacity: 0 },
  ], 520);
}

/** Particles rising from a fighter: heal sparkles, burn flames, chill flakes, shock sparks. */
export function particles(stage: HTMLElement, id: string, kind: 'heal' | 'burn' | 'chill' | 'shock' | 'buff', fast: boolean): void {
  const f = fighter(stage, id);
  if (!f) return;
  const k = speed({ fast });
  const c = point(stage, f, 'hit');
  const spread = f.offsetWidth * 0.35;
  stage.querySelectorAll<HTMLElement>('.fx-p').forEach((el, i) => {
    el.className = `fx fx-p fx-p--${kind}`;
    const x = c.x + spread * ((i % 2 ? 1 : -1) * (0.3 + 0.25 * i));
    const y = c.y + f.offsetHeight * 0.15;
    const rise = f.offsetHeight * (0.45 + 0.1 * (i % 3));
    const w = el.offsetWidth;
    el.animate(
      [
        { transform: `translate(${x - w / 2}px, ${y}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${x - w / 2}px, ${y - rise * 0.3}px) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x - w / 2 + (i % 2 ? 4 : -4)}px, ${y - rise}px) scale(0.6)`, opacity: 0 },
      ],
      { duration: 640 * k, delay: i * 70 * k, easing: 'ease-out' },
    );
  });
}

/** Pop a number above a fighter. Two pooled nodes take turns. */
export function popNumber(stage: HTMLElement, targetId: string, text: string, kind: HitInfo['kind'] | 'mp' = 'dmg', fast = false): void {
  const target = fighter(stage, targetId);
  const nums = stage.querySelectorAll<HTMLElement>('.fx-num');
  if (!target || nums.length === 0) return;
  const el = nums[numIndex++ % nums.length]!;
  el.textContent = text;
  el.className = `fx fx-num fx-num--${kind}`;
  const hitPt = point(stage, target, 'hit');
  const x = hitPt.x;
  const y = hitPt.y - target.offsetHeight * B.number.above;
  const rise = (B.number.rise / 100) * stage.clientWidth;
  const base = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  el.animate(
    [
      { transform: `${base} scale(0.5)`, opacity: 0 },
      { transform: `${base} scale(1.3)`, opacity: 1, offset: 0.12 },
      { transform: `${base} scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${x}px, ${y - rise}px) translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.75 },
      { transform: `translate(${x}px, ${y - rise * 1.3}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
    ],
    { duration: B.number.ms * (fast ? layout.fastFactor : 1), easing: 'ease-out' },
  );
}

/** The moment a blow lands: dodge on a miss, otherwise knockback, spark, crit flash and the number. */
function land(stage: HTMLElement, target: HTMLElement, hit: HitInfo, opts: BeatOpts, strong = false): void {
  const k = speed(opts);
  const p = point(stage, target, 'hit');
  opts.onImpact?.();
  if (hit.kind === 'miss') {
    sidestep(stage, target, k);
    popNumber(stage, hit.target, hit.text || 'Miss', 'miss', opts.fast);
    return;
  }
  const crit = hit.kind === 'crit';
  // Freeze what is already moving first; the impact effects below start fresh and play through it.
  if (strong || crit) hitStop(stage, k);
  knockback(stage, target, k, strong || crit);
  glow(stage, p, k, hit.color, strong || crit);
  spark(stage, p, k, strong || crit);
  if (crit) flash(stage, p, k);
  if (strong || crit) punch(stage, p, k);
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
}

/** Reduced motion: no dashes, knockbacks or shakes. A short fade on the target and the number. */
async function plainBeat(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const k = speed(opts);
  fighter(stage, hit.target)?.querySelector('.rig')?.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 200 * k });
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(B.slotMs * k);
}

/** The rider dashes to the target, swings, and returns. */
export async function riderAttack(stage: HTMLElement, hit: HitInfo, opts: BeatOpts & { quiet?: boolean }): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts);
  const { windup, dash, swing, hold, back } = scaled(B.riderAttack, k);
  const total = windup + dash + swing + hold + back;
  const impact = windup + dash + swing;
  const dx = point(stage, target, 'front').x - point(stage, actor, 'front').x;
  const hitPt = point(stage, target, 'hit');
  strike(actor, windup + dash * 0.7, impact + hold, total);
  actor.animate(
    [
      { transform: 'translateX(0)', offset: 0, easing: 'ease-in' },
      { transform: `translateX(${-dx * 0.04}px)`, offset: at(windup, total), easing: 'cubic-bezier(.2,.7,.3,1)' },
      { transform: `translateX(${dx}px)`, offset: at(windup + dash, total) },
      { transform: `translateX(${dx}px)`, offset: at(impact + hold, total), easing: 'ease-in-out' },
      { transform: 'translateX(0)', offset: 1 },
    ],
    { duration: total },
  );
  swingPart(actor, 'arm', 
    [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: 'rotate(-60deg)', offset: at(windup + dash * 0.7, total), easing: 'cubic-bezier(.5,0,.8,.6)' },
      { transform: 'rotate(100deg)', offset: at(impact, total) },
      { transform: 'rotate(100deg)', offset: at(impact + hold, total) },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
    { duration: total },
  );
  await sleep(impact - 45 * k);
  if (hit.kind !== 'miss') slash(stage, hitPt, k);
  await sleep(45 * k);
  if (!opts.quiet) land(stage, target, hit, opts);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** A ranged shot or a spell: the rider raises the weapon and a bolt crosses the stage. */
export async function shoot(stage: HTMLElement, hit: HitInfo & { bolt: 'arrow' | 'orb' }, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts);
  const { draw, travel, hold, back } = scaled(B.shoot, k);
  const total = draw + travel + hold + back;
  const impact = draw + travel;
  const from = point(stage, actor, 'front');
  const to = point(stage, target, 'hit');
  strike(actor, draw * 0.4, impact + hold, total);
  swingPart(actor, 'arm', 
    [
      { transform: 'rotate(0deg)' },
      { transform: `rotate(${hit.bolt === 'arrow' ? -10 : -45}deg)`, offset: at(draw, total), easing: 'ease-out' },
      { transform: `rotate(${hit.bolt === 'arrow' ? -6 : 20}deg)`, offset: at(draw + 60 * k, total) },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  actor.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${-stage.clientWidth * 0.015}px)`, offset: at(draw + 40 * k, total) }, { transform: 'translateX(0)' }],
    { duration: total, easing: 'ease-out' },
  );
  const el = stage.querySelector<HTMLElement>('.fx-bolt');
  if (el) {
    el.className = `fx fx-bolt fx-bolt--${hit.bolt}`;
    if (hit.color) el.style.setProperty('--fx', hit.color);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const ang = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
    const t = (p: Pt, s: number) => `translate(${p.x - w / 2}px, ${p.y - h / 2}px) rotate(${ang}deg) scale(${s})`;
    const end = hit.kind === 'miss' ? { x: to.x + (to.x - from.x) * 0.25, y: to.y - 20 } : to;
    el.animate(
      [{ transform: t(from, 0.6), opacity: 0 }, { transform: t(from, 1), opacity: 1, offset: 0.1 }, { transform: t(end, 1), opacity: 1, offset: 0.92 }, { transform: t(end, 1.2), opacity: 0 }],
      { duration: travel, delay: draw, easing: 'linear' },
    );
  }
  await sleep(impact);
  land(stage, target, hit, opts);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** The dragon lunges and swipes with its front claw. */
export async function claw(stage: HTMLElement, hit: HitInfo, opts: BeatOpts & { quiet?: boolean }): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts);
  const { lunge, swipe, hold, back } = scaled({ lunge: B.claw.lunge, swipe: B.claw.swipe, hold: B.claw.hold, back: B.claw.back }, k);
  const total = lunge + swipe + hold + back;
  const impact = lunge + swipe;
  const dx = (B.claw.reach / 100) * stage.clientWidth;
  strike(actor, lunge * 0.6, impact + hold, total);
  actor.animate(
    [
      { transform: 'translateX(0)', easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: `translateX(${dx}px)`, offset: at(lunge, total) },
      { transform: `translateX(${dx}px)`, offset: at(impact + hold, total), easing: 'ease-in-out' },
      { transform: 'translateX(0)' },
    ],
    { duration: total },
  );
  swingPart(actor, 'leg-front', 
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-40deg)', offset: at(lunge, total), easing: 'ease-in' },
      { transform: 'rotate(30deg)', offset: at(impact, total) },
      { transform: 'rotate(30deg)', offset: at(impact + hold, total) },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  swingPart(actor, 'head', 
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-10deg)', offset: at(lunge, total) }, { transform: 'rotate(10deg)', offset: at(impact, total) }, { transform: 'rotate(0deg)' }],
    { duration: total },
  );
  await sleep(impact);
  if (!opts.quiet) land(stage, target, hit, opts);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** The dragon rears back and breathes a stream of puffs across the stage. */
export async function breath(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts);
  const b = B.breath;
  const { rear, stagger, travel, recover } = scaled({ rear: b.rear, stagger: b.stagger, travel: b.travel, recover: b.recover }, k);
  const streamEnd = rear + stagger * (b.puffs - 1) + travel;
  const total = streamEnd + recover;
  const from = point(stage, actor, 'mouth');
  const to = point(stage, target, 'hit');
  strike(actor, rear, streamEnd - travel * 0.4, total);
  swingPart(actor, 'head', 
    [
      { transform: 'rotate(0deg)', easing: 'ease-out' },
      { transform: 'rotate(-18deg)', offset: at(rear, total), easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: 'rotate(4deg)', offset: at(rear + 90 * k, total) },
      { transform: 'rotate(2deg)', offset: at(streamEnd - travel * 0.5, total), easing: 'ease-in-out' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  swingPart(actor, 'jaw', 
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(8deg)', offset: at(rear, total) },
      { transform: 'rotate(26deg)', offset: at(rear + 75 * k, total) },
      { transform: 'rotate(26deg)', offset: at(streamEnd - travel * 0.5, total), easing: 'ease-in-out' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  const puffs = stage.querySelectorAll<HTMLImageElement>('.fx-puff');
  const own = hit.element ? stage.querySelector<HTMLElement>('.stage-fx')?.getAttribute(`data-puff-${hit.element}`) : null;
  if (own) puffs.forEach((el) => { if (el.getAttribute('src') !== own) el.setAttribute('src', own); });
  const w = puffs[0]?.offsetWidth ?? 0;
  const lift = stage.clientWidth * 0.03;
  const miss = hit.kind === 'miss';
  puffs.forEach((el, i) => {
    const wobble = (i % 2 ? 1 : -1) * lift * (0.5 + (i % 3) * 0.25);
    const mx = from.x + (to.x - from.x) * 0.5;
    const my = from.y + (to.y - from.y) * 0.5 - lift + wobble;
    const ex = to.x + (i % 3) * w * 0.12 + (miss ? w : 0);
    const ey = to.y + wobble * 0.6 - (miss ? w * 0.6 : 0);
    const t = (x: number, y: number, s: number, r: number) => `translate(${x - w / 2}px, ${y - w / 2}px) rotate(${r}deg) scale(${s})`;
    el.animate(
      [
        { transform: t(from.x, from.y, 0.3, i * 40), opacity: 0 },
        { transform: t(from.x + (mx - from.x) * 0.3, from.y + (my - from.y) * 0.3, 0.6, i * 40 + 30), opacity: 1, offset: 0.15 },
        { transform: t(mx, my, 0.95, i * 40 + 70), opacity: 1, offset: 0.5 },
        { transform: t(ex, ey, 1.35, i * 40 + 120), opacity: 0.9, offset: 0.85 },
        { transform: t(ex + w * 0.2, ey, 1.6, i * 40 + 140), opacity: 0 },
      ],
      { duration: travel, delay: rear + i * stagger, easing: 'linear' },
    );
  });
  const impact = rear + travel * 0.8;
  await sleep(impact);
  land(stage, target, hit, opts, true);
  await sleep(Math.max(B.slotMs * k, streamEnd) - impact);
}

/** A body lunge at the target: enemies attacking, and the mounted dive in Ride mode. */
export async function lungeAt(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts);
  const b = scaled(B.enemyAttack, k);
  const windup = b.windup * (hit.big ? 1.5 : 1);
  const total = windup + b.lunge + b.hold + b.back;
  const impact = windup + b.lunge;
  const dir = facing(actor);
  const gap = stage.clientWidth * 0.04 * -dir;
  const dx = point(stage, target, 'front').x - point(stage, actor, 'front').x + gap;
  const lean = stage.clientWidth * (hit.big ? 0.05 : 0.03) * -dir;
  strike(actor, windup, impact + b.hold, total);
  actor.animate(
    [
      { transform: 'translate(0, 0)', easing: 'ease-out' },
      { transform: `translate(${lean}px, ${hit.big ? '-4%' : '0'})`, offset: at(windup, total), easing: 'cubic-bezier(.4,0,.2,1)' },
      { transform: `translate(${dx}px, 0)`, offset: at(impact, total) },
      { transform: `translate(${dx}px, 0)`, offset: at(impact + b.hold, total), easing: 'ease-in-out' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: total },
  );
  for (const [id, up, down] of [['wing-front', -22, 16], ['wing-back', -16, 12], ['head', -12, 14], ['arm', -40, 60], ['jaw', 0, 20]] as const) {
    part(actor, id)?.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${up}deg)`, offset: at(windup, total) },
        { transform: `rotate(${down}deg)`, offset: at(impact, total) },
        { transform: 'rotate(0deg)' },
      ],
      { duration: total },
    );
  }
  await sleep(impact);
  land(stage, target, hit, opts, !!hit.big);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** Kept for the B0 mock and the bench: an enemy attack is a lunge. */
export const enemyAttack = lungeAt;

/** Two party members strike together (combos and duo combos). One impact, one number. */
export async function together(stage: HTMLElement, hit: HitInfo, partner: string, opts: BeatOpts): Promise<void> {
  const second = { ...hit, actor: partner };
  const riderFirst = hit.actor === 'rider' ? hit : partner === 'rider' ? second : null;
  const dragons = [hit, second].filter((h) => h.actor !== 'rider');
  await Promise.all([
    ...dragons.map((h, i) => claw(stage, h, { ...opts, quiet: i > 0 || !!riderFirst, onImpact: i > 0 || riderFirst ? undefined : opts.onImpact })),
    ...(riderFirst ? [riderAttack(stage, riderFirst, opts)] : []),
  ]);
}

/** A small hop for actions with no target: guarding, using an item, casting a buff. */
export async function act(stage: HTMLElement, id: string, opts: { fast: boolean; reduced: boolean }): Promise<void> {
  const f = fighter(stage, id);
  const k = speed(opts);
  if (f && !opts.reduced) {
    f.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5%)', offset: 0.35 }, { transform: 'translateY(0)' }], { duration: 300 * k, easing: 'ease-out' });
  }
  await sleep(B.eventMs.act * k);
}

/** Shocked: a fast jitter. */
export function jitter(stage: HTMLElement, id: string, fast: boolean): void {
  const f = fighter(stage, id);
  const d = stage.clientWidth * 0.008;
  f?.animate(
    [0, 1, -1, 1, -1, 0].map((s) => ({ transform: `translateX(${s * d}px)` })),
    { duration: 260 * speed({ fast }) },
  );
}

/** End of a fight: the party hops on a win, the rider kneels on a loss, everyone runs off on a flee. */
export async function finale(stage: HTMLElement, outcome: 'won' | 'lost' | 'fled', party: string[], opts: { fast: boolean; reduced: boolean }): Promise<void> {
  const k = speed(opts);
  if (!opts.reduced) {
    party.forEach((id, i) => {
      const f = fighter(stage, id);
      if (!f || f.classList.contains('actor--ko')) return;
      if (outcome === 'won') {
        f.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(-10%)', offset: 0.25 }, { transform: 'translateY(0)', offset: 0.5 }, { transform: 'translateY(-6%)', offset: 0.72 }, { transform: 'translateY(0)' }],
          { duration: 700 * k, delay: i * 80 * k, easing: 'ease-out' },
        );
      } else if (outcome === 'fled') {
        f.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-stage.clientWidth * 0.6}px)`, opacity: 0 }], { duration: 600 * k, easing: 'ease-in', fill: 'forwards' });
      } else if (id === 'rider') {
        f.querySelector('.rig')?.animate([{ transform: 'none' }, { transform: 'translateY(12%) rotate(-8deg) scaleY(0.88)' }], { duration: 500 * k, easing: 'ease-out', fill: 'forwards' });
      }
    });
  }
  await sleep(B.eventMs.end * k);
}

/** Light feedback for one engine event: used by the B1 path and as a fallback. */
export function react(stage: HTMLElement, ev: { t: string; actor?: string; target?: string; amount?: number; crit?: boolean }, opts: { fast: boolean; reduced: boolean }): void {
  const k = speed(opts);
  const target = ev.target ? fighter(stage, ev.target) : null;
  switch (ev.t) {
    case 'hit':
      if (target && !opts.reduced) knockback(stage, target, k, !!ev.crit);
      popNumber(stage, ev.target!, `${ev.crit ? '★' : ''}-${ev.amount}`, ev.crit ? 'crit' : 'dmg', opts.fast);
      break;
    case 'dot':
      if (target && !opts.reduced) knockback(stage, target, k);
      popNumber(stage, ev.target!, `-${ev.amount}`, 'dmg', opts.fast);
      break;
    case 'miss':
      popNumber(stage, ev.target!, 'Miss', 'miss', opts.fast);
      break;
    case 'heal':
      popNumber(stage, ev.target!, `+${ev.amount}`, 'heal', opts.fast);
      break;
  }
}

// ---- Painted spell effects (docs/SPELLS_PLAN.md) ----

const S = spellFx.timing;

export type SpellStyle = 'bolt' | 'lance' | 'rise' | 'fall' | 'strike' | 'wave' | 'self';

/** What a cast needs: how the effect moves, its art keys in the stage's loaded set, and its size. */
export interface SpellLook {
  style: SpellStyle;
  /** Key of the effect's art (`spell-ember-lance`, `orb-fire`). */
  art: string;
  /** Width as a share of the stage width. */
  size: number;
  /** Tone for the cast flare and hit burst: an element or `arcane`. */
  tone: string;
  /** A late spell: slower and bigger, with a heavier landing. */
  long?: boolean;
  /** A second painted piece at the moment of impact. */
  finish?: { art: string; anchor: 'center' | 'feet'; size: number };
  /** A ward: the effect holds in front of the target before fading. */
  hold?: boolean;
}

/** A loaded spell effect: its URL and height over width. Null when the art is missing. */
function fxArt(stage: HTMLElement, key: string): { url: string; ratio: number } | null {
  const raw = stage.querySelector<HTMLElement>('.stage-fx')?.getAttribute(`data-fx-${key}`);
  if (!raw) return null;
  const cut = raw.lastIndexOf('|');
  const ratio = Number(raw.slice(cut + 1));
  return cut > 0 && ratio > 0 ? { url: raw.slice(0, cut), ratio } : null;
}

/** True when the stage has the art a look needs; otherwise the caller falls back to the plain orb. */
export function hasSpellArt(stage: HTMLElement, look: SpellLook): boolean {
  return !!fxArt(stage, look.art) && !!stage.querySelector('.fx-spell');
}

/** Point a pooled effect image at an art file and size it. Returns its width and height in px. */
function dress(stage: HTMLElement, cls: string, key: string, width: number, origin = '50% 50%'): { el: HTMLImageElement; w: number; h: number } | null {
  const el = stage.querySelector<HTMLImageElement>(`.${cls}`);
  const art = fxArt(stage, key);
  if (!el || !art) return null;
  if (el.getAttribute('src') !== art.url) el.setAttribute('src', art.url);
  const h = width * art.ratio;
  el.style.width = `${width}px`;
  el.style.height = `${h}px`;
  el.style.transformOrigin = origin;
  return { el, w: width, h };
}

/** Where a fighter stands: the middle of its feet. */
function feet(stage: HTMLElement, f: HTMLElement): Pt {
  const s = stage.getBoundingClientRect();
  const r = f.getBoundingClientRect();
  return { x: r.left - s.left + r.width / 2, y: r.bottom - s.top - r.height * 0.04 };
}

/** The caster's flare: a starburst at the staff or hand as the spell is cast. */
function flare(stage: HTMLElement, actor: HTMLElement, tone: string, ms: number): void {
  const d = dress(stage, 'fx-cast', `cast-${tone}`, stage.clientWidth * spellFx.cast.size) ?? dress(stage, 'fx-cast', 'cast-arcane', stage.clientWidth * spellFx.cast.size);
  if (!d) return;
  const p = point(stage, actor, 'front');
  const b = `translate(${p.x - d.w / 2}px, ${p.y - d.h / 2}px)`;
  d.el.animate(
    [
      { transform: `${b} rotate(-40deg) scale(0.2)`, opacity: 0 },
      { transform: `${b} rotate(0deg) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `${b} rotate(25deg) scale(1.25)`, opacity: 0 },
    ],
    { duration: ms * 1.6, easing: 'ease-out' },
  );
}

/** The caster's body: the attack pose and a small lean back, like a shot. */
function castPose(stage: HTMLElement, actor: HTMLElement, castMs: number, until: number, total: number): void {
  const dir = facing(actor);
  strike(actor, castMs * 0.4, until, total);
  swingPart(actor, 'arm',
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-45deg)', offset: at(castMs, total), easing: 'ease-out' }, { transform: 'rotate(20deg)', offset: at(castMs + 60, total) }, { transform: 'rotate(0deg)' }],
    { duration: total },
  );
  actor.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${-dir * stage.clientWidth * 0.015}px)`, offset: at(castMs + 40, total) }, { transform: 'translateX(0)' }],
    { duration: total, easing: 'ease-out' },
  );
}

/** The painted burst where a spell lands, in the spell's tone. */
function hitBurst(stage: HTMLElement, p: Pt, tone: string, k: number, big: boolean): void {
  const width = stage.clientWidth * spellFx.hit.size * (big ? 1.45 : 1);
  const d = dress(stage, 'fx-hit', `hit-${tone}`, width) ?? dress(stage, 'fx-hit', 'hit-arcane', width);
  if (!d) return;
  const b = `translate(${p.x - d.w / 2}px, ${p.y - d.h / 2}px)`;
  d.el.animate(
    [
      { transform: `${b} rotate(-15deg) scale(0.3)`, opacity: 1 },
      { transform: `${b} rotate(0deg) scale(1)`, opacity: 1, offset: 0.4 },
      { transform: `${b} rotate(12deg) scale(1.3)`, opacity: 0 },
    ],
    { duration: S.hit.ms * k, easing: 'ease-out' },
  );
}

/** A late spell's second piece: it swells out of the target (or up from the ground) as the blow lands. */
function finisher(stage: HTMLElement, target: HTMLElement, f: NonNullable<SpellLook['finish']>, k: number): void {
  const ground = f.anchor === 'feet';
  const d = dress(stage, 'fx-finish', f.art, stage.clientWidth * f.size, ground ? '50% 100%' : '50% 50%');
  if (!d) return;
  const p = ground ? feet(stage, target) : point(stage, target, 'hit');
  const b = `translate(${p.x - d.w / 2}px, ${ground ? p.y - d.h : p.y - d.h / 2}px)`;
  const frames: Keyframe[] = ground
    ? [
      { transform: `${b} scale(0.7, 0.1)`, opacity: 0.9 },
      { transform: `${b} scale(1, 1.06)`, opacity: 1, offset: 0.32, easing: 'ease-out' },
      { transform: `${b} scale(1.04, 1)`, opacity: 1, offset: 0.7 },
      { transform: `${b} scale(1.12, 1.05)`, opacity: 0 },
    ]
    : [
      { transform: `${b} rotate(-25deg) scale(0.15)`, opacity: 0.9 },
      { transform: `${b} rotate(0deg) scale(1.05)`, opacity: 1, offset: 0.32, easing: 'ease-out' },
      { transform: `${b} rotate(6deg) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: `${b} rotate(14deg) scale(1.2)`, opacity: 0 },
    ];
  d.el.animate(frames, { duration: S.finish.ms * k });
}

/**
 * Cast a damage spell (or an enemy's special move): a flare at the caster, the painted effect moving in
 * its style, then the landing. Works in either direction; effects painted facing right are mirrored for enemies.
 */
export async function cast(stage: HTMLElement, hit: HitInfo, look: SpellLook, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = speed(opts) * (look.long ? S.longFactor : 1);
  const kk = speed(opts);
  const dir = facing(actor);
  const W = stage.clientWidth;
  const miss = hit.kind === 'miss';
  const castMs = S.cast * k;
  const from = point(stage, actor, 'front');
  const to = point(stage, target, 'hit');
  const ground = feet(stage, target);
  // A miss lands beside the target.
  const off = miss ? dir * W * 0.09 : 0;
  let travel: number;
  let total: number;
  const flip = dir < 0 ? ' scaleX(-1)' : '';

  switch (look.style) {
    case 'rise': {
      const { grow, stay, fade } = scaled(S.rise, k);
      travel = grow * 0.6;
      total = grow + stay + fade;
      const d = dress(stage, 'fx-spell', look.art, W * look.size, '50% 100%');
      if (d) {
        const b = `translate(${ground.x + off - d.w / 2}px, ${ground.y - d.h}px)${flip}`;
        d.el.animate(
          [
            { transform: `${b} scale(0.6, 0.05)`, opacity: 1 },
            { transform: `${b} scale(1, 1.12)`, opacity: 1, offset: at(grow * 0.7, total), easing: 'ease-out' },
            { transform: `${b} scale(1, 1)`, opacity: 1, offset: at(grow, total) },
            { transform: `${b} scale(1, 1)`, opacity: 1, offset: at(grow + stay, total) },
            { transform: `${b} scale(1.05, 0.7)`, opacity: 0 },
          ],
          { duration: total, delay: castMs },
        );
      }
      break;
    }
    case 'strike': {
      const { grow, stay, fade } = scaled(S.strike, k);
      travel = grow;
      total = grow + stay + fade;
      // A column from the top of the stage down to the target's feet.
      const art = fxArt(stage, look.art);
      const height = Math.max(ground.y, W * look.size);
      const d = art ? dress(stage, 'fx-spell', look.art, height / art.ratio, '50% 0%') : null;
      if (d) {
        const b = `translate(${ground.x + off - d.w / 2}px, ${ground.y - d.h}px)`;
        d.el.animate(
          [
            { transform: `${b} scale(0.7, 0.1)`, opacity: 1 },
            { transform: `${b} scale(1, 1)`, opacity: 1, offset: at(grow, total), easing: 'ease-out' },
            { transform: `${b} scale(1.08, 1)`, opacity: 0.55, offset: at(grow + stay * 0.3, total) },
            { transform: `${b} scale(1, 1)`, opacity: 1, offset: at(grow + stay * 0.55, total) },
            { transform: `${b} scale(1.05, 1)`, opacity: 0.8, offset: at(grow + stay, total) },
            { transform: `${b} scale(0.5, 1)`, opacity: 0 },
          ],
          { duration: total, delay: castMs },
        );
      }
      break;
    }
    case 'wave': {
      travel = S.wave.travel * k;
      total = travel + 140 * k;
      const d = dress(stage, 'fx-spell', look.art, W * look.size, '50% 100%');
      if (d) {
        const y = ground.y - d.h;
        const x0 = feet(stage, actor).x + dir * actor.offsetWidth * 0.5;
        const x1 = ground.x + off;
        const t = (x: number, s: number) => `translate(${x - d.w / 2}px, ${y}px)${flip} scale(${s})`;
        d.el.animate(
          [
            { transform: t(x0, 0.35), opacity: 0 },
            { transform: t(x0 + (x1 - x0) * 0.25, 0.7), opacity: 1, offset: 0.2 },
            { transform: t(x1, 1.05), opacity: 1, offset: at(travel, total) },
            { transform: t(x1 + dir * W * 0.05, 1.15), opacity: 0 },
          ],
          { duration: total, delay: castMs, easing: 'cubic-bezier(.3,.1,.5,1)' },
        );
      }
      break;
    }
    default: {
      // bolt, lance and fall all fly along a line; they differ in where they start, how fast, and how they stretch.
      const lance = look.style === 'lance';
      travel = (look.style === 'fall' ? S.fall.travel : lance ? S.lance.travel : S.bolt.travel) * k;
      total = travel + 90 * k;
      const d = dress(stage, 'fx-spell', look.art, W * look.size);
      if (d) {
        const start = look.style === 'fall' ? { x: to.x - dir * W * 0.3, y: -d.h } : from;
        const end = { x: to.x + off + (miss ? dir * W * 0.08 : 0), y: to.y - (miss ? W * 0.04 : 0) };
        const ang = Math.atan2(end.y - start.y, (end.x - start.x) * dir) * (180 / Math.PI);
        const t = (p: Pt, sx: number, sy = sx) => `translate(${p.x - d.w / 2}px, ${p.y - d.h / 2}px)${flip} rotate(${ang.toFixed(1)}deg) scale(${sx}, ${sy})`;
        const mid = { x: start.x + (end.x - start.x) * 0.5, y: start.y + (end.y - start.y) * 0.5 };
        const past = { x: end.x + dir * W * 0.03, y: end.y };
        d.el.animate(
          lance
            ? [
              { transform: t(start, 0.3, 0.7), opacity: 0 },
              { transform: t(mid, 1.3, 0.9), opacity: 1, offset: 0.45 },
              { transform: t(end, 1, 1), opacity: 1, offset: at(travel, total) },
              { transform: t(past, 0.6, 1.2), opacity: 0 },
            ]
            : [
              { transform: t(start, 0.5), opacity: 0 },
              { transform: t(start, 0.9), opacity: 1, offset: 0.12 },
              { transform: t(mid, 1.08), opacity: 1, offset: 0.5 },
              { transform: t(end, 1), opacity: 1, offset: at(travel, total) },
              { transform: t(past, 1.3), opacity: 0 },
            ],
          { duration: total, delay: castMs, easing: look.style === 'fall' ? 'cubic-bezier(.5,0,.9,.6)' : 'linear' },
        );
      }
    }
  }

  const impact = castMs + travel;
  const whole = impact + Math.max(total - travel, S.back * k);
  castPose(stage, actor, castMs, impact, whole);
  flare(stage, actor, look.tone, castMs);
  await sleep(impact);
  land(stage, target, hit, opts, !!look.long);
  if (!miss) {
    hitBurst(stage, { x: to.x, y: to.y }, look.tone, kk, !!look.long);
    if (look.finish) finisher(stage, target, look.finish, kk);
  }
  const tail = look.finish && !miss ? S.finish.ms * kk * 0.75 : 0;
  await sleep(Math.max(B.slotMs * kk, whole, impact + tail) - impact);
}

/** The rider starts a spell that lands on the party: the pose and the flare. The effect follows with `selfCast`. */
export async function castStart(stage: HTMLElement, actorId: string, tone: string, opts: { fast: boolean; reduced: boolean }): Promise<void> {
  const actor = fighter(stage, actorId);
  if (!actor || opts.reduced) return act(stage, actorId, opts);
  const k = speed(opts);
  const castMs = S.cast * k;
  castPose(stage, actor, castMs, castMs * 1.6, castMs * 2.4);
  flare(stage, actor, tone, castMs);
  await sleep(castMs * 1.5);
}

/** A heal or a ward landing on its target: hearts rise off it, or a shield forms in front of it. */
export function selfCast(stage: HTMLElement, targetId: string, look: SpellLook, opts: { fast: boolean; reduced: boolean }): void {
  const target = fighter(stage, targetId);
  if (!target || opts.reduced) return;
  const k = speed(opts);
  const d = dress(stage, 'fx-spell', look.art, stage.clientWidth * look.size);
  if (!d) return;
  const p = point(stage, target, 'hit');
  const rise = target.offsetHeight * 0.3;
  const t = (dy: number, s: number) => `translate(${p.x - d.w / 2}px, ${p.y - d.h / 2 - dy}px) scale(${s})`;
  d.el.animate(
    look.hold
      ? [
        { transform: t(0, 0.2), opacity: 0 },
        { transform: t(0, 1.12), opacity: 1, offset: 0.25, easing: 'ease-out' },
        { transform: t(0, 1), opacity: 1, offset: 0.4 },
        { transform: t(0, 1.04), opacity: 0.9, offset: 0.75 },
        { transform: t(0, 1.3), opacity: 0 },
      ]
      : [
        { transform: t(-rise * 0.2, 0.4), opacity: 0 },
        { transform: t(rise * 0.3, 1), opacity: 1, offset: 0.3, easing: 'ease-out' },
        { transform: t(rise * 0.8, 1.05), opacity: 1, offset: 0.7 },
        { transform: t(rise * 1.2, 0.9), opacity: 0 },
      ],
    { duration: S.self.ms * k },
  );
}

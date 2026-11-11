import layout from '../../data/stage.json';

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

/** A named point on a fighter's rig (mouth, hit, front), in stage pixels. Read once per beat. */
function point(stage: HTMLElement, f: HTMLElement, name: string): Pt {
  const s = stage.getBoundingClientRect();
  const r = f.getBoundingClientRect();
  const pts = JSON.parse(f.dataset.points ?? '{}') as Record<string, [number, number]>;
  const [px, py] = pts[name] ?? [0.5, 0.5];
  const fx = f.dataset.facing === 'left' ? 1 - px : px;
  return { x: r.left - s.left + fx * r.width, y: r.top - s.top + py * r.height };
}

const at = (ms: number, total: number) => Math.min(1, Math.max(0, ms / total));

function knockback(stage: HTMLElement, target: HTMLElement, dir: number, k: number, strong = false): void {
  const d = (B.knockback.dist / 100) * stage.clientWidth * dir * (strong ? 1.6 : 1);
  target.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(${d}px)`, offset: 0.25 }, { transform: 'translateX(0)' }],
    { duration: B.knockback.ms * k, easing: 'ease-out' },
  );
  target.querySelector('.rig')?.animate(
    [{ opacity: 1 }, { opacity: 0.35, offset: 0.2 }, { opacity: 1, offset: 0.45 }, { opacity: 0.6, offset: 0.7 }, { opacity: 1 }],
    { duration: B.knockback.ms * k },
  );
}

function shake(stage: HTMLElement, k: number): void {
  const d = (B.shake.dist / 100) * stage.clientWidth;
  stage.querySelector('.stage-world')?.animate(
    [
      { transform: 'translate(0, 0)' }, { transform: `translate(${-d}px, ${d * 0.5}px)` }, { transform: `translate(${d}px, ${-d * 0.5}px)` },
      { transform: `translate(${-d * 0.5}px, 0)` }, { transform: 'translate(0, 0)' },
    ],
    { duration: B.shake.ms * k },
  );
}

function burst(stage: HTMLElement, cls: string, p: Pt, k: number, frames: (base: string) => Keyframe[], ms: number): void {
  const el = stage.querySelector<HTMLElement>(`.${cls}`);
  if (!el) return;
  const w = el.offsetWidth;
  el.animate(frames(`translate(${p.x - w / 2}px, ${p.y - w / 2}px)`), { duration: ms * k, easing: 'ease-out' });
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

/** Pop a damage number above a fighter. Two pooled nodes take turns. */
export function popNumber(stage: HTMLElement, targetId: string, text: string, kind: HitInfo['kind'] = 'dmg', fast = false): void {
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

/** Reduced motion: no dashes, knockbacks or shakes. A short fade on the target and the number. */
async function plainBeat(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const k = opts.fast ? layout.fastFactor : 1;
  fighter(stage, hit.target)?.querySelector('.rig')?.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 200 * k });
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(B.slotMs * k);
}

/** The rider dashes to the target, swings, and returns. */
export async function riderAttack(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = opts.fast ? layout.fastFactor : 1;
  const b = B.riderAttack;
  const [windup, dash, swing, hold, back] = [b.windup, b.dash, b.swing, b.hold, b.back].map((n) => n * k) as [number, number, number, number, number];
  const total = windup + dash + swing + hold + back;
  const impact = windup + dash + swing;
  const dx = point(stage, target, 'front').x - point(stage, actor, 'front').x;
  const hitPt = point(stage, target, 'hit');
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
  part(actor, 'arm')?.animate(
    [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: 'rotate(-60deg)', offset: at(windup + dash * 0.7, total), easing: 'cubic-bezier(.5,0,.8,.6)' },
      { transform: 'rotate(100deg)', offset: at(impact, total) },
      { transform: 'rotate(100deg)', offset: at(impact + hold, total) },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
    { duration: total },
  );
  part(actor, 'head')?.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(8deg)', offset: at(impact, total) }, { transform: 'rotate(0deg)' }],
    { duration: total },
  );
  await sleep(impact - 30 * k);
  slash(stage, hitPt, k);
  await sleep(30 * k);
  knockback(stage, target, 1, k);
  spark(stage, hitPt, k);
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** The dragon lunges and swipes with its front claw. */
export async function claw(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = opts.fast ? layout.fastFactor : 1;
  const b = B.claw;
  const [lunge, swipe, hold, back] = [b.lunge, b.swipe, b.hold, b.back].map((n) => n * k) as [number, number, number, number];
  const total = lunge + swipe + hold + back;
  const impact = lunge + swipe;
  const dx = (b.reach / 100) * stage.clientWidth;
  actor.animate(
    [
      { transform: 'translateX(0)', easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: `translateX(${dx}px)`, offset: at(lunge, total) },
      { transform: `translateX(${dx}px)`, offset: at(impact + hold, total), easing: 'ease-in-out' },
      { transform: 'translateX(0)' },
    ],
    { duration: total },
  );
  part(actor, 'leg-front')?.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-40deg)', offset: at(lunge, total), easing: 'ease-in' },
      { transform: 'rotate(30deg)', offset: at(impact, total) },
      { transform: 'rotate(30deg)', offset: at(impact + hold, total) },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  part(actor, 'head')?.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-10deg)', offset: at(lunge, total) }, { transform: 'rotate(10deg)', offset: at(impact, total) }, { transform: 'rotate(0deg)' }],
    { duration: total },
  );
  const hitPt = point(stage, target, 'hit');
  await sleep(impact);
  knockback(stage, target, 1, k);
  spark(stage, hitPt, k);
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

/** The dragon rears back and breathes a stream of puffs across the stage. */
export async function breath(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = opts.fast ? layout.fastFactor : 1;
  const b = B.breath;
  const [rear, stagger, travel, recover] = [b.rear, b.stagger, b.travel, b.recover].map((n) => n * k) as [number, number, number, number];
  const streamEnd = rear + stagger * (b.puffs - 1) + travel;
  const total = streamEnd + recover;
  const from = point(stage, actor, 'mouth');
  const to = point(stage, target, 'hit');
  part(actor, 'head')?.animate(
    [
      { transform: 'rotate(0deg)', easing: 'ease-out' },
      { transform: 'rotate(-18deg)', offset: at(rear, total), easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: 'rotate(4deg)', offset: at(rear + 60 * k, total) },
      { transform: 'rotate(2deg)', offset: at(streamEnd - travel * 0.5, total), easing: 'ease-in-out' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  part(actor, 'jaw')?.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(8deg)', offset: at(rear, total) },
      { transform: 'rotate(26deg)', offset: at(rear + 50 * k, total) },
      { transform: 'rotate(26deg)', offset: at(streamEnd - travel * 0.5, total), easing: 'ease-in-out' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: total },
  );
  const puffs = stage.querySelectorAll<HTMLElement>('.fx-puff');
  const w = puffs[0]?.offsetWidth ?? 0;
  const lift = stage.clientWidth * 0.03;
  puffs.forEach((el, i) => {
    const wobble = (i % 2 ? 1 : -1) * lift * (0.5 + (i % 3) * 0.25);
    const mx = from.x + (to.x - from.x) * 0.5;
    const my = from.y + (to.y - from.y) * 0.5 - lift + wobble;
    const ex = to.x + (i % 3) * w * 0.12;
    const ey = to.y + wobble * 0.6;
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
  knockback(stage, target, 1, k, true);
  shake(stage, k);
  spark(stage, to, k, true);
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(Math.max(B.slotMs * k, streamEnd) - impact);
}

/** An enemy winds up, lunges at a party member, and returns. */
export async function enemyAttack(stage: HTMLElement, hit: HitInfo, opts: BeatOpts): Promise<void> {
  const actor = fighter(stage, hit.actor);
  const target = fighter(stage, hit.target);
  if (!actor || !target || opts.reduced) return plainBeat(stage, hit, opts);
  const k = opts.fast ? layout.fastFactor : 1;
  const b = B.enemyAttack;
  const [windup, lunge, hold, back] = [b.windup, b.lunge, b.hold, b.back].map((n) => n * k) as [number, number, number, number];
  const total = windup + lunge + hold + back;
  const impact = windup + lunge;
  const gap = stage.clientWidth * 0.04;
  const dx = point(stage, target, 'front').x - point(stage, actor, 'front').x + gap;
  const lean = stage.clientWidth * 0.03;
  actor.animate(
    [
      { transform: 'translateX(0)', easing: 'ease-out' },
      { transform: `translateX(${lean}px)`, offset: at(windup, total), easing: 'cubic-bezier(.4,0,.2,1)' },
      { transform: `translateX(${dx}px)`, offset: at(impact, total) },
      { transform: `translateX(${dx}px)`, offset: at(impact + hold, total), easing: 'ease-in-out' },
      { transform: 'translateX(0)' },
    ],
    { duration: total },
  );
  for (const [id, up, down] of [['wing-front', -22, 16], ['wing-back', -16, 12], ['head', -12, 14]] as const) {
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
  const hitPt = point(stage, target, 'hit');
  await sleep(impact);
  knockback(stage, target, -1, k);
  spark(stage, hitPt, k);
  opts.onImpact?.();
  popNumber(stage, hit.target, hit.text, hit.kind, opts.fast);
  await sleep(Math.max(B.slotMs * k, total) - impact);
}

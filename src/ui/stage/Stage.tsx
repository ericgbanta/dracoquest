import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import type { Backdrop, Effects, Part, Rig } from './rigs';
import './stage.css';
import { Icon } from '../Icon';

export interface PlatePlace { left?: number; right?: number; top: number; width: number; minPx: number }
export interface Place { left: number; bottom: number; width: number; z: number; plate: PlatePlace }

export interface StageFighter {
  id: string;
  /** Where the fighter stands, in stage percent (from src/data/stage.json). */
  place: Place;
  rig: Rig | null;
  /** Drawn when the rig's art is missing. */
  fallback: ComponentChildren;
  /** A rider sitting on this fighter (Ride mode). */
  mount?: { rig: Rig | null; fallback: ComponentChildren };
  name: string;
  hp: number;
  maxHp: number;
  facing: 'right' | 'left';
  enemy?: boolean;
  /** Status marks for the plate: the status's icon and turns left. */
  marks?: { id: string; icon: string; turns: number }[];
  intent?: { kind: string; icon: string; text: string; big?: boolean };
  targeted?: boolean;
  onTap?(): void;
  /** Tapping the plate: enemies open their details (exact HP, weakness, next move). */
  onPlate?(): void;
  /** Screen reader label for the tap, such as "Target Storm Roc". */
  tapLabel?: string;
  testid?: string;
}

interface Props {
  backdrop: Backdrop | null;
  /** Used when the zone has no painted backdrop yet: tints a plain sky and ground. */
  plainColor?: string;
  fighters: StageFighter[];
  effects: Effects;
  header?: ComponentChildren;
  /** Pause the idle loops, for example while a sheet covers the stage. */
  paused?: boolean;
  /** Fighters stay hidden until every image is decoded, so nothing pops in. */
  loading?: boolean;
  stageRef?: Ref<HTMLDivElement>;
}

const PUFFS = layout.beats.breath.puffs;
const PARTICLES = layout.particles;

/** A side-view battle stage: backdrop, fighters built from parts, plates and a pooled effects layer. */
export function Stage({ backdrop, plainColor, fighters, effects, header, paused, loading, stageRef }: Props) {
  const hidden = usePageHidden();
  const plain = !backdrop && plainColor ? plainStyle(plainColor) : undefined;
  return (
    <div class={`stage${paused || hidden ? ' stage--paused' : ''}${loading ? ' stage--loading' : ''}`} ref={stageRef} data-testid="stage">
      <div class="stage-world" style={plain}>
        {backdrop?.layers.map((l, i) => (
          <img key={i} class={`stage-layer${l.anim ? ` anim-${l.anim}` : ''}`} src={l.url} alt="" draggable={false} />
        ))}
        {fighters.map((f) => <FighterView key={f.id} f={f} />)}
      </div>
      {header}
      {fighters.map((f) => <Plate key={f.id} f={f} />)}
      <div class="stage-fx" aria-hidden="true">
        {effects.puff && Array.from({ length: PUFFS }, (_, i) => <img key={`p${i}`} class="fx fx-puff" src={effects.puff!} alt="" />)}
        {effects.slash && <img class="fx fx-slash" src={effects.slash} alt="" />}
        {effects.spark && <img class="fx fx-spark" src={effects.spark} alt="" />}
        <span class="fx fx-flash" />
        <span class="fx fx-ring" />
        <span class="fx fx-bolt" />
        {Array.from({ length: PARTICLES }, (_, i) => <span key={`q${i}`} class="fx fx-p" />)}
        <span class="fx fx-num" />
        <span class="fx fx-num" />
      </div>
    </div>
  );
}

function plainStyle(color: string) {
  const p = layout.plainBackdrop;
  const ground = `color-mix(in srgb, ${color} ${Math.round((1 - p.groundMix) * 100)}%, #4a4458)`;
  return {
    background: `linear-gradient(${p.sky}, ${p.skyLow} ${p.groundTop}%, ${ground} ${p.groundTop}%, color-mix(in srgb, ${ground} 70%, #1d1a2b))`,
  };
}

function FighterView({ f }: { f: StageFighter }) {
  const p = f.place;
  const style = { left: `${p.left}%`, bottom: `${p.bottom}%`, width: `${p.width}%`, zIndex: p.z };
  const state = f.hp <= 0 ? (f.enemy ? ' actor--down' : ' actor--ko') : '';
  const cls = `actor${f.enemy ? ' actor--enemy' : ''}${f.targeted ? ' actor--targeted' : ''}${state}`;
  const data = { 'data-fighter': f.id, 'data-facing': f.facing, 'data-points': JSON.stringify(f.rig?.points ?? {}) };
  // The target ring is the actor's ::after (class actor--targeted).
  const body = f.rig
    ? <RigView rig={f.rig} facing={f.facing} mount={f.mount} />
    : <div class="rig rig--fallback">{f.fallback}{f.mount && <Mount host={null} mount={f.mount} />}</div>;
  if (f.onTap) {
    return (
      <button type="button" class={cls} style={style} {...data} onClick={f.onTap} disabled={f.enemy && f.hp <= 0}
        aria-pressed={f.enemy ? !!f.targeted : undefined} aria-label={f.tapLabel ?? f.name} data-testid={f.testid}>
        {body}
      </button>
    );
  }
  return <div class={cls} style={style} {...data} data-testid={f.testid}>{body}</div>;
}

export function RigView({ rig, facing, mount }: { rig: Rig; facing: 'right' | 'left'; mount?: StageFighter['mount'] }) {
  const seat = mount ? <Mount host={rig} mount={mount} /> : null;
  const hasTorso = rig.parts.some((p) => p.id === 'torso');
  return (
    <div class={`rig${facing === 'left' ? ' rig--left' : ''}`} style={{ aspectRatio: `${rig.size[0]} / ${rig.size[1]}` }}>
      {rig.parts.map((p) => <PartView key={p.id} p={p} seat={p.id === 'torso' ? seat : null} />)}
      {!hasTorso && seat}
    </div>
  );
}

/** A rider sitting on a dragon: its seat point lands on the dragon's saddle point. */
function Mount({ host, mount }: { host: Rig | null; mount: NonNullable<StageFighter['mount']> }) {
  const m = layout.mount;
  const [seatX, seatY] = m.seat as [number, number];
  const [sx, sy] = (host?.points.saddle ?? m.saddle) as [number, number];
  const hostAspect = host ? host.size[0] / host.size[1] : 1;
  const riderAspect = mount.rig ? mount.rig.size[0] / mount.rig.size[1] : 120 / 170;
  const w = m.width * 100;
  const h = w * (hostAspect / riderAspect);
  const style = { left: `${sx * 100 - seatX * w}%`, top: `${sy * 100 - seatY * h}%`, width: `${w}%` };
  return (
    <div class="mount" style={style}>
      {mount.rig ? <RigView rig={mount.rig} facing="right" /> : <div class="rig rig--fallback rig--rider">{mount.fallback}</div>}
    </div>
  );
}

function PartView({ p, seat }: { p: Part; seat?: ComponentChildren }) {
  const style = { transformOrigin: `${p.pivot[0] * 100}% ${p.pivot[1] * 100}%` };
  const cls = `part${p.anim ? ` anim-${p.anim}` : ''}`;
  if (p.parts.length === 0 && !seat) {
    return p.url ? <img class={cls} data-part={p.id} src={p.url} alt="" style={style} draggable={false} /> : null;
  }
  return (
    <div class={cls} data-part={p.id} style={style}>
      {p.url && <img class="part" src={p.url} alt="" draggable={false} />}
      {p.parts.map((c) => <PartView key={c.id} p={c} />)}
      {seat}
    </div>
  );
}

function Plate({ f }: { f: StageFighter }) {
  const pos = f.place.plate;
  const style = {
    top: `${pos.top}%`, width: `max(${pos.width}%, ${pos.minPx}px)`,
    ...(pos.right !== undefined ? { right: `${pos.right}%` } : { left: `${pos.left}%` }),
  };
  const pct = f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0;
  const cls = `plate${f.enemy ? ' plate--enemy' : ''}${f.hp <= 0 ? ' plate--down' : ''}`;
  const inner = (
    <>
      <span class="plate-name">{f.name}{f.marks?.length ? <span class="plate-marks"> {f.marks.map((m) => <span key={m.id}><Icon name={`status-${m.id}`} fallback={m.icon} />{m.turns} </span>)}</span> : null}</span>
      {/* The fill is the bar's ::after, scaled by --hp, to keep the stage under its node budget. */}
      <span class="plate-bar" style={{ '--hp': pct }} role="meter" aria-label={`${f.name} HP`} aria-valuemin={0} aria-valuemax={f.maxHp} aria-valuenow={Math.round(f.hp)} />
      {f.intent && <span class={`plate-intent intent${f.intent.big ? ' plate-intent--big' : ''}`}><Icon name={`intent-${f.intent.kind}`} fallback={f.intent.icon} /> {f.intent.text}</span>}
    </>
  );
  if (f.onPlate) {
    return (
      <button type="button" class={`${cls} plate--button`} style={style} data-plate={f.id} onClick={f.onPlate}
        aria-label={`${f.name}: ${Math.round(f.hp)} of ${f.maxHp} HP. Details`} data-testid={`plate-${f.id}`}>
        {inner}
      </button>
    );
  }
  return <div class={cls} style={style} data-plate={f.id}>{inner}</div>;
}

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

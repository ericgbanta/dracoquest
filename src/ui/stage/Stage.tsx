import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import type { Backdrop, Effects, Part, Rig } from './rigs';
import './stage.css';

export type Slot = 'rider' | 'dragon' | 'enemy';

export interface StageFighter {
  id: string;
  slot: Slot;
  rig: Rig | null;
  /** Drawn when the rig's art is missing. */
  fallback: ComponentChildren;
  name: string;
  hp: number;
  maxHp: number;
  facing: 'right' | 'left';
  intent?: { icon: string; text: string; big?: boolean };
  targeted?: boolean;
  onTap?(): void;
  testid?: string;
}

interface Props {
  backdrop: Backdrop | null;
  fighters: StageFighter[];
  effects: Effects;
  header?: ComponentChildren;
  /** Pause the idle loops, for example while a sheet covers the stage. */
  paused?: boolean;
  stageRef?: Ref<HTMLDivElement>;
}

const PUFFS = layout.beats.breath.puffs;

/** A side-view battle stage: backdrop, fighters built from parts, plates and a pooled effects layer. */
export function Stage({ backdrop, fighters, effects, header, paused, stageRef }: Props) {
  const hidden = usePageHidden();
  return (
    <div class={`stage${paused || hidden ? ' stage--paused' : ''}`} ref={stageRef} data-testid="stage">
      <div class="stage-world">
        {backdrop?.layers.map((l, i) => (
          <img key={i} class={`stage-layer${l.anim ? ` anim-${l.anim}` : ''}`} src={l.url} alt="" draggable={false} />
        ))}
        {fighters.map((f) => <FighterView key={f.id} f={f} />)}
      </div>
      {header && <div class="stage-header">{header}</div>}
      {fighters.map((f) => <Plate key={f.id} f={f} />)}
      <div class="stage-fx" aria-hidden="true">
        {effects.puff && Array.from({ length: PUFFS }, (_, i) => <img key={`p${i}`} class="fx fx-puff" src={effects.puff!} alt="" />)}
        {effects.slash && <img class="fx fx-slash" src={effects.slash} alt="" />}
        {effects.spark && <img class="fx fx-spark" src={effects.spark} alt="" />}
        <span class="fx fx-num" />
        <span class="fx fx-num" />
      </div>
    </div>
  );
}

function FighterView({ f }: { f: StageFighter }) {
  const s = layout.slots[f.slot];
  const style = { left: `${s.left}%`, bottom: `${s.bottom}%`, width: `${s.width}%`, zIndex: s.z };
  const data = { 'data-fighter': f.id, 'data-facing': f.facing, 'data-points': JSON.stringify(f.rig?.points ?? {}) };
  // The target ring is the fighter's ::after (class fighter--targeted).
  const body = f.rig ? <RigView rig={f.rig} facing={f.facing} /> : <div class="rig rig--fallback">{f.fallback}</div>;
  if (f.onTap) {
    return (
      <button type="button" class={`fighter fighter--${f.slot}${f.targeted ? ' fighter--targeted' : ''}`} style={style} {...data} onClick={f.onTap}
        aria-pressed={!!f.targeted} aria-label={`Target ${f.name}`} data-testid={f.testid}>
        {body}
      </button>
    );
  }
  return <div class={`fighter fighter--${f.slot}${f.targeted ? ' fighter--targeted' : ''}`} style={style} {...data} data-testid={f.testid}>{body}</div>;
}

export function RigView({ rig, facing }: { rig: Rig; facing: 'right' | 'left' }) {
  return (
    <div class={`rig${facing === 'left' ? ' rig--left' : ''}`} style={{ aspectRatio: `${rig.size[0]} / ${rig.size[1]}` }}>
      {rig.parts.map((p) => <PartView key={p.id} p={p} />)}
    </div>
  );
}

function PartView({ p }: { p: Part }) {
  const style = { transformOrigin: `${p.pivot[0] * 100}% ${p.pivot[1] * 100}%` };
  const cls = `part${p.anim ? ` anim-${p.anim}` : ''}`;
  if (p.parts.length === 0) {
    return p.url ? <img class={cls} data-part={p.id} src={p.url} alt="" style={style} draggable={false} /> : null;
  }
  return (
    <div class={cls} data-part={p.id} style={style}>
      {p.url && <img class="part" src={p.url} alt="" draggable={false} />}
      {p.parts.map((c) => <PartView key={c.id} p={c} />)}
    </div>
  );
}

function Plate({ f }: { f: StageFighter }) {
  const pos = layout.plates[f.slot] as { left?: number; right?: number; top: number; width: number; minPx: number };
  const style = {
    top: `${pos.top}%`, width: `max(${pos.width}%, ${pos.minPx}px)`,
    ...(pos.right !== undefined ? { right: `${pos.right}%` } : { left: `${pos.left}%` }),
  };
  const pct = f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0;
  return (
    <div class={`plate plate--${f.slot}`} style={style} data-plate={f.id}>
      <span class="plate-name">{f.name}</span>
      {/* The fill is the bar's ::after, scaled by --hp, to keep the stage under its node budget. */}
      <span class="plate-bar" style={{ '--hp': pct }} role="meter" aria-label={`${f.name} HP`} aria-valuemin={0} aria-valuemax={f.maxHp} aria-valuenow={Math.round(f.hp)} />
      {f.intent && <span class={`plate-intent${f.intent.big ? ' plate-intent--big' : ''}`}>{f.intent.icon} {f.intent.text}</span>}
    </div>
  );
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

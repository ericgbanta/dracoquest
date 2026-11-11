import { useEffect, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import type { ElementId } from '../../core/types';
import { DragonSprite, EnemySprite } from '../Sprites';
import { decodeAll, loadBackdrop, loadEffects, loadRig, rigUrls, type Backdrop, type Effects, type Rig } from '../stage/rigs';
import type { StageFighter } from '../stage/Stage';

export const demo = layout.demo;
const dragonElement = demo.dragon.element as ElementId;

export interface DemoArt {
  backdrop: Backdrop | null;
  rider: Rig | null;
  dragon: Rig | null;
  enemy: Rig | null;
  effects: Effects;
}

/** Load and decode every image the demo fight needs before the stage shows. */
export function useDemoArt(): DemoArt | null {
  const [art, setArt] = useState<DemoArt | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const [backdrop, rider, dragon, enemy, effects] = await Promise.all([
        loadBackdrop(demo.zone),
        loadRig('rider'),
        loadRig(`dragon.${demo.dragon.stage}`, { element: dragonElement, primary: demo.dragon.primary, secondary: demo.dragon.secondary }),
        loadRig(`enemy.${demo.enemy.enemyId}`),
        loadEffects(dragonElement),
      ]);
      await decodeAll([
        ...(backdrop?.layers.map((l) => l.url) ?? []), ...rigUrls(rider), ...rigUrls(dragon), ...rigUrls(enemy),
        effects.puff, effects.slash, effects.spark,
      ]);
      if (live) setArt({ backdrop, rider, dragon, enemy, effects });
    })();
    return () => { live = false; };
  }, []);
  return art;
}

export interface DemoHp { rider: number; dragon: number; enemy: number }

export function demoFighters(art: DemoArt, hp: DemoHp, opts: { targeted?: boolean; onTarget?(): void } = {}): StageFighter[] {
  return [
    {
      id: 'dragon', slot: 'dragon', rig: art.dragon, name: demo.dragon.name, hp: hp.dragon, maxHp: demo.dragon.maxHp, facing: 'right', testid: 'stage-dragon',
      fallback: <DragonSprite element={dragonElement} stage={demo.dragon.stage} primary={demo.dragon.primary} secondary={demo.dragon.secondary} size={120} />,
    },
    {
      id: 'rider', slot: 'rider', rig: art.rider, name: demo.rider.name, hp: hp.rider, maxHp: demo.rider.maxHp, facing: 'right', testid: 'stage-rider',
      fallback: <RiderPlaceholder />,
    },
    {
      id: demo.enemy.id, slot: 'enemy', rig: art.enemy, name: `Storm Roc · Lv ${demo.enemy.level}`, hp: hp.enemy, maxHp: demo.enemy.maxHp, facing: 'left',
      intent: { icon: '‼', text: `Big: ${demo.enemy.intent}`, big: true },
      fallback: <EnemySprite enemyId={demo.enemy.enemyId} element="storm" size={120} />,
      targeted: opts.targeted, onTap: opts.onTarget, testid: `enemy-${demo.enemy.id}`,
    },
  ];
}

function RiderPlaceholder() {
  return (
    <svg viewBox="0 0 120 170" role="img" aria-label="Rider">
      <circle cx="60" cy="40" r="20" fill="#f1c7a0" stroke="#1d1a2b" stroke-width="4" />
      <rect x="40" y="62" width="40" height="64" rx="10" fill="#2f8f6f" stroke="#1d1a2b" stroke-width="4" />
      <rect x="44" y="124" width="12" height="40" rx="4" fill="#3d4a6b" /><rect x="64" y="124" width="12" height="40" rx="4" fill="#3d4a6b" />
    </svg>
  );
}

export function StageBar({ kind, value, max, label, numbers = true }: { kind: 'hp' | 'mp' | 'breath'; value: number; max: number; label: string; numbers?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div class={`sbar sbar--${kind}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <div class="sbar-fill" style={{ transform: `scaleX(${pct})` }} />
      <span class="sbar-text"><span>{label}</span>{numbers && <span>{Math.round(value)}/{max}</span>}</span>
    </div>
  );
}

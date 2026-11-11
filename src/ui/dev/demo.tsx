import { useEffect, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import type { ElementId } from '../../core/types';
import { DragonSprite, EnemySprite } from '../Sprites';
import { decodeAll, loadBackdrop, loadEffects, loadRig, rigUrls, type Backdrop, type Effects, type Rig } from '../stage/rigs';
import type { Place, StageFighter } from '../stage/Stage';
import { RiderPlaceholder } from '../stage/BattleStage';
export { StageBar } from '../stage/BattleStage';

const solo = layout.layouts.party.solo as Record<'dragon' | 'rider', Place>;
const duo = layout.layouts.party.duo as Record<'dragon' | 'dragon2' | 'rider', Place>;
const oneEnemy = layout.layouts.enemies.one[0] as Place;
const twoEnemies = layout.layouts.enemies.two as Place[];

export const demo = layout.demo;
const dragonElement = demo.dragon.element as ElementId;

export interface DemoArt {
  backdrop: Backdrop | null;
  rider: Rig | null;
  dragon: Rig | null;
  dragon2: Rig | null;
  enemy: Rig | null;
  effects: Effects;
}

/** Load and decode every image the demo fight needs before the stage shows. */
export function useDemoArt(): DemoArt | null {
  const [art, setArt] = useState<DemoArt | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const d2 = demo.dragon2;
      const [backdrop, rider, dragon, enemy, effects, dragon2] = await Promise.all([
        loadBackdrop(demo.zone),
        loadRig('rider', undefined, { weapon: 'sword' }),
        loadRig(`dragon.${demo.dragon.stage}`, { element: dragonElement, primary: demo.dragon.primary, secondary: demo.dragon.secondary }),
        loadRig(`enemy.${demo.enemy.enemyId}`),
        loadEffects(dragonElement),
        loadRig(`dragon.${d2.stage}`, { element: d2.element as ElementId, primary: d2.primary, secondary: d2.secondary }),
      ]);
      await decodeAll([
        ...(backdrop?.layers.map((l) => l.url) ?? []), ...rigUrls(rider), ...rigUrls(dragon), ...rigUrls(dragon2), ...rigUrls(enemy),
        effects.puff, effects.slash, effects.spark,
      ]);
      if (live) setArt({ backdrop, rider, dragon, dragon2, enemy, effects });
    })();
    return () => { live = false; };
  }, []);
  return art;
}

export interface DemoHp { rider: number; dragon: number; enemy: number }

/**
 * The demo fighters. busy = the worst case the game can show: two dragons,
 * the rider and two enemies (the bench uses it to check the node budget).
 */
export function demoFighters(art: DemoArt, hp: DemoHp, opts: { targeted?: boolean; onTarget?(): void; busy?: boolean } = {}): StageFighter[] {
  const party = opts.busy ? duo : solo;
  const d2 = demo.dragon2;
  const e2 = demo.enemy2;
  const extra: StageFighter[] = opts.busy ? [
    {
      id: 'dragon2', place: duo.dragon2, rig: art.dragon2, name: d2.name, hp: d2.hp, maxHp: d2.maxHp, facing: 'right',
      fallback: <DragonSprite element={d2.element as ElementId} stage={d2.stage} primary={d2.primary} secondary={d2.secondary} size={120} />,
    },
    {
      id: e2.id, place: twoEnemies[1]!, enemy: true, rig: art.enemy, name: 'Storm Roc', hp: e2.hp, maxHp: e2.maxHp, facing: 'left',
      intent: { icon: '‼', text: `Big: ${e2.intent}`, big: true }, fallback: <EnemySprite enemyId={e2.enemyId} element="storm" size={120} />,
    },
  ] : [];
  return [
    ...extra,
    {
      id: 'dragon', place: party.dragon, rig: art.dragon, name: demo.dragon.name, hp: hp.dragon, maxHp: demo.dragon.maxHp, facing: 'right', testid: 'stage-dragon',
      fallback: <DragonSprite element={dragonElement} stage={demo.dragon.stage} primary={demo.dragon.primary} secondary={demo.dragon.secondary} size={120} />,
    },
    {
      id: 'rider', place: party.rider, rig: art.rider, name: demo.rider.name, hp: hp.rider, maxHp: demo.rider.maxHp, facing: 'right', testid: 'stage-rider',
      fallback: <RiderPlaceholder />,
    },
    {
      id: demo.enemy.id, place: opts.busy ? twoEnemies[0]! : oneEnemy, enemy: true, rig: art.enemy, name: opts.busy ? 'Storm Roc' : `Storm Roc · Lv ${demo.enemy.level}`, hp: hp.enemy, maxHp: demo.enemy.maxHp, facing: 'left',
      intent: { icon: '‼', text: `Big: ${demo.enemy.intent}`, big: true },
      fallback: <EnemySprite enemyId={demo.enemy.enemyId} element="storm" size={120} />,
      targeted: opts.targeted, onTap: opts.onTarget, testid: `enemy-${demo.enemy.id}`,
    },
  ];
}

import { useEffect, useRef, useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import type { ElementId } from '../../core/types';
import spellFx from '../../data/spellFx.json';
import { prefersReducedMotion } from '../bits';
import { Stage } from '../stage/Stage';
import { cast, castStart, selfCast, type SpellLook } from '../stage/choreo';
import { orbLook, spellLook } from '../stage/director';
import { loadSpellFx } from '../stage/rigs';
import { demo, demoFighters, useDemoArt } from './demo';

const hp = { rider: demo.rider.hp, dragon: demo.dragon.hp, enemy: demo.enemy.hp };
const spells = data.combat.riderMoves.spells;

/**
 * Spell preview (#/dev/spells): the demo stage with a button per rider spell, a magic weapon orb per
 * tone, and each element's effect cast back by the enemy. Not wired to the engine.
 */
export function SpellSheet() {
  const base = useDemoArt();
  const [fx, setFx] = useState<Record<string, string> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fast, setFast] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadSpellFx(spells.map((s) => s.id), ['arcane', ...data.elements.ids]).then(setFx);
  }, []);
  if (!base || !fx) return <p class="screen">Loading…</p>;
  const art = { ...base, effects: { ...base.effects, spells: fx } };
  const opts = () => ({ fast, reduced: prefersReducedMotion() });

  const play = async (run: (stage: HTMLElement) => Promise<void>) => {
    const stage = stageRef.current;
    if (!stage || busy) return;
    setBusy(true);
    await run(stage);
    setBusy(false);
  };
  const atEnemy = (look: SpellLook, crit = false) => play((stage) =>
    cast(stage, { actor: 'rider', target: demo.enemy.id, text: crit ? '★-88' : '-42', kind: crit ? 'crit' : 'dmg' }, look, opts()));
  const atRider = (look: SpellLook) => play((stage) =>
    cast(stage, { actor: demo.enemy.id, target: 'rider', text: '-17', kind: 'dmg' }, look, opts()));
  const onParty = (look: SpellLook, target: string) => play(async (stage) => {
    await castStart(stage, 'rider', look.tone, opts());
    selfCast(stage, target, look, opts());
    await new Promise((r) => window.setTimeout(r, 700));
  });

  return (
    <section class="screen" data-testid="spell-sheet" data-busy={busy ? 'true' : 'false'}>
      <div class="stage-box">
        <Stage stageRef={stageRef} backdrop={art.backdrop} effects={art.effects} fighters={demoFighters(art, hp)} />
      </div>
      <label class="row"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.currentTarget.checked)} /> 2x speed</label>
      <h2>Rider spells</h2>
      <div class="chip-row">
        {spells.map((s) => {
          const look = spellLook(data, s.id);
          if (!look) return null;
          return (
            <button key={s.id} type="button" class="tab-pill" disabled={busy} data-testid={`cast-${s.id}`}
              onClick={() => (s.kind === 'damage' ? atEnemy(look) : onParty(look, s.kind === 'buff' ? 'dragon' : 'rider'))}>{s.name}</button>
          );
        })}
      </div>
      <h2>Magic weapon</h2>
      <div class="chip-row">
        {(['arcane', 'fire', 'tide', 'void'] as const).map((t) => (
          <button key={t} type="button" class="tab-pill" disabled={busy} data-testid={`orb-${t}`} onClick={() => atEnemy(orbLook(t === 'arcane' ? null : t))}>{t} orb</button>
        ))}
      </div>
      <h2>Enemy specials</h2>
      <div class="chip-row">
        {Object.entries(spellFx.elements).map(([el, id]) => {
          const look = spellLook(data, id);
          if (!look) return null;
          return (
            <button key={el} type="button" class="tab-pill" disabled={busy} data-testid={`enemy-${el}`}
              onClick={() => atRider({ style: look.style, art: look.art, size: look.size, tone: el as ElementId })}>{data.elements.info[el as ElementId].name}</button>
          );
        })}
      </div>
    </section>
  );
}

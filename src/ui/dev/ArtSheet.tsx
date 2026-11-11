import manifest from '../../art/assets.json';
import { gameData as data } from '../../core/data';
import type { ElementId } from '../../core/types';
import { EnemySprite } from '../Sprites';
import { RigView } from '../stage/Stage';
import { dragonFallback, Scene, useBackdrop, useDragonRig, useEggArt, useEnemyRig, useRiderRig } from '../stage/Scene';

/**
 * Art contact sheet (#/dev/art): every sprite at phone size, for review.
 * Enemies face left as they do on the stage. Missing art shows the old shape with a "placeholder" tag.
 */

const STAGES = ['hatchling', 'juvenile', 'adult', 'elder'];
const LOOKS: { element: ElementId; colors: { primary: string; secondary: string } }[] = [
  { element: 'fire', colors: { primary: '#e8603c', secondary: '#f2a541' } },
  { element: 'tide', colors: { primary: '#3f8fd8', secondary: '#7fc8f0' } },
  { element: 'verdant', colors: { primary: '#5fbf5a', secondary: '#e9e4da' } },
  { element: 'shadow', colors: { primary: '#7a5c9e', secondary: '#f5e27a' } },
];
const ELEMENTS = data.elements.ids as ElementId[];
const backdropKeys = Object.keys((manifest as unknown as { backdrops: Record<string, unknown> }).backdrops);

export function ArtSheet() {
  return (
    <div class="app">
      <main class="content art-sheet" data-testid="art-sheet">
        <header class="screen-header"><h1>Art sheet</h1><a class="button button--ghost" href="#/roost">Back</a></header>
        <h2>Dragons</h2>
        {LOOKS.map((l) => (
          <div key={l.element} class="art-row">
            {STAGES.map((stage) => <DragonCell key={stage} element={l.element} stage={stage} colors={l.colors} />)}
          </div>
        ))}
        <h2>Tail tips (Elder)</h2>
        <div class="art-row">{ELEMENTS.map((el) => <DragonCell key={el} element={el} stage="elder" colors={{ primary: '#a58c6a', secondary: '#e9e4da' }} label={data.elements.info[el].name} />)}</div>
        <h2>Rider</h2>
        <div class="art-row">{['sword', 'bow', 'staff'].map((w) => <RiderCell key={w} weapon={w} />)}</div>
        {data.zones.map((z) => (
          <section key={z.id}>
            <h2>{z.name}</h2>
            <div class="art-row">
              {[z.boss.enemy, z.miniBoss.enemy, ...new Set(z.encounters.flatMap((e) => e.enemies))].map((id) => <EnemyCell key={id} id={id} />)}
            </div>
          </section>
        ))}
        <h2>Eggs</h2>
        <div class="art-row">{ELEMENTS.map((el) => <EggCell key={el} element={el} />)}</div>
        <h2>Backdrops</h2>
        {backdropKeys.map((k) => <BackdropCell key={k} id={k} />)}
      </main>
    </div>
  );
}

function Cell({ label, placeholder, children }: { label: string; placeholder?: boolean; children: preact.ComponentChildren }) {
  return (
    <figure class="art-cell">
      <div class="art-box">{children}</div>
      <figcaption>{label}{placeholder && <span class="art-tag"> placeholder</span>}</figcaption>
    </figure>
  );
}

function DragonCell({ element, stage, colors, label }: { element: ElementId; stage: string; colors: { primary: string; secondary: string }; label?: string }) {
  const d = { element, stage, colors };
  const rig = useDragonRig(d);
  return <Cell label={label ?? `${stage}`} placeholder={!rig}>{rig ? <RigView rig={rig} facing="right" /> : dragonFallback(d)}</Cell>;
}

function RiderCell({ weapon }: { weapon: string }) {
  const rig = useRiderRig(weapon);
  return <Cell label={weapon}>{rig && <RigView rig={rig} facing="right" />}</Cell>;
}

function EnemyCell({ id }: { id: string }) {
  const rig = useEnemyRig(id);
  const e = data.enemies[id]!;
  return (
    <Cell label={e.name} placeholder={!rig}>
      {rig ? <RigView rig={rig} facing="left" /> : <EnemySprite enemyId={id} element={e.element} size={120} />}
    </Cell>
  );
}

function EggCell({ element }: { element: ElementId }) {
  const art = useEggArt(element);
  return (
    <Cell label={data.elements.info[element].name} placeholder={!art?.egg}>
      {art?.egg && <span class="egg-art art-egg"><img src={art.egg} alt="" /></span>}
    </Cell>
  );
}

function BackdropCell({ id }: { id: string }) {
  const bd = useBackdrop(id);
  return <figure class="art-wide"><Scene backdrop={bd} actors={[]} still /><figcaption>{id}</figcaption></figure>;
}

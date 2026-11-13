import { useEffect, useRef, useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { chooseEgg, eggReady, hatchEgg, warmEgg } from '../../core/game';
import type { SaveData } from '../../core/save';
import type { ElementId, VariantId } from '../../core/types';
import { elementLabel } from '../../core/eggs';
import { DragonSprite } from '../Sprites';
import { ElementBadge, prefersReducedMotion, vibrate } from '../bits';
import { href } from '../router';
import { RigView } from '../stage/Stage';
import { useDragonRig, useEggArt } from '../stage/Scene';

interface Props {
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
}

const DEFAULT_COLORS: Record<string, [string, string]> = {
  fire: ['#e8603c', '#f5e27a'],
  tide: ['#3f8fd8', '#e9e4da'],
  verdant: ['#5fbf5a', '#a58c6a'],
};

export function Hatch({ save, update }: Props) {
  if (!save.egg) return <PickEgg update={update} />;
  if (!eggReady(data, save)) return <WarmEgg save={save} update={update} />;
  return <NameDragon save={save} update={update} />;
}

function PickEgg({ update }: Pick<Props, 'update'>) {
  return (
    <section class="screen hatch" aria-labelledby="screen-title">
      <header class="screen-header screen-header--center">
        <h1 id="screen-title">Choose your egg</h1>
      </header>
      <p class="lead">Every dragon keeper starts with one egg. Pick the one that speaks to you. (Eggs can't talk. Yet.)</p>
      <div class="egg-list">
        {data.elements.starters.map((el) => {
          const egg = data.dragons.eggs[el];
          return (
            <button key={el} type="button" class="egg-card" data-testid={`egg-${el}`}
              onClick={() => update((s) => chooseEgg(data, s, el))}>
              <Egg element={el} size={72} />
              <span class="egg-card-text">
                <strong>{egg?.name}</strong>
                <ElementBadge element={el} small />
                <span class="muted">{egg?.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      <a class="button button--ghost button--block" href={href('settings')} data-testid="have-code">I have a save code</a>
    </section>
  );
}

/** The egg from the art manifest in its element's color, with cracks laid on top. Falls back to a plain shape. */
function Egg({ element, size, cracks = 0 }: { element: ElementId; size: number; cracks?: number }) {
  const art = useEggArt(element);
  if (art?.egg) {
    return (
      <span class="egg-art" style={{ width: size, height: size * 1.25 }} aria-hidden="true">
        <img src={art.egg} alt="" draggable={false} />
        {art.cracks.slice(0, Math.min(3, cracks)).map((u, i) => u && <img key={i} src={u} alt="" draggable={false} />)}
      </span>
    );
  }
  return <PlainEgg element={element} size={size} cracks={cracks} />;
}

function PlainEgg({ element, size, cracks = 0 }: { element: ElementId; size: number; cracks?: number }) {
  const c = data.elements.info[element].color;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden="true" class="egg-svg">
      <ellipse cx="50" cy="64" rx="38" ry="50" fill={c} stroke="#0004" stroke-width="3" />
      <ellipse cx="38" cy="44" rx="8" ry="12" fill="#fff5" />
      <circle cx="62" cy="80" r="6" fill="#0002" />
      <circle cx="40" cy="92" r="4" fill="#0002" />
      {cracks > 0 && <path d="M30 56 l8 8 l-6 6 l10 8" stroke="#1d1a2b" stroke-width="3" fill="none" />}
      {cracks > 1 && <path d="M70 48 l-6 10 l8 6 l-4 10" stroke="#1d1a2b" stroke-width="3" fill="none" />}
      {cracks > 2 && <path d="M44 24 l6 10 l-4 8 l8 6" stroke="#1d1a2b" stroke-width="3" fill="none" />}
    </svg>
  );
}

function WarmEgg({ save, update }: Props) {
  const egg = save.egg!;
  const ref = useRef<HTMLButtonElement>(null);
  const need = data.dragons.hatchTaps;
  const cracks = Math.floor((egg.warmth / need) * 4);
  const lines = ['It feels a little warmer.', 'Something shifted inside!', 'A tiny tap from within.', 'It is wobbling now!'];

  const tap = () => {
    update((s) => warmEgg(data, s));
    vibrate(15);
    if (!prefersReducedMotion()) {
      ref.current?.animate(
        [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }],
        { duration: 240, easing: 'ease-out' },
      );
    }
  };

  return (
    <section class="screen hatch" aria-labelledby="screen-title">
      <header class="screen-header screen-header--center">
        <h1 id="screen-title">Warm the egg</h1>
      </header>
      <p class="lead center">Tap the egg to keep it warm.</p>
      <div class="egg-stage">
        <button ref={ref} type="button" class="egg-button" onClick={tap} aria-label="Warm the egg" data-testid="warm-egg">
          <Egg element={egg.element} size={150} cracks={cracks} />
        </button>
      </div>
      <div class="warmth" aria-live="polite">
        <div class="warmth-bar"><div class="warmth-fill" style={{ width: `${(egg.warmth / need) * 100}%` }} /></div>
        <p class="center">{egg.warmth === 0 ? 'Cold, but cozy.' : lines[Math.min(lines.length - 1, cracks)]}</p>
      </div>
    </section>
  );
}

function NameDragon({ save, update }: Props) {
  const egg = save.egg!;
  const defaults = DEFAULT_COLORS[egg.element] ?? ['#888888', '#cccccc'];
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState(defaults[0]);
  const [secondary, setSecondary] = useState(defaults[1]);
  const [error, setError] = useState('');
  const suggestion = data.dragons.nameSuggestions[save.seed % data.dragons.nameSuggestions.length] ?? 'Pip';

  const hatch = (e: Event) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Your dragon needs a name. Even a silly one.');
      return;
    }
    vibrate([30, 40, 60]);
    update((s) => hatchEgg(data, s, trimmed, { primary, secondary }, Date.now()));
  };

  return (
    <form class="screen hatch" aria-labelledby="screen-title" onSubmit={hatch}>
      <header class="screen-header screen-header--center">
        <h1 id="screen-title">It's hatching!</h1>
      </header>
      <Hatching element={egg.element} element2={egg.element2} variant={egg.variant} breed={egg.breed} primary={primary} secondary={secondary} />
      {(egg.element2 || egg.variant || egg.breed !== 'dragon') && (
        <p class="notice notice--ok center" data-testid="hatch-special">
          {egg.variant ? `A rare ${data.dragons.variants.info[egg.variant].name} dragon! ${data.dragons.variants.info[egg.variant].blurb} ` : ''}
          {egg.breed !== 'dragon' ? `It's a ${data.dragons.breeds[egg.breed]?.name ?? egg.breed}! ${data.dragons.breeds[egg.breed]?.blurb ?? ''} ` : ''}
          {egg.element2 ? `It's a ${elementLabel(data.elements, egg)} hybrid: ${data.elements.info[egg.element].name} and ${data.elements.info[egg.element2].name}.` : ''}
        </p>
      )}
      <div class="card">
        <label for="dragon-name">Name your dragon</label>
        <div class="row">
          <input id="dragon-name" type="text" maxLength={data.dragons.nameMaxLength} autoComplete="off"
            placeholder={suggestion} value={name} onInput={(e) => { setName(e.currentTarget.value); setError(''); }}
            data-testid="dragon-name" />
          <button type="button" class="button button--ghost" onClick={() => setName(suggestion)}>Use {suggestion}</button>
        </div>
        {error && <p class="notice notice--error" role="alert">{error}</p>}
      </div>
      <div class="card">
        <ColorPicker label="Main color" value={primary} onPick={setPrimary} testid="primary" />
        <ColorPicker label="Accent color" value={secondary} onPick={setSecondary} testid="secondary" />
      </div>
      <button type="submit" class="button button--big" data-testid="hatch">Hatch {name.trim() || 'my dragon'}</button>
    </form>
  );
}

function ColorPicker({ label, value, onPick, testid }: { label: string; value: string; onPick(c: string): void; testid: string }) {
  return (
    <fieldset class="colors">
      <legend>{label}</legend>
      <div class="swatches">
        {data.dragons.palette.map((c, i) => (
          <button key={c} type="button" class={`swatch${c === value ? ' swatch--on' : ''}`} style={{ backgroundColor: c }}
            aria-label={`${label} ${i + 1}`} aria-pressed={c === value} onClick={() => onPick(c)} data-testid={`${testid}-${i}`}>
            {c === value ? '✓' : ''}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The moment of hatching: the egg's cap pops off, the hatchling springs out and
 * idles in the colors being picked. Only transform and opacity animate.
 */
function Hatching({ element, element2 = null, variant = null, breed = 'dragon', primary, secondary }: {
  element: ElementId; element2?: ElementId | null; variant?: VariantId | null; breed?: string; primary: string; secondary: string;
}) {
  const art = useEggArt(element);
  const rig = useDragonRig({ element, element2, variant, breed, stage: 'hatchling', colors: { primary, secondary } });
  const top = useRef<HTMLImageElement>(null);
  const bottom = useRef<HTMLImageElement>(null);
  const baby = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!art || done) return;
    if (prefersReducedMotion()) { setDone(true); return; }
    top.current?.animate(
      [{ transform: 'translate(0, 0) rotate(0)', opacity: 1 }, { transform: 'translate(10%, -60%) rotate(35deg)', opacity: 1, offset: 0.55 }, { transform: 'translate(30%, -20%) rotate(80deg)', opacity: 0 }],
      { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' },
    );
    bottom.current?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1500, delay: 250, fill: 'forwards' });
    const pop = baby.current?.animate(
      [{ transform: 'translateY(20%) scale(0.5)', opacity: 0 }, { transform: 'translateY(-8%) scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0) scale(1)', opacity: 1 }],
      { duration: 700, delay: 450, easing: 'ease-out', fill: 'backwards' },
    );
    pop?.finished.then(() => setDone(true)).catch(() => undefined);
  }, [!!art]);
  const dragon = rig
    ? <RigView rig={rig} facing="right" />
    : <DragonSprite element={element} element2={element2} variant={variant} stage="hatchling" primary={primary} secondary={secondary} size={150} />;
  return (
    <div class="hatch-preview hatch-scene" data-testid="hatch-scene">
      <div class="hatch-baby" ref={baby}>{dragon}</div>
      {art?.top && art.bottom && !done && (
        <>
          <img class="hatch-shell" ref={bottom} src={art.bottom} alt="" draggable={false} />
          <img class="hatch-shell" ref={top} src={art.top} alt="" draggable={false} />
        </>
      )}
    </div>
  );
}

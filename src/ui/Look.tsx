import { useState } from 'preact/hooks';
import { gameData as data } from '../core/data';
import type { LookPart, RiderLook } from '../core/types';
import { RigView } from './stage/Stage';
import { useRiderRig } from './stage/Scene';

/** The rider drawn in a look. `stance` is `sword`, `bow`, `staff` or `mounted`. */
export function RiderPreview({ look, stance = 'sword', height = 150 }: { look: RiderLook; stance?: string; height?: number }) {
  const rig = useRiderRig(stance, look);
  return (
    <div class="rider-preview" style={{ height: `${height}px` }} data-testid="rider-preview" data-look={Object.values(look).join('')} data-ready={rig ? 'true' : 'false'}>
      {rig && <RigView rig={rig} facing="right" />}
    </div>
  );
}

const sameLook = (a: RiderLook, b: RiderLook) => data.looks.parts.every((p) => a[p.id] === b[p.id]);

/**
 * Pick the rider's colors: six ready-made looks, a random one, and a swatch grid for one part at a time
 * (so the editor stays about a screen tall at 375 x 667).
 */
export function LookEditor({ look, stance, onChange, onRandom }: { look: RiderLook; stance?: string; onChange(look: RiderLook): void; onRandom(): void }) {
  const [part, setPart] = useState<LookPart>('hair');
  const def = data.looks.parts.find((p) => p.id === part)!;
  return (
    <div class="look-editor">
      <RiderPreview look={look} stance={stance} />
      <div class="look-presets" role="group" aria-label="Ready-made looks">
        {data.looks.presets.map((p) => (
          <button key={p.id} type="button" class={`look-preset${sameLook(p.look, look) ? ' look-preset--on' : ''}`} aria-pressed={sameLook(p.look, look)}
            onClick={() => onChange({ ...p.look })} data-testid={`look-preset-${p.id}`}>
            <span class="look-chips" aria-hidden="true">
              {(['hair', 'tunic', 'cape'] as const).map((k) => <span key={k} style={{ backgroundColor: p.look[k] }} />)}
            </span>
            {p.name}
          </button>
        ))}
        <button type="button" class="look-preset" onClick={onRandom} data-testid="look-random">Random</button>
      </div>
      <div class="look-parts" role="tablist" aria-label="Part to color">
        {data.looks.parts.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={part === p.id} class={`look-preset${part === p.id ? ' look-preset--on' : ''}`}
            onClick={() => setPart(p.id)} data-testid={`look-part-${p.id}`}>
            <span class="look-chips" aria-hidden="true"><span style={{ backgroundColor: look[p.id] }} /></span>
            {p.name}
          </button>
        ))}
      </div>
      <div class="swatches swatches--look" role="group" aria-label={`${def.name} color`}>
        {data.looks.swatches[def.swatches]!.map((c, i) => (
          <button key={c} type="button" class={`swatch${c === look[part] ? ' swatch--on' : ''}`} style={{ backgroundColor: c }}
            aria-label={`${def.name} color ${i + 1}`} aria-pressed={c === look[part]} onClick={() => onChange({ ...look, [part]: c })} data-testid={`look-swatch-${i}`}>
            {c === look[part] ? '✓' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

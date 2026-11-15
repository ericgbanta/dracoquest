/**
 * A run event between fights (VARIETY_PLAN V1): a short scene with one to
 * three choices, then what happened. The event and its result live in the
 * run, so a reload comes back to the same screen.
 */
import { gameData as data } from '../../core/data';
import { activeDragon, chooseEvent, dismissEvent, leaveRun, startFight } from '../../core/game';
import { getZone } from '../../core/run';
import { eventById, fillText, optionCost, type EventResult } from '../../core/runEvents';
import { eggName } from '../../core/eggs';
import type { SaveData } from '../../core/save';
import { rewardText } from '../bits';
import { Scene, useBackdrop } from '../stage/Scene';

interface Props { save: SaveData; update(fn: (s: SaveData) => SaveData): void; onExit(): void }

/** What a result did, as one short line. */
export function resultText(r: EventResult): string {
  const parts: string[] = [];
  const found = rewardText({ gold: r.gold, embers: r.embers, items: r.items, materials: r.materials });
  if (found) parts.push(found);
  if (r.cost) parts.push(`-${r.cost} gold`);
  if (r.heal) parts.push(r.heal >= 1 ? 'Fully healed' : `Healed ${Math.round(r.heal * 100)}%`);
  if (r.hpCost) parts.push(`-${Math.round(r.hpCost * 100)}% HP`);
  if (r.boon) parts.push(`${data.statuses[r.boon].name} next fight`);
  if (r.bond) parts.push(`+${r.bond} bond`);
  if (r.egg) parts.push(`A ${eggName(data, r.egg)}`);
  if (r.fight) parts.push(`An extra fight, ×${r.fight.bonus ?? 1} XP and gold`);
  return parts.join(', ');
}

export function EventScene({ save, update, onExit }: Props) {
  const run = save.run!;
  const ev = run.event!;
  const event = eventById(data, ev.id);
  const zone = getZone(data, run.zoneId);
  const backdrop = useBackdrop(zone.id);
  const names = { zone: zone.name, dragon: activeDragon(save)?.name ?? 'Your dragon', element: data.elements.info[zone.element].name };
  const fill = (t: string) => fillText(t, names);
  if (!event) return null;
  const next = run.fights[run.index];
  // Bosses and dialogue go through the interlude, like after a normal fight.
  const keepGoing = () => update((s) => (next && (next.kind === 'boss' || next.intro?.length) ? dismissEvent(s) : startFight(data, s)));
  const home = () => { update((s) => leaveRun(s)); onExit(); };
  const result = ev.result;
  const picked = event.options.find((o) => o.id === ev.chosen);
  return (
    <section class="screen run-event" aria-labelledby="event-title" data-testid="run-event" data-event={event.id}>
      <div class="run-event-banner">
        <Scene backdrop={backdrop} plainColor={data.elements.info[zone.element].color} still aspect="16 / 7" focus="center 70%" actors={[]}>
          <span class="run-event-icon" aria-hidden="true">{event.icon}</span>
        </Scene>
      </div>
      <h1 id="event-title">{event.name}</h1>
      <p class="lead">{fill(event.text)}</p>
      {!result ? (
        <div class="run-event-options">
          {event.options.map((o) => {
            const cost = optionCost(data, o, save.rider.level);
            const short = save.rider.gold < cost;
            return (
              <button key={o.id} type="button" class="button button--block run-event-option" disabled={short}
                onClick={() => update((s) => chooseEvent(data, s, o.id).save)} data-testid={`event-${o.id}`}>
                <span class="run-event-label">{o.label}{cost ? ` (${cost} gold)` : ''}</span>
                <span class="run-event-detail">{short ? `You have ${save.rider.gold} gold.` : fill(o.detail)}</span>
              </button>
            );
          })}
          <button type="button" class="button button--ghost button--block" onClick={home} data-testid="go-home">Head home</button>
        </div>
      ) : (
        <>
          <p class="notice notice--ok" data-testid="event-result">
            {picked && <strong>{picked.label}. </strong>}{fill(result.text)}
          </p>
          {resultText(result) && <p class="muted" data-testid="event-reward">{resultText(result)}</p>}
          <button type="button" class="button button--big button--block" onClick={keepGoing} data-testid="event-continue">
            {result.fight ? 'Fight!' : 'Keep going'}
          </button>
          <button type="button" class="button button--ghost button--block" onClick={home} data-testid="go-home">Head home</button>
        </>
      )}
    </section>
  );
}

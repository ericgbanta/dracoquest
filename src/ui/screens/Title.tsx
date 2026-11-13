import { useState } from 'preact/hooks';
import type { SaveData, SlotSummary } from '../../core/save';
import { useBackdrop } from '../stage/Scene';
import { DragonSprite } from '../Sprites';
import { Sheet } from '../Sheet';
import { GearIcon } from '../icons';

interface Props {
  /** The save in play, used to draw the lead dragon on the Continue card. */
  save: SaveData | null;
  slot: number;
  slots: SlotSummary[];
  /** Play a slot that already has a game in it (Continue and Load game). */
  onPlay(slot: number): void;
  /** Start a new game in a slot, replacing anything there. */
  onNewGame(slot: number): void;
  onSettings(): void;
}

type Started = Extract<SlotSummary, { state: 'ok' }>;

/** "Keeper, level 12" and "Blaze, Juvenile" for a saved game. */
function slotLines(s: Started): [string, string] {
  const dragon = s.dragon ? `${s.dragon.name}, ${s.dragon.stage}` : 'No dragon yet';
  const more = s.dragonCount > 1 ? ` and ${s.dragonCount - 1} more` : '';
  return [`${s.riderName}, level ${s.riderLevel}`, `${dragon}${more}`];
}

/** The main menu shown each time the game opens: Continue, New game, Load game, Settings. */
export function Title({ save, slot, slots, onPlay, onNewGame, onSettings }: Props) {
  const [sheet, setSheet] = useState<'load' | 'new' | null>(null);
  const art = useBackdrop('map-wilds');
  const bg = art?.layers[0]?.url;

  const started = slots.filter((s): s is Started => s.state === 'ok');
  // Continue picks up the slot in play (the one played last); if it holds no game, the newest other one.
  const last = started.find((s) => s.slot === slot)
    ?? started.reduce<Started | null>((best, s) => (!best || s.updatedAt > best.updatedAt ? s : best), null);
  const lead = last && last.slot === slot && save
    ? save.dragons.find((d) => d.id === save.activeDragonId) ?? save.dragons[0] ?? null
    : null;

  const newGame = () => {
    // The slot in play first if it is empty, then the first empty one; if all are used, ask which to replace.
    const empty = slots.find((s) => s.slot === slot && s.state === 'empty') ?? slots.find((s) => s.state === 'empty');
    if (empty) onNewGame(empty.slot);
    else setSheet('new');
  };

  const replace = (s: SlotSummary) => {
    const who = s.state === 'ok' ? `${s.riderName}'s game` : 'the save';
    if (!window.confirm(`Replace ${who} in slot ${s.slot} with a new game? It cannot be undone.`)) return;
    onNewGame(s.slot);
  };

  return (
    <div class="title" style={bg ? { backgroundImage: `url(${bg})` } : undefined} data-testid="title">
      <div class="title-inner">
        <header class="title-logo">
          <h1>DracoQuest</h1>
          <p>Hatch a dragon. Raise it. Ride it.</p>
        </header>

        <nav class="title-menu" aria-label="Main menu">
          {last && (
            <button type="button" class="button button--big title-continue" onClick={() => onPlay(last.slot)} data-testid="title-continue">
              {lead && (
                <DragonSprite element={lead.element} element2={lead.element2} variant={lead.variant} breed={lead.breed} stage={lead.stage}
                  primary={lead.colors.primary} secondary={lead.colors.secondary} size={52} />
              )}
              <span class="title-continue-text">
                <span>Continue</span>
                <small>{last.riderName}, level {last.riderLevel}{last.dragon ? ` · ${last.dragon.name}, ${last.dragon.stage}` : ''}</small>
              </span>
            </button>
          )}
          <button type="button" class={`button button--big${last ? ' button--ghost' : ''}`} onClick={newGame} data-testid="title-new">New game</button>
          <button type="button" class="button button--big button--ghost" onClick={() => setSheet('load')}
            disabled={slots.every((s) => s.state === 'empty')} data-testid="title-load">Load game</button>
          <button type="button" class="button button--big button--ghost title-settings" onClick={onSettings} data-testid="title-settings">
            <GearIcon size={20} /> Settings
          </button>
        </nav>
      </div>

      {sheet && (
        <Sheet title={sheet === 'load' ? 'Load game' : 'New game'} onClose={() => setSheet(null)}>
          {sheet === 'new' && <p class="muted">Every slot has a game in it. Pick one to replace.</p>}
          {slots.map((s) => (
            <TitleSlot key={s.slot} summary={s} mode={sheet}
              onPick={() => (sheet === 'load' ? onPlay(s.slot) : replace(s))} />
          ))}
        </Sheet>
      )}
    </div>
  );
}

function TitleSlot({ summary: s, mode, onPick }: { summary: SlotSummary; mode: 'load' | 'new'; onPick(): void }) {
  let title = `Slot ${s.slot}`;
  let detail = 'Empty';
  if (s.state === 'damaged') detail = 'This save cannot be read';
  if (s.state === 'ok') {
    const [who, dragon] = slotLines(s);
    title = who;
    detail = `Slot ${s.slot} · ${dragon}`;
  }
  const canPick = mode === 'new' || s.state !== 'empty';
  return (
    <div class="slot-row save-slot" data-testid={`title-slot-${s.slot}`}>
      <div>
        <strong>{title}</strong>
        <span class="muted">{detail}</span>
      </div>
      {canPick && (
        <button type="button" class={`button${mode === 'new' ? ' button--danger' : ''}`} onClick={onPick} data-testid={`title-pick-${s.slot}`}>
          {mode === 'new' ? 'Replace' : s.state === 'damaged' ? 'Open' : 'Play'}
        </button>
      )}
    </div>
  );
}

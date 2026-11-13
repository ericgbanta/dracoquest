import { useState } from 'preact/hooks';
import { exportSaveCode, importSaveCode, newSave, SaveError, type SaveData, type SlotSummary } from '../../core/save';
import { href, navigate } from '../router';
import { BackIcon, MenuIcon } from '../icons';
import { isIos, isStandalone } from '../install';
import { play } from '../sound';
import { Fold } from '../Fold';

interface Props {
  save: SaveData | null;
  persistent: boolean;
  update(change: (s: SaveData) => SaveData): void;
  replace(next: SaveData): void;
  slot: number;
  slots: SlotSummary[];
  switchSlot(slot: number): void;
  deleteSlot(slot: number): void;
  /** Set when Settings is opened from the main menu: the back arrow returns there. */
  onBack?(): void;
  /** Set from the main menu: called after Play on a saved game, to leave the menu. */
  onPlay?(): void;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export function Settings({ save, persistent, update, replace, slot, slots, switchSlot, deleteSlot, onBack, onPlay }: Props) {
  const [name, setName] = useState(save?.rider.name ?? '');
  const [exportCode, setExportCode] = useState('');
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const saveName = (e: Event) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return setNotice({ kind: 'error', text: 'Your name cannot be empty.' });
    update((s) => ({ ...s, rider: { ...s.rider, name: trimmed } }));
    setName(trimmed);
    setNotice({ kind: 'ok', text: 'Name saved.' });
  };

  // Selects the whole code. iPhones ignore select() on its own, so set the range too.
  const selectAll = (el: HTMLTextAreaElement) => {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ kind: 'ok', text: 'Save code copied. Keep it somewhere safe, like Notes.' });
    } catch {
      const box = document.querySelector<HTMLTextAreaElement>('[data-testid="export-code"]');
      if (box) selectAll(box);
      setNotice({ kind: 'ok', text: 'Could not copy by itself. The code is selected below: tap Copy, or use Share.' });
    }
  };

  const doExport = async () => {
    if (!save) return;
    const code = exportSaveCode(save);
    setExportCode(code);
    await copyCode(code);
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const shareCode = async () => {
    try {
      await navigator.share({ title: 'DracoQuest save code', text: exportCode });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // closed the share sheet
      setNotice({ kind: 'error', text: 'Could not open sharing. Use Copy instead.' });
    }
  };

  const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return setNotice({ kind: 'error', text: 'The clipboard is empty. Copy your save code first.' });
      setImportText(text);
      setNotice(null);
    } catch {
      setNotice({ kind: 'error', text: 'Could not read the clipboard. Long-press the box below and tap Paste.' });
    }
  };

  const doImport = (e: Event) => {
    e.preventDefault();
    try {
      const imported = importSaveCode(importText);
      replace(imported);
      setName(imported.rider.name);
      setImportText('');
      setExportCode('');
      setNotice({ kind: 'ok', text: `Save loaded. Welcome back, ${imported.rider.name}.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof SaveError ? err.message : 'Could not import that code.' });
    }
  };

  const playSlot = (n: number) => {
    switchSlot(n);
    if (onPlay) onPlay();
    else navigate('roost');
  };

  const doDelete = (n: number) => {
    const s = slots.find((x) => x.slot === n);
    const who = s?.state === 'ok' ? `${s.riderName}'s save` : 'this save';
    if (!window.confirm(`Delete ${who} in slot ${n}? It cannot be undone. Export a code first if you want to keep it.`)) return;
    try {
      deleteSlot(n);
      setNotice({ kind: 'ok', text: `Slot ${n} is empty now.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof SaveError ? err.message : 'Could not delete that save.' });
    }
  };

  const doReset = () => {
    if (!window.confirm(`Start over in slot ${slot}? This deletes the save in this slot. Your other slots are kept. Export a code first if you want to keep it.`)) return;
    const fresh = newSave(Date.now());
    replace(fresh);
    setName(fresh.rider.name);
    setExportCode('');
    setNotice({ kind: 'ok', text: 'New save started.' });
  };

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        {onBack ? (
          <button type="button" class="icon-button" onClick={onBack} aria-label="Back to the main menu" data-testid="settings-back"><BackIcon /></button>
        ) : (
          <a class="icon-button" href={href('roost')} aria-label="Back to Roost"><BackIcon /></a>
        )}
        <h1 id="screen-title">Settings</h1>
        {onBack ? <span class="icon-spacer" /> : (
          <a class="icon-button" href="#/title" aria-label="Main menu" data-testid="main-menu"><MenuIcon /></a>
        )}
      </header>

      {notice && (
        <p class={`notice notice--${notice.kind}`} role="status" data-testid="notice">{notice.text}</p>
      )}
      {!persistent && (
        <p class="notice notice--error">This browser is blocking storage, so progress will not be kept. Export a code before you leave.</p>
      )}

      <Fold id="settings.slots" title="Saved games" summary={`Slot ${slot} in play`} defaultOpen testid="save-slots">
        {slots.map((s) => (
          <SlotRow key={s.slot} summary={s} active={s.slot === slot} onPlay={() => playSlot(s.slot)} onDelete={() => doDelete(s.slot)} />
        ))}
        <p class="muted">Each slot is its own game, with its own dragons, gold and settings. Export and import below work on the slot in play.</p>
      </Fold>

      {save && (
        <Fold id="settings.rider" title="Rider" summary={save.rider.name}>
        <form onSubmit={saveName}>
          <label for="rider-name">Name</label>
          <div class="row">
            <input id="rider-name" type="text" maxLength={24} autoComplete="off" value={name}
              onInput={(e) => setName(e.currentTarget.value)} data-testid="rider-name" />
            <button type="submit" class="button" data-testid="save-name">Save</button>
          </div>
        </form>
        </Fold>
      )}

      {save && (
        <Fold id="settings.battle" title="Battle and sound" summary={[save.settings.fastBattles ? 'Fast' : '', save.settings.simpleBattle ? 'Simple' : '', save.settings.sound ? 'Sound on' : 'Sound off'].filter(Boolean).join(' · ')}>
          <label class="toggle">
            <input type="checkbox" checked={save.settings.fastBattles} data-testid="fast-battles"
              onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, fastBattles: e.currentTarget.checked } }))} />
            <span>Fast battles (2x animation speed)</span>
          </label>
          <label class="toggle">
            <input type="checkbox" checked={save.settings.simpleBattle} data-testid="simple-battle"
              onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, simpleBattle: e.currentTarget.checked } }))} />
            <span>Simple battle (cards instead of the battle stage)</span>
          </label>
          <label class="toggle">
            <input type="checkbox" checked={save.settings.sound} data-testid="sound"
              onChange={(e) => {
                const on = e.currentTarget.checked;
                update((s) => ({ ...s, settings: { ...s.settings, sound: on } }));
                play('tap', on);
              }} />
            <span>Sound effects</span>
          </label>
          <p class="muted">Animations follow your phone's reduce-motion setting.</p>
        </Fold>
      )}

      {!isStandalone() && (
        <Fold id="settings.install" title="Add to Home Screen" summary="Play full screen" testid="install-tip">
          {isIos() ? (
            <p>In Safari, tap the Share button, then <strong>Add to Home Screen</strong>. DracoQuest opens full screen, like an app.</p>
          ) : (
            <p>In Chrome, open the ⋮ menu and tap <strong>Add to Home screen</strong> or <strong>Install app</strong>. DracoQuest opens full screen, like an app.</p>
          )}
          <p class="muted">The Home Screen app keeps its own save on some phones (iPhones especially). Export a save code here first, then import it in the Home Screen app.</p>
        </Fold>
      )}

      <Fold id="settings.backup" title="Back up or move" summary="Save codes" forceOpen={!save}>
        <h3>Export a save code</h3>
        <p class="muted">Your progress lives in this browser. Clearing site data deletes it. Export a code to back it up or move it to another device.</p>
        <button type="button" class="button" onClick={doExport} disabled={!save} data-testid="export">Export save code</button>
        {exportCode && (
          <>
            <textarea class="code" readOnly rows={4} value={exportCode} aria-label="Your save code"
              onFocus={(e) => selectAll(e.currentTarget)} data-testid="export-code" />
            <div class="row">
              <button type="button" class="button" onClick={() => copyCode(exportCode)} data-testid="copy-code">Copy</button>
              {canShare && <button type="button" class="button" onClick={shareCode} data-testid="share-code">Share</button>}
            </div>
          </>
        )}
      <form onSubmit={doImport}>
        <h3>Import a save code</h3>
        <label for="import-code">Paste a save code</label>
        <textarea id="import-code" class="code" rows={4} value={importText}
          autocapitalize="off" autocomplete="off" spellcheck={false}
          onInput={(e) => setImportText(e.currentTarget.value)} data-testid="import-code" />
        <div class="row">
          {canPaste && <button type="button" class="button" onClick={pasteCode} data-testid="paste-code">Paste</button>}
          <button type="submit" class="button" disabled={!importText.trim()} data-testid="import">Import save code</button>
        </div>
        <p class="muted">Importing replaces the save in slot {slot}. Your other slots are kept.</p>
      </form>
      </Fold>

      <Fold id="settings.danger" title="Danger zone" summary="Start over">
        <button type="button" class="button button--danger" onClick={doReset} data-testid="reset">Start over in slot {slot}</button>
      </Fold>

      <p class="muted version">DracoQuest {save ? `· save v${save.version}` : ''}</p>
    </section>
  );
}

/** "today", "yesterday" or "5 days ago", from the device clock. */
function playedAgo(at: number, now: number): string {
  const days = Math.max(0, Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86_400_000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

interface SlotRowProps {
  summary: SlotSummary;
  active: boolean;
  onPlay(): void;
  onDelete(): void;
}

function SlotRow({ summary: s, active, onPlay, onDelete }: SlotRowProps) {
  let title: string;
  let detail: string;
  if (s.state === 'empty') {
    title = `Slot ${s.slot}`;
    detail = 'Empty';
  } else if (s.state === 'damaged') {
    title = `Slot ${s.slot}`;
    detail = 'This save cannot be read';
  } else {
    title = `${s.riderName}, level ${s.riderLevel}`;
    const dragon = s.dragon ? `${s.dragon.name}, ${s.dragon.stage}` : 'No dragon yet';
    const more = s.dragonCount > 1 ? ` and ${s.dragonCount - 1} more` : '';
    detail = `Slot ${s.slot} · ${dragon}${more} · played ${playedAgo(s.updatedAt, Date.now())}`;
  }
  return (
    <div class={`slot-row save-slot${active ? ' save-slot--active' : ''}`} data-testid={`slot-${s.slot}`}>
      <div>
        <strong>{title}</strong>
        <span class="muted">{detail}</span>
      </div>
      {active ? (
        <span class="save-slot-playing" data-testid={`slot-playing-${s.slot}`}>Playing</span>
      ) : (
        <>
          <button type="button" class="button" onClick={onPlay} data-testid={`slot-play-${s.slot}`}>
            {s.state === 'empty' ? 'New game' : 'Play'}
          </button>
          {s.state !== 'empty' && (
            <button type="button" class="button button--ghost" onClick={onDelete} aria-label={`Delete slot ${s.slot}`}
              data-testid={`slot-delete-${s.slot}`}>Delete</button>
          )}
        </>
      )}
    </div>
  );
}

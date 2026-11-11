import { useState } from 'preact/hooks';
import { exportSaveCode, importSaveCode, newSave, SaveError, type SaveData } from '../../core/save';
import { href } from '../router';
import { BackIcon } from '../icons';
import { isIos, isStandalone } from '../install';

interface Props {
  save: SaveData | null;
  persistent: boolean;
  update(change: (s: SaveData) => SaveData): void;
  replace(next: SaveData): void;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export function Settings({ save, persistent, update, replace }: Props) {
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

  const doExport = async () => {
    if (!save) return;
    const code = exportSaveCode(save);
    setExportCode(code);
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ kind: 'ok', text: 'Save code copied. Keep it somewhere safe.' });
    } catch {
      setNotice({ kind: 'ok', text: 'Save code is below. Select it and copy it.' });
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

  const doReset = () => {
    if (!window.confirm('Start over? This deletes your save on this device. Export a code first if you want to keep it.')) return;
    const fresh = newSave(Date.now());
    replace(fresh);
    setName(fresh.rider.name);
    setExportCode('');
    setNotice({ kind: 'ok', text: 'New save started.' });
  };

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <a class="icon-button" href={href('roost')} aria-label="Back to Roost"><BackIcon /></a>
        <h1 id="screen-title">Settings</h1>
        <span class="icon-spacer" />
      </header>

      {notice && (
        <p class={`notice notice--${notice.kind}`} role="status" data-testid="notice">{notice.text}</p>
      )}
      {!persistent && (
        <p class="notice notice--error">This browser is blocking storage, so progress will not be kept. Export a code before you leave.</p>
      )}

      {save && (
        <form class="card" onSubmit={saveName}>
          <h2>Rider</h2>
          <label for="rider-name">Name</label>
          <div class="row">
            <input id="rider-name" type="text" maxLength={24} autoComplete="off" value={name}
              onInput={(e) => setName(e.currentTarget.value)} data-testid="rider-name" />
            <button type="submit" class="button" data-testid="save-name">Save</button>
          </div>
        </form>
      )}

      {save && (
        <div class="card">
          <h2>Battle</h2>
          <label class="toggle">
            <input type="checkbox" checked={save.settings.fastBattles} data-testid="fast-battles"
              onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, fastBattles: e.currentTarget.checked } }))} />
            <span>Fast battles (2x animation speed)</span>
          </label>
        </div>
      )}

      {!isStandalone() && (
        <div class="card" data-testid="install-tip">
          <h2>Add to Home Screen</h2>
          {isIos() ? (
            <p>In Safari, tap the Share button, then <strong>Add to Home Screen</strong>. DracoQuest opens full screen, like an app.</p>
          ) : (
            <p>In Chrome, open the ⋮ menu and tap <strong>Add to Home screen</strong> or <strong>Install app</strong>. DracoQuest opens full screen, like an app.</p>
          )}
          <p class="muted">The Home Screen app keeps its own save on some phones (iPhones especially). Export a save code here first, then import it in the Home Screen app.</p>
        </div>
      )}

      <div class="card">
        <h2>Save code</h2>
        <p class="muted">Your progress lives in this browser. Clearing site data deletes it. Export a code to back it up or move it to another device.</p>
        <button type="button" class="button" onClick={doExport} disabled={!save} data-testid="export">Export save code</button>
        {exportCode && (
          <textarea class="code" readOnly rows={4} value={exportCode} aria-label="Your save code"
            onFocus={(e) => e.currentTarget.select()} data-testid="export-code" />
        )}
      </div>

      <form class="card" onSubmit={doImport}>
        <h2>Import</h2>
        <label for="import-code">Paste a save code</label>
        <textarea id="import-code" class="code" rows={4} value={importText}
          onInput={(e) => setImportText(e.currentTarget.value)} data-testid="import-code" />
        <button type="submit" class="button" disabled={!importText.trim()} data-testid="import">Import save code</button>
        <p class="muted">Importing replaces the save on this device.</p>
      </form>

      <div class="card">
        <h2>Danger zone</h2>
        <button type="button" class="button button--danger" onClick={doReset}>Start a new save</button>
      </div>

      <p class="muted version">DracoQuest {save ? `· save v${save.version}` : ''}</p>
    </section>
  );
}

import { useEffect, useState } from 'preact/hooks';
import { useDevPage, useRoute } from './router';
import { useSave } from './useSave';
import { TabBar } from './TabBar';
import { Roost } from './screens/Roost';
import { Settings } from './screens/Settings';
import { Hatch } from './screens/Hatch';
import { MapScreen } from './screens/Map';
import { Dragons } from './screens/Dragons';
import { Bag } from './screens/Bag';
import { Battle } from './screens/Battle';
import { Town } from './screens/Town';
import { Title } from './screens/Title';
import { applyUpdate, dismissOfflineReady, usePwa } from './pwa';

export function App() {
  const route = useRoute();
  const saveApi = useSave();
  const { save, loadError, update, slot, switchSlot, startNewGame } = saveApi;
  const pwa = usePwa();
  const devPage = useDevPage();
  // The battle screen stays open after the run ends so the results can show.
  const [battleOpen, setBattleOpen] = useState(!!save?.run);
  useEffect(() => {
    if (save?.run) setBattleOpen(true);
  }, [!!save?.run]);
  // A different saved game starts on its own screen: its battle if it has a run, else the Roost.
  useEffect(() => setBattleOpen(!!save?.run), [slot]);

  // The main menu opens each time the game starts, and from Settings (#/title).
  const [menu, setMenu] = useState<'main' | 'settings' | null>('main');
  useEffect(() => {
    if (route === 'title') setMenu('main');
  }, [route]);
  // Continuing the same game keeps the screen in the URL (a reload lands back where it was);
  // anything else starts at the Roost.
  const leaveMenu = (keepScreen = false) => {
    setMenu(null);
    if (!keepScreen || route === 'title') window.location.hash = '#/roost';
  };

  // Hidden dev pages (mock battle, bench) work with or without a save.
  if (devPage) return <DevLoader page={devPage} />;

  if (menu === 'settings') {
    return (
      <div class="app">
        <main class="content content--menu" key={`menu-settings-${slot}`}>
          <Settings {...saveApi} onBack={() => setMenu('main')} onPlay={() => leaveMenu()} />
        </main>
      </div>
    );
  }

  if (menu === 'main') {
    return (
      <div class="app app--title">
        <Title save={save} slot={slot} slots={saveApi.slots}
          onPlay={(n) => { if (n !== slot) switchSlot(n); leaveMenu(n === slot); }}
          onNewGame={(n) => { startNewGame(n); leaveMenu(); }}
          onSettings={() => setMenu('settings')} />
      </div>
    );
  }

  if (!save) {
    // The stored save is damaged. Never overwrite it silently: offer import or a fresh start.
    return (
      <div class="app">
        <main class="content">
          <p class="notice notice--error" role="alert">
            Your save could not be read ({loadError}). Import a save code below, or start a new save.
          </p>
          <Settings key={`settings-${slot}`} {...saveApi} />
        </main>
      </div>
    );
  }

  const settings = <Settings key={`settings-${slot}`} {...saveApi} />;

  // First session (pick, warm, and hatch an egg), or naming a hatchling from the Hatchery.
  if (save.dragons.length === 0 || (save.egg && !save.run)) {
    return (
      <div class="app">
        <main class="content" key={`${slot}-${route === 'settings' ? 'settings' : 'hatch'}`}>
          {route === 'settings' ? settings : <Hatch save={save} update={update} />}
        </main>
      </div>
    );
  }

  if (battleOpen) {
    return (
      <div class="app app--battle">
        <main class="content content--battle" key={slot}>
          <Battle save={save} update={update} onExit={() => { setBattleOpen(false); window.location.hash = '#/roost'; }} />
        </main>
      </div>
    );
  }

  let body;
  if (route === 'settings') body = settings;
  else if (route === 'map') body = <MapScreen save={save} update={update} />;
  else if (route === 'dragons') body = <Dragons save={save} update={update} />;
  else if (route === 'bag') body = <Bag save={save} update={update} />;
  else if (route === 'town') body = <Town save={save} update={update} />;
  else body = <Roost save={save} update={update} />;

  return (
    <div class="app">
      {pwa.needRefresh && (
        <div class="update-bar" role="status">
          <span>A new version of DracoQuest is ready.</span>
          <button type="button" class="button" onClick={applyUpdate} data-testid="apply-update">Reload</button>
        </div>
      )}
      {pwa.offlineReady && !pwa.needRefresh && (
        <div class="update-bar" role="status">
          <span>DracoQuest now works offline.</span>
          <button type="button" class="button button--ghost" onClick={dismissOfflineReady}>OK</button>
        </div>
      )}
      <main class="content" key={`${slot}-${route}`}>{body}</main>
      <TabBar current={route} />
    </div>
  );
}

type DevModule = typeof import('./dev/Dev');

/** Loads the dev pages on demand, so they never add to the game's first load. */
function DevLoader({ page }: { page: string }) {
  const [mod, setMod] = useState<DevModule | null>(null);
  useEffect(() => {
    let live = true;
    import('./dev/Dev').then((m) => { if (live) setMod(m); });
    return () => { live = false; };
  }, []);
  if (!mod) return <div class="app"><main class="content"><p class="placeholder">Loading…</p></main></div>;
  return <mod.Dev page={page} />;
}

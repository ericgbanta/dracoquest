import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './router';
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
import { applyUpdate, dismissOfflineReady, usePwa } from './pwa';

export function App() {
  const route = useRoute();
  const { save, loadError, persistent, update, replace } = useSave();
  const pwa = usePwa();
  // The battle screen stays open after the run ends so the results can show.
  const [battleOpen, setBattleOpen] = useState(!!save?.run);
  useEffect(() => {
    if (save?.run) setBattleOpen(true);
  }, [!!save?.run]);

  if (!save) {
    // The stored save is damaged. Never overwrite it silently: offer import or a fresh start.
    return (
      <div class="app">
        <main class="content">
          <p class="notice notice--error" role="alert">
            Your save could not be read ({loadError}). Import a save code below, or start a new save.
          </p>
          <Settings save={null} persistent={persistent} update={update} replace={replace} />
        </main>
      </div>
    );
  }

  const settings = <Settings save={save} persistent={persistent} update={update} replace={replace} />;

  // First session (pick, warm, and hatch an egg), or naming a hatchling from the Hatchery.
  if (save.dragons.length === 0 || (save.egg && !save.run)) {
    return (
      <div class="app">
        <main class="content" key={route === 'settings' ? 'settings' : 'hatch'}>
          {route === 'settings' ? settings : <Hatch save={save} update={update} />}
        </main>
      </div>
    );
  }

  if (battleOpen) {
    return (
      <div class="app app--battle">
        <main class="content content--battle">
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
      <main class="content" key={route}>{body}</main>
      <TabBar current={route} />
    </div>
  );
}

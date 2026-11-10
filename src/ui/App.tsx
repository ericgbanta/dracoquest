import { useRoute } from './router';
import { useSave } from './useSave';
import { TabBar } from './TabBar';
import { Roost } from './screens/Roost';
import { Settings } from './screens/Settings';
import { Placeholder } from './screens/Placeholder';

export function App() {
  const route = useRoute();
  const { save, loadError, persistent, update, replace } = useSave();

  let body;
  if (!save) {
    // The stored save is damaged. Never overwrite it silently: offer import or a fresh start in Settings.
    body = (
      <>
        <p class="notice notice--error" role="alert">
          Your save could not be read ({loadError}). Import a save code below, or start a new save.
        </p>
        <Settings save={null} persistent={persistent} update={update} replace={replace} />
      </>
    );
  } else if (route === 'settings') {
    body = <Settings save={save} persistent={persistent} update={update} replace={replace} />;
  } else if (route === 'map') {
    body = <Placeholder title="Map" note="Mossy Hollow is still overgrown. Zones open in Phase 1." />;
  } else if (route === 'dragons') {
    body = <Placeholder title="Dragons" note="No dragons yet. Your first egg is on its way." />;
  } else if (route === 'bag') {
    body = <Placeholder title="Bag" note="Your bag is empty. Even the lint left." />;
  } else {
    body = <Roost save={save} />;
  }

  return (
    <div class="app">
      <main class="content" key={route}>{body}</main>
      <TabBar current={route} />
    </div>
  );
}

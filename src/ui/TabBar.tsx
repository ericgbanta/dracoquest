import type { FunctionComponent } from 'preact';
import { href, type Route } from './router';
import { BagIcon, DragonIcon, MapIcon, RoostIcon } from './icons';

const TABS: { route: Route; label: string; Icon: FunctionComponent<{ size?: number }> }[] = [
  { route: 'roost', label: 'Roost', Icon: RoostIcon },
  { route: 'map', label: 'Map', Icon: MapIcon },
  { route: 'dragons', label: 'Dragons', Icon: DragonIcon },
  { route: 'bag', label: 'Bag', Icon: BagIcon },
];

export function TabBar({ current }: { current: Route }) {
  return (
    <nav class="tabbar" aria-label="Main">
      {TABS.map(({ route, label, Icon }) => {
        const active = current === route || (current === 'settings' && route === 'roost');
        return (
          <a key={route} class={`tab${active ? ' tab--active' : ''}`} href={href(route)}
            aria-current={current === route ? 'page' : undefined} data-testid={`tab-${route}`}>
            <Icon />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}

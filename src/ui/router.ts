import { useEffect, useState } from 'preact/hooks';

export const ROUTES = ['roost', 'map', 'dragons', 'bag', 'settings', 'town'] as const;
export type Route = (typeof ROUTES)[number];

export function parseHash(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split('/')[0] ?? '';
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'roost';
}

export function href(route: Route): string {
  return `#/${route}`;
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

/** Current route from the URL hash. Unknown hashes fall back to the Roost. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Hidden developer pages (#/dev/mock, #/dev/bench). Null for every other hash. */
export function parseDevPage(hash: string): string | null {
  const m = /^#\/?dev\/([a-z]+)/.exec(hash);
  return m ? m[1]! : null;
}

export function useDevPage(): string | null {
  const [page, setPage] = useState<string | null>(() => parseDevPage(window.location.hash));
  useEffect(() => {
    const onChange = () => setPage(parseDevPage(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return page;
}

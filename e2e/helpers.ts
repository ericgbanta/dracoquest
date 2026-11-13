import type { Page } from '@playwright/test';

/** Open a fold (a collapsible card) by its id, if it isn't open already. */
export async function openFold(page: Page, id: string): Promise<void> {
  const head = page.getByTestId(`fold-${id}`);
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.tap();
}

/** Pick a sub-tab, e.g. tab(page, 'bag', 'spells'). */
export async function tab(page: Page, group: string, id: string): Promise<void> {
  await page.getByTestId(`${group}-tab-${id}`).tap();
}

/** Switch the Map tab between the painted map (the default) and the list of areas. */
export async function mapView(page: Page, view: 'map' | 'list'): Promise<void> {
  const button = page.getByTestId(`map-view-${view}`);
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.tap();
}

/** Cycle the Map to a region by its name (the Map opens on the region at the rider's level). */
export async function mapRegion(page: Page, name: string): Promise<void> {
  const label = page.getByTestId('map-region-name');
  while ((await label.textContent()) !== name) {
    if (await page.getByTestId('map-prev').isEnabled()) await page.getByTestId('map-prev').tap();
    else break;
  }
  while ((await label.textContent()) !== name) await page.getByTestId('map-next').tap();
}

/** Get past the main menu, which opens on every page load: Continue if there is a game, else New game. */
export async function enter(page: Page): Promise<void> {
  await page.getByTestId('title').waitFor();
  const cont = page.getByTestId('title-continue');
  if (await cont.count()) await cont.tap();
  else await page.getByTestId('title-new').tap();
  await page.getByTestId('title').waitFor({ state: 'detached' });
}

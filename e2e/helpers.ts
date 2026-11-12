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

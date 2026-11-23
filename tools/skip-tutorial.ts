import type { Page } from '@playwright/test';
import pl from '../i18n/pl.json' with { type: 'json' };

export async function waitForMainMenu(page: Page) {
  const menu = page.locator('canvas[data-scene="MainMenu"]');
  const skip = page.getByRole('button', {
    name: pl.tutorial.skip,
    exact: true,
  });
  await menu.or(skip).waitFor();
  if (await skip.isVisible()) await skip.click();
  await menu.waitFor();
}

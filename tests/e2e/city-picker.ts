import type { Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { PlayableCity } from '../../src/content/missions';

export function cityPin(page: Page, city: PlayableCity) {
  return page.getByRole('button', { name: pl.cityPicker[city], exact: true });
}

export async function chooseCity(
  page: Page,
  city: PlayableCity,
  mode: 'campaign' | 'freeRide' = 'freeRide',
) {
  await page
    .getByRole('button', { name: pl.cityPicker[mode], exact: true })
    .click();
  await cityPin(page, city).click();
  await page.locator('canvas[data-scene="City"]').waitFor();
}

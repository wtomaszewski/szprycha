import { expect, test, type Locator, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../../src/core/progressStore';
import { profile } from './helpers/profile';

async function openNearSignals(page: Page) {
  await page.addInitScript(
    (key) => localStorage.setItem(key, JSON.stringify({ completed: [] })),
    legacyProgressKey,
  );
  await page.route('**/maps/miasteczko.tmj', async (route) => {
    const response = await route.fetch();
    const map = await response.json();
    const player = map.layers
      .find(({ name }: { name: string }) => name === 'spawns')
      .objects.find(({ name }: { name: string }) => name === 'player');
    player.x = 2170;
    player.y = 637;
    await route.fulfill({ response, json: map });
  });
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  return canvas;
}

async function litDigitPixels(canvas: Locator) {
  const { data } = PNG.sync.read(await canvas.screenshot());
  let pixels = 0;
  // The neutral display ink is drawn on the game canvas, beside the lamps.
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 0xff && data[i + 1] === 0xf1 && data[i + 2] === 0xce)
      pixels++;
  }
  return pixels;
}

test('draws countdowns by default, and saves the switch across rides and reloads', async ({
  page,
}) => {
  const canvas = await openNearSignals(page);
  const settings = page.getByRole('dialog', { name: pl.settings.title });
  const toggle = page.getByRole('checkbox', {
    name: pl.settings.signalCountdowns,
  });
  await page
    .getByRole('button', { name: pl.settings.title, exact: true })
    .click();
  await expect(
    settings.getByRole('checkbox', { name: pl.settings.signalCountdowns }),
  ).toBeChecked();
  await settings.getByRole('button', { name: pl.m5c.close }).click();

  await page
    .getByRole('button', { name: pl.driving.title, exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-x', '2170');
  await expect.poll(() => litDigitPixels(canvas)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await page.getByText(pl.settings.accessibility, { exact: true }).click();
  await toggle.uncheck();
  await page.getByRole('button', { name: pl.driving.resume }).click();
  await expect.poll(() => litDigitPixels(canvas)).toBe(0);
  await expect
    .poll(async () => (await profile(page)).signalCountdowns)
    .toBe(false);

  await page.reload();
  await page
    .getByRole('button', { name: pl.settings.title, exact: true })
    .click();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await settings.getByRole('button', { name: pl.m5c.close }).click();
  await page.getByRole('button', { name: pl.m5c.album, exact: true }).click();
  const album = page.getByRole('dialog', { name: pl.m5c.album });
  await expect(album.getByText(pl.m5c.signalCountdownHint)).toBeVisible();
  await album.getByRole('button', { name: pl.m5c.close }).click();
  await page
    .getByRole('button', { name: pl.driving.title, exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-x', '2170');
  await expect.poll(() => litDigitPixels(canvas)).toBeGreaterThan(0);
});

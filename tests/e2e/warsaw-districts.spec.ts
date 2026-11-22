import { expect, test } from '@playwright/test';
import { chooseCity } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };

const views = [
  { district: 'srodmiescie', x: 3715, y: 1808, heading: 0, axis: 'x' },
  {
    district: 'powisle',
    x: 3000,
    y: 2240,
    heading: Math.PI / 2,
    axis: 'y',
    dusk: true,
  },
  { district: 'mokotow', x: 3664, y: 2912, heading: 0, axis: 'x' },
  {
    district: 'mokotow-kolej',
    x: 3420,
    y: 3100,
    heading: Math.PI / 2,
    axis: 'y',
  },
] as const;

for (const view of views)
  test(`rides in ${view.district} and captures its scenery`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const dusk = 'dusk' in view;
    await page.route(/\/warszawa(?:-[^/]+)?\.tmj(?:\?|$)/, async (route) => {
      if (route.request().resourceType() === 'script') return route.continue();
      const response = await route.fetch();
      const tiled = await response.json();
      const player = tiled.layers
        .find(({ name }: { name: string }) => name === 'spawns')
        .objects.find(({ name }: { name: string }) => name === 'player');
      player.x = view.x;
      player.y = view.y;
      player.properties.find(
        ({ name }: { name: string }) => name === 'heading',
      ).value = view.heading;
      if (dusk)
        tiled.properties.find(
          ({ name }: { name: string }) => name === 'dusk_at_s',
        ).value = 1;
      await route.fulfill({ response, json: tiled });
    });

    await page.goto('/');
    await chooseCity(page, 'warszawa');
    const canvas = page.locator('canvas[data-map="warszawa"]');
    await expect(canvas).toHaveAttribute('data-lighting', 'day');
    if (dusk) {
      await page.keyboard.press('KeyL');
      await expect(canvas).toHaveAttribute('data-lighting', 'night');
      await expect(
        page.getByRole('img', { name: pl.rideHud.lightsOn }),
      ).toBeVisible();
    }
    const screenshot = info.outputPath(`m6a-${view.district}.png`);
    await page.screenshot({ path: screenshot });
    await info.attach(view.district, {
      path: screenshot,
      contentType: 'image/png',
    });
    try {
      await page.keyboard.down('ArrowUp');
      await expect
        .poll(
          async () =>
            Number(await canvas.getAttribute(`data-${view.axis}`)) -
            view[view.axis],
        )
        .toBeGreaterThan(24);
    } finally {
      await page.keyboard.up('ArrowUp');
    }
    expect(errors).toEqual([]);
  });

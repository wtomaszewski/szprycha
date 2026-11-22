import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

async function openWroclaw(page: Page) {
  await page.goto('/');
  const menu = page.getByText(pl.driving.developer, { exact: true });
  await menu.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: pl.driving.wroclaw }).click();
  const canvas = page.locator('canvas[data-map="wroclaw"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.wroclawTitle);
  return canvas;
}

test('opens Wrocław from the developer menu and saves collected gnomes', async ({
  page,
}) => {
  await openWroclaw(page);
  const collection = page.getByRole('status', { name: pl.driving.gnomes });
  await expect(collection).toHaveText('Krasnale 0/100');
  await page.keyboard.press('KeyX');
  try {
    await page.keyboard.down('ArrowUp');
    await expect(collection).toHaveText('Krasnale 1/100');
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.menu, exact: true })
    .click();
  await expect(page.locator('canvas[data-scene="MainMenu"]')).toBeVisible();
  await openWroclaw(page);
  await expect(collection).toHaveText('Krasnale 1/100');
});

const views = [
  { name: 'rynek', x: 2992, y: 2016, heading: 0 },
  { name: 'ostrow', x: 2736, y: 1352, heading: 0, night: true },
  { name: 'hala', x: 4808, y: 532, heading: 0 },
  { name: 'zoo', x: 4938, y: 2464, heading: 0 },
  { name: 'poludnie', x: 3518, y: 2868, heading: 0 },
  { name: 'sky-tower', x: 2550, y: 3140, heading: Math.PI },
  { name: 'zachod', x: 688, y: 722, heading: Math.PI },
  { name: 'bulwary', x: 2624, y: 1536, heading: -Math.PI / 2 },
] as const;

for (const view of views)
  test(`renders Wrocław — ${view.name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const night = 'night' in view;
    await page.route(/\/wroclaw(?:-[^/]+)?\.tmj(?:\?|$)/, async (route) => {
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
      if (night)
        tiled.properties.find(
          ({ name }: { name: string }) => name === 'dusk_at_s',
        ).value = 1;
      await route.fulfill({ response, json: tiled });
    });
    const canvas = await openWroclaw(page);
    await expect(canvas).toHaveAttribute('data-x', String(view.x));
    await expect(canvas).toHaveAttribute('data-y', String(view.y));
    if (night) {
      await page.keyboard.press('KeyL');
      await expect(canvas).toHaveAttribute('data-lighting', 'night');
      await expect(
        page.getByRole('img', { name: pl.rideHud.lightsOn }),
      ).toBeVisible();
    }
    const screenshot = info.outputPath(`m6c-${view.name}.png`);
    await page.screenshot({ path: screenshot });
    await info.attach(view.name, {
      path: screenshot,
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });

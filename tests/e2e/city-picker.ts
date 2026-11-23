import { expect, type Page } from '@playwright/test';
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

export async function startAt(
  page: Page,
  city: PlayableCity,
  x: number,
  y: number,
  heading = 0,
) {
  await page.route(
    new RegExp(`/${city}(?:-[^/]+)?\\.tmj(?:\\?|$)`),
    async (route) => {
      if (route.request().resourceType() === 'script') return route.continue();
      const response = await route.fetch();
      const tiled = await response.json();
      const player = tiled.layers.find(
        ({ name }: { name: string }) => name === 'spawns',
      ).objects[0];
      Object.assign(player, { x, y });
      player.properties.find(
        ({ name }: { name: string }) => name === 'heading',
      ).value = heading;
      await route.fulfill({ response, json: tiled });
    },
  );
}

export async function driveTo(
  page: Page,
  key: string,
  axis: 'x' | 'y',
  target: number,
  increase: boolean,
) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ axis, target, increase }) => {
        const pos = Number(document.querySelector('canvas')?.dataset[axis]);
        return increase ? pos >= target : pos <= target;
      },
      { axis, target, increase },
    );
  } finally {
    await page.keyboard.up(key);
  }
  await stopRider(page);
}

export async function stopRider(page: Page) {
  await page.keyboard.down('Space');
  try {
    await expect(page.locator('canvas[data-scene="City"]')).toHaveAttribute(
      'data-speed',
      '0',
    );
  } finally {
    await page.keyboard.up('Space');
  }
}

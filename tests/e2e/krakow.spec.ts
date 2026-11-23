import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../../src/core/progressStore';
import { chooseCity, cityPin } from './city-picker';
import { readProfile } from './progress-profile';

async function startAt(page: Page, x: number, y: number, heading: number) {
  await page.route(/\/krakow(?:-[^/]+)?\.tmj(?:\?|$)/, async (route) => {
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
  });
}

async function driveTo(
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
  await page.keyboard.down('Space');
  try {
    await expect(page.locator('canvas')).toHaveAttribute('data-speed', '0');
  } finally {
    await page.keyboard.up('Space');
  }
}

test('opens Kraków only in free ride and saves district progression', async ({
  page,
}, info) => {
  test.setTimeout(100_000);
  await startAt(page, 1730, 1270, Math.PI / 2);
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: `${pl.cityPicker.krakow} ${pl.cityPicker.soon}`,
    }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'krakow');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('105-mapa-polski.png') });
  await pin.click();
  const canvas = page.locator('canvas[data-map="krakow"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.krakowTitle);
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByText(pl.driving.districtLocked, { exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const option = (id: 'KRA-B-01' | 'KRA-B-02') =>
    page.getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
    });
  await page.keyboard.press('KeyM');
  await expect(option('KRA-B-02')).toHaveCount(0);
  await option('KRA-B-01').click();
  await expect(canvas).toHaveAttribute('data-mission', 'KRA-B-01');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await page.keyboard.press('KeyL');
  await expect(
    page.getByText(pl.misje['KRA-B-01'].deptak, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 638, false);
  await driveTo(page, 'ArrowRight', 'x', 1633, true);
  await expect(
    page.getByText(pl.misje['KRA-B-01'].meta, { exact: true }),
  ).toBeVisible();
  await driveTo(page, 'ArrowDown', 'y', 770, true);
  await page.keyboard.down('ArrowRight');
  try {
    await expect(
      page.getByText(pl.driving.districtsOpened, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('KRA-B-01');

  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-x', '1730');
  await driveTo(page, 'ArrowUp', 'y', 1326, true);
  await page.keyboard.press('KeyM');
  await expect(option('KRA-B-02')).toBeVisible();
});

const views = [
  ['rynek', 1710, 614],
  ['wawel', 1708, 1636, -Math.PI / 2],
  ['kazimierz', 3280, 1472],
  ['bulwary', 2950, 2176],
  ['kopiec', 3216, 2862],
  ['tramwaj', 2520, 720],
] as const;

for (const [name, x, y, heading = 0] of views)
  test(`renders Kraków — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key }) =>
        localStorage.setItem(
          key,
          JSON.stringify({ completed: ['KRA-B-01', 'KRA-B-02', 'KRA-B-03'] }),
        ),
      { key: legacyProgressKey },
    );
    if (name === 'tramwaj') await page.clock.install();
    await startAt(page, x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'krakow');
    const canvas = page.locator('canvas[data-map="krakow"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    // The tram reaches the stop about seven seconds into the ride.
    if (name === 'tramwaj') await page.clock.runFor(8000);
    const path = info.outputPath(`105-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    if (name === 'wawel') {
      await page.keyboard.down('ArrowUp');
      try {
        await expect(
          page.getByText(pl.driving.collision, { exact: true }),
        ).toBeVisible();
        await expect(canvas).toHaveAttribute('data-speed', '0');
      } finally {
        await page.keyboard.up('ArrowUp');
      }
      const stoppedAt = Number(await canvas.getAttribute('data-y'));
      expect(stoppedAt).toBeGreaterThan(1604);
      expect(stoppedAt).toBeLessThan(y);
    }
    expect(errors).toEqual([]);
  });

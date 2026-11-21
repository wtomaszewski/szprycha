import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  pragaRoutes,
  type PragaMissionId,
  type Waypoint,
} from '../missions/praga-routes';

const canvas = (page: Page) => page.locator('canvas');
const riderY = async (page: Page) =>
  Number.parseFloat((await canvas(page).getAttribute('data-y')) ?? '');
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const skip = (page: Page) =>
  dialogue(page).getByRole('button', { name: pl.dialogueUi.skip }).click();
const phone = (page: Page) =>
  page.getByRole('dialog', { name: pl.phone.title });
const order = (page: Page, id: PragaMissionId) =>
  phone(page).getByRole('button', {
    name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
  });

async function routeWithGamepad(page: Page, points: Waypoint[]) {
  await page.evaluate((route) => {
    window.dispatchEvent(
      new CustomEvent('test:praga-route', { detail: route }),
    );
  }, points);
}

test('unlocks the first four follow-up orders in sequence and plays them in SzprychaApp', async ({
  page,
}) => {
  test.setTimeout(105_000);
  await page.addInitScript(() => {
    let route: Waypoint[] = [];
    let arrivedAt: number | undefined;
    window.addEventListener('test:praga-route', (event) => {
      route = (event as CustomEvent<Waypoint[]>).detail;
      arrivedAt = undefined;
    });
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        const active = document.querySelector('dialog[open]')
          ? undefined
          : route[0];
        const attributes = document.querySelector('canvas')?.dataset;
        const dx = (active?.x ?? 0) - Number(attributes?.x ?? 0);
        const dy = (active?.y ?? 0) - Number(attributes?.y ?? 0);
        const distance = Math.hypot(dx, dy);
        const brake = Boolean(active && distance < 16);
        const now = performance.now();
        if (active && brake && attributes?.speed === '0') {
          arrivedAt ??= now;
          if (now - arrivedAt >= (active.wait ?? 0) * 1000) {
            route.shift();
            arrivedAt = undefined;
          }
        }
        const strength = Math.min(1, Math.max(0.22, distance / 130));
        return [
          {
            connected: true,
            axes:
              !active || brake
                ? [0, 0]
                : [(dx / distance) * strength, (dy / distance) * strength],
            buttons: Array.from({ length: 17 }, (_, i) => ({
              pressed:
                (i === 1 && brake) ||
                (i === 3 && Boolean(active?.look)) ||
                (i === 4 && active?.signal === 'left') ||
                (i === 5 && active?.signal === 'right'),
            })),
          },
        ];
      },
    });
  });

  await page.goto('/');
  await expect(canvas(page)).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas(page)).toHaveAttribute('data-map', 'miasteczko');
  await page.keyboard.press('KeyM');
  for (const id of Object.keys(pragaRoutes) as PragaMissionId[])
    await expect(order(page, id)).toHaveCount(0);
  await phone(page)
    .getByRole('button', { name: new RegExp(pl.misje['WAW-T-01'].tytul) })
    .click();
  await skip(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(() => riderY(page), {
      intervals: [30, 50, 70],
    })
    .toBeGreaterThanOrEqual(1185);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas(page)).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skip(page);

  const ids = Object.keys(pragaRoutes) as PragaMissionId[];
  for (const [index, id] of ids.entries()) {
    await expect(
      page.getByText(pl.missionUi.completed, { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('KeyM');
    await expect(order(page, id)).toBeEnabled();
    for (const locked of ids.slice(index + 1))
      await expect(order(page, locked)).toHaveCount(0);
    await order(page, id).click();
    await expect(canvas(page)).toHaveAttribute('data-mission', id);
    await expect(canvas(page)).toHaveAttribute(
      'data-map',
      id === 'WAW-T-02' ? 'miasteczko' : 'warszawa',
    );
    await skip(page);
    if (id === 'WAW-T-02') {
      await page.screenshot({ path: 'test-results/m4d-garaz.png' });
      await page.getByRole('button', { name: pl.missionUi.equip }).click();
      await expect(
        page.getByRole('button', { name: pl.missionUi.turnOnLights }),
      ).toBeVisible();
      await expect(page.getByText(pl.misje[id].cel2)).toHaveCount(0);
      await page
        .getByRole('button', { name: pl.missionUi.turnOnLights })
        .click();
      await expect(page.getByText(pl.misje[id].cel2)).toBeVisible();
    }
    if (id === 'WAW-A1-02')
      await page.screenshot({ path: 'test-results/m4d-praga.png' });
    if (id === 'WAW-A1-03') {
      await expect(canvas(page)).toHaveAttribute('data-y', '878');
      await page.keyboard.down('ArrowUp');
      await expect
        .poll(() => riderY(page), {
          intervals: [30, 50, 70],
        })
        .toBeLessThanOrEqual(578);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.down('Space');
      await expect(canvas(page)).toHaveAttribute('data-speed', '0');
      const stoppedY = await riderY(page);
      expect(stoppedY).toBeGreaterThan(512);
      expect(stoppedY).toBeLessThan(576);
      await page.waitForTimeout(4400);
      await page.keyboard.up('Space');
      await page.keyboard.down('ArrowUp');
      await expect
        .poll(() => riderY(page), {
          intervals: [30, 50, 70],
        })
        .toBeLessThanOrEqual(273);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.down('Space');
      await expect(canvas(page)).toHaveAttribute('data-speed', '0');
      await page.keyboard.up('Space');
      await page
        .getByRole('button', { name: pl.driving.classic, exact: true })
        .click();
      await routeWithGamepad(page, [pragaRoutes[id].legal.at(-1)!]);
      await expect(dialogue(page)).toBeVisible({ timeout: 12_000 });
      await routeWithGamepad(page, []);
    } else {
      await page
        .getByRole('button', { name: pl.driving.classic, exact: true })
        .click();
      await routeWithGamepad(page, pragaRoutes[id].legal);
      await expect(dialogue(page)).toBeVisible({ timeout: 34_000 });
      await routeWithGamepad(page, []);
    }
    await skip(page);
    if (id === 'WAW-A1-02')
      await page.screenshot({ path: 'test-results/m4d-bazar.png' });
    await expect(
      page.getByText(pl.missionUi.completed, { exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await page.getByRole('button', { name: pl.driving.praga }).click();
  await expect(canvas(page)).toHaveAttribute('data-map', 'warszawa');
  await page.keyboard.press('KeyM');
  await expect(order(page, 'WAW-A1-03')).toBeEnabled();
});

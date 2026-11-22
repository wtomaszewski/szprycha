import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { cityPin } from './city-picker';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
} from '../../src/core/progressStore';

const screenshots = process.env.UPDATE_MOBILE_SCREENSHOTS;
const insets = { top: 6, right: 24, bottom: 18, left: 36 };

async function shot(page: Page, profile: string, screen: string) {
  await page.screenshot({
    animations: 'disabled',
    scale: 'css',
    path: screenshots
      ? `docs/screenshots/75-${profile}-${screen}.png`
      : test.info().outputPath(`${profile}-${screen}.png`),
  });
}

async function layout(page: Page, controls: Locator, target: number) {
  await expect(controls.first()).toBeVisible();
  const viewport = page.viewportSize()!;
  const bounds = await controls.evaluateAll((elements) =>
    elements
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const { x, y, width, height, right, bottom } =
          element.getBoundingClientRect();
        return {
          x,
          y,
          width,
          height,
          right,
          bottom,
          name: element.getAttribute('aria-label') ?? element.textContent,
        };
      }),
  );
  expect(bounds.length).toBeGreaterThan(0);
  for (const [i, a] of bounds.entries()) {
    expect(a.width, a.name!).toBeGreaterThanOrEqual(target);
    expect(a.height, a.name!).toBeGreaterThanOrEqual(target);
    expect(a.x, a.name!).toBeGreaterThanOrEqual(insets.left - 1);
    expect(a.y, a.name!).toBeGreaterThanOrEqual(insets.top - 1);
    expect(a.right, a.name!).toBeLessThanOrEqual(
      viewport.width - insets.right + 1,
    );
    expect(a.bottom, a.name!).toBeLessThanOrEqual(
      viewport.height - insets.bottom + 1,
    );
    for (const b of bounds.slice(i + 1))
      expect(
        Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1,
        `${a.name} / ${b.name}`,
      ).toBe(false);
  }
  expect(
    await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
      window.scrollX,
      window.scrollY,
    ]),
  ).toEqual([viewport.width, viewport.height, 0, 0]);
}

async function unlockQuiz(page: Page) {
  await page.evaluate(
    ({ database, store, key }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, 'readwrite');
          const record = tx.objectStore(store);
          const read = record.get(key);
          read.onsuccess = () =>
            record.put(
              {
                ...read.result,
                missionPoints: 4000,
                quiz: {
                  streak: 0,
                  cards: { Q024: { box: 1, due: '2000-01-01' } },
                },
              },
              key,
            );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    {
      database: progressDatabase,
      store: progressStoreName,
      key: progressRecordKey,
    },
  );
  await page.reload();
}

for (const { profile, device, viewport, target, logicalHeight } of [
  {
    profile: 'telefon',
    device: 'Pixel 7 landscape',
    viewport: { width: 640, height: 360 },
    target: 44,
    logicalHeight: 360,
  },
  {
    profile: 'tablet',
    device: 'iPad (gen 7) landscape',
    viewport: { width: 1024, height: 768 },
    target: 56,
    logicalHeight: 480,
  },
] as const) {
  test.describe(profile, () => {
    const { userAgent, deviceScaleFactor, isMobile, hasTouch } =
      devices[device]!;
    test.use({ userAgent, deviceScaleFactor, isMobile, hasTouch, viewport });

    test('fits the safe area throughout the game and applies accessibility settings', async ({
      page,
      context,
    }) => {
      test.setTimeout(60_000);
      const cdp = await context.newCDPSession(page);
      // Scale first in the full device viewport, then emulate a cutout and a gesture bar.
      await page.goto('/');
      const canvas = page.locator('canvas');
      await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
      await expect(canvas).toHaveJSProperty('width', 640);
      await expect(canvas).toHaveJSProperty('height', logicalHeight);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
      await expect(page.locator('#game')).toHaveCSS('left', '36px');

      const buttons = 'button:not([hidden])';
      const menu = page.locator('.main-menu');
      await layout(page, menu.locator(buttons), target);
      await shot(page, profile, 'menu');
      await unlockQuiz(page);
      await page
        .getByRole('button', { name: pl.settings.title, exact: true })
        .tap();
      const settings = page.getByRole('dialog', { name: pl.settings.title });
      await settings
        .getByRole('combobox', { name: pl.missionResults.textSize })
        .selectOption('largest');
      await settings
        .getByRole('checkbox', { name: pl.missionResults.highContrast })
        .check();
      await settings
        .getByRole('checkbox', { name: pl.settings.reducedEffects })
        .check();
      await settings.getByRole('button', { name: pl.m5c.close }).tap();
      const root = page.locator('html');
      await expect(root).toHaveAttribute('data-text-size', 'largest');
      await expect(root).toHaveAttribute('data-contrast', '');
      await expect(root).toHaveAttribute('data-reduced-effects', '');
      await expect(menu).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await page.getByRole('button', { name: pl.quiz.title }).tap();
      const quiz = page.getByRole('dialog', { name: pl.quiz.title });
      await quiz.getByRole('button', { name: new RegExp(pl.quiz.quick) }).tap();
      await expect(quiz.getByRole('progressbar')).toBeVisible();
      await expect(quiz.locator('.quiz-signs img')).toHaveCount(2);
      await expect(quiz).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await layout(page, quiz.locator(buttons), target);
      await shot(page, profile, 'quiz');
      await quiz.getByRole('button', { name: pl.quiz.close }).tap();

      await page
        .getByRole('button', { name: pl.plac.title, exact: true })
        .tap();
      const yard = page.locator('.plac-dialog');
      await expect(yard).toBeVisible();
      await layout(page, yard.locator(buttons), target);
      await yard.getByRole('button', { name: pl.plac.arcade }).tap();
      await expect(canvas).toHaveAttribute('data-plac-exercise', 'PLAC-01');
      await layout(
        page,
        page.locator(
          `.touch-controls ${buttons}, .touch-controls .joystick, .ride-quick-actions ${buttons}`,
        ),
        target,
      );
      await shot(page, profile, 'plac');
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: pl.plac.return, exact: true })
        .tap();
      await yard
        .getByRole('button', { name: pl.driving.menu, exact: true })
        .tap();

      await page.getByRole('button', { name: pl.cityPicker.campaign }).tap();
      await layout(page, page.locator('.city-picker button'), target);
      await cityPin(page, 'warszawa').tap();
      const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
      await expect(dialogue).toBeVisible();
      await layout(page, dialogue.locator(buttons), target);
      await shot(page, profile, 'dialog');
      await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).tap();
      const hud = page.locator(
        `.ride-hud-left, .ride-hud-right, .mission-panel, .touch-controls ${buttons}, .touch-controls .joystick, .ride-quick-actions ${buttons}`,
      );
      await layout(
        page,
        page.locator(
          `.touch-controls ${buttons}, .touch-controls .joystick, .ride-quick-actions ${buttons}`,
        ),
        target,
      );
      await layout(page, hud, 0);
      await shot(page, profile, 'hud');

      await page.getByRole('button', { name: pl.missionUi.equip }).tap();
      await page.keyboard.down('ArrowDown');
      await expect
        .poll(async () => Number(await canvas.getAttribute('data-y')))
        .toBeGreaterThanOrEqual(1184);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.down('Space');
      await expect(canvas).toHaveAttribute('data-speed', '0');
      await expect(
        page.getByText(pl.trafficEvents.cwiczenie_stop, { exact: true }),
      ).toBeVisible();
      await page.waitForTimeout(500);
      await page.keyboard.up('Space');
      await page.keyboard.down('ArrowDown');
      await expect(dialogue).toBeVisible({ timeout: 8_000 });
      await page.keyboard.up('ArrowDown');
      await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).tap();
      const results = page.getByRole('region', { name: pl.missionUi.result });
      await expect(results).toBeVisible();
      await expect(page.locator('.mission-confetti')).toBeHidden();
      await shot(page, profile, 'wynik');
      await layout(page, results.locator(buttons), target);
    });
  });
}

test.describe('custom touch controls', () => {
  const { userAgent, deviceScaleFactor, isMobile, hasTouch, viewport } =
    devices['Pixel 7 landscape']!;
  test.use({ userAgent, deviceScaleFactor, isMobile, hasTouch, viewport });

  test('drags, saves, restores and resets a custom layout', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    const ride = page.getByRole('button', {
      name: pl.driving.title,
      exact: true,
    });
    const pause = page.getByRole('button', {
      name: pl.driving.pause,
      exact: true,
    });
    const edit = page.getByRole('button', { name: pl.touchLayout.title });
    const editor = page.getByRole('dialog', { name: pl.touchLayout.title });
    const action = (id: string) =>
      page.locator(`.touch-controls [data-slot][aria-label="${id}"]`);
    const cdp = await context.newCDPSession(page);

    await ride.tap();
    await expect(action(pl.driving.brake)).toHaveAttribute('data-slot', '1');
    await pause.tap();
    await edit.tap();
    const brake = (await editor
      .locator('[data-touch-action="brake"]')
      .boundingBox())!;
    const left = (await editor
      .locator('[data-touch-action="left"]')
      .boundingBox())!;
    const point = (rect: typeof brake) => ({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point(brake)],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(left)],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(editor.locator('[data-touch-action="brake"]')).toHaveAttribute(
      'data-slot',
      '0',
    );
    await shot(page, 'telefon', 'uklad');
    await editor.getByRole('button', { name: pl.touchLayout.done }).tap();
    await page.getByRole('button', { name: pl.driving.resume }).tap();
    await expect(action(pl.driving.brake)).toHaveAttribute('data-slot', '0');

    await page.reload();
    await ride.tap();
    await expect(action(pl.driving.brake)).toHaveAttribute('data-slot', '0');
    await pause.tap();
    await edit.tap();
    await editor.getByRole('button', { name: pl.touchLayout.reset }).tap();
    await expect(editor.locator('[data-touch-action="brake"]')).toHaveAttribute(
      'data-slot',
      '1',
    );
    await editor.getByRole('button', { name: pl.touchLayout.done }).tap();
    await page.getByRole('button', { name: pl.driving.resume }).tap();
    await expect(action(pl.driving.brake)).toHaveAttribute('data-slot', '1');

    await page.reload();
    await ride.tap();
    await expect(action(pl.driving.brake)).toHaveAttribute('data-slot', '1');
  });
});

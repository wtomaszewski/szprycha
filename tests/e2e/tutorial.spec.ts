import { expect, test, type Locator, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { TutorialStep } from '../../src/gameplay/Tutorial';
import { readProfile } from './progress-profile';

test.use({ storageState: { cookies: [], origins: [] } });
const labels = pl.tutorial;

function step(page: Page, id: TutorialStep) {
  return expect(
    page.getByRole('region', { name: labels.title }),
  ).toHaveAttribute('data-step', id);
}

function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

async function completeKeyboardTurn(page: Page, direction: 'left' | 'right') {
  const [signal, steer, next] =
    direction === 'left'
      ? (['Q', 'A', 'right'] as const)
      : (['E', 'D', 'bell'] as const);
  await page.keyboard.down(signal);
  await expect(page.getByText(labels.feedback.turnNow)).toBeVisible();
  await page.keyboard.down('W');
  await page.keyboard.down(steer);
  await step(page, next);
  await page.keyboard.up(steer);
  await page.keyboard.up('W');
  await page.keyboard.up(signal);
}

test('new profile completes every lesson on keyboard and can begin the Warsaw training mission', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await step(page, 'move');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map', 'miasteczko');
  await expect(
    page.getByText(labels.steps.move.keyboard, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('miasteczko-po.png') });

  await page.keyboard.down('W');
  await step(page, 'brake');
  await page.keyboard.up('W');
  await page.keyboard.down('Space');
  await step(page, 'look');
  await page.keyboard.up('Space');
  await page.keyboard.down('C');
  await step(page, 'left');
  await page.keyboard.up('C');

  await page.keyboard.down('A');
  await expect(page.getByText(labels.feedback.signalFirst)).toBeVisible();
  await page.keyboard.up('A');
  await completeKeyboardTurn(page, 'left');
  await completeKeyboardTurn(page, 'right');

  await page.keyboard.down('F');
  await step(page, 'lights');
  await page.keyboard.up('F');
  await page.keyboard.press('L');
  await step(page, 'walk');
  await page.keyboard.press('X');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.keyboard.down('W');
  await step(page, 'stop');
  await page.keyboard.up('W');
  await expect(
    page.getByRole('img', { name: new RegExp(pl.missionUi.direction) }),
  ).toBeVisible();
  const startY = Number(await canvas.getAttribute('data-y'));
  await page.keyboard.down('W');
  await expect(page.getByText(labels.feedback.missedLine)).toBeVisible();
  await page.keyboard.up('W');
  await expect
    .poll(async () => (await readProfile(page)).tutorial)
    .toBe('stop');
  await page.screenshot({ path: info.outputPath('stop-po.png') });

  await page.keyboard.down('W');
  await page.waitForFunction(
    (y) => Number(document.querySelector('canvas')?.dataset.y) > y,
    startY + 57,
  );
  await page.keyboard.up('W');
  await page.keyboard.down('Space');
  await step(page, 'points');
  await page.keyboard.up('Space');

  for (const next of ['series', 'attention', 'arrow', 'phone'] as const) {
    await page.keyboard.press('Enter');
    await step(page, next);
  }
  await page.keyboard.press('M');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  await expect(phone).toContainText(pl.misje['WAW-T-01'].tytul);
  await expect(phone).toContainText(pl.misje['WRO-T-01'].tytul);
  await expect(
    phone.getByRole('button', { name: new RegExp(pl.phone.start) }),
  ).toHaveCount(0);
  await page.keyboard.press('M');
  await step(page, 'pause');

  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: pl.driving.paused }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await step(page, 'finish');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  const profile = await readProfile(page);
  expect(profile.tutorial).toBe('done');
  expect(profile.completed).toEqual([]);
  expect(profile.missionPoints).toBe(0);
  expect(profile.mastery).toEqual({});

  await button(page, pl.cityPicker.warszawa).click();
  await expect(canvas).toHaveAttribute('data-mission', 'WAW-T-01');
  expect(errors).toEqual([]);
});

test.describe('touch tutorial on a landscape phone', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 800, height: 390 },
  });

  test('completes every lesson using touch alone', async ({
    page,
    context,
  }, info) => {
    await page.goto('/');
    await step(page, 'move');
    await expect(
      page.getByText(labels.steps.move.touch, { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('dotyk-po.png') });

    const cdp = await context.newCDPSession(page);
    const stick = page
      .locator('.touch-controls')
      .getByLabel(pl.driving.joystick, { exact: true });
    const position = async (target: Locator) => {
      const box = (await target.boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const stickCenter = await position(stick);
    const touch = async (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { id: number; x: number; y: number }[],
    ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const point = (coordinate: { x: number; y: number }, id = 1) => ({
      ...coordinate,
      id,
    });
    const steer = (x: number, y: number) =>
      point({ x: stickCenter.x + x, y: stickCenter.y + y });
    const drive = async (x: number, y: number) => {
      await touch('touchStart', [point(stickCenter)]);
      await touch('touchMove', [steer(x, y)]);
    };
    const hold = async (name: string, next: TutorialStep) => {
      await touch('touchStart', [point(await position(button(page, name)))]);
      await step(page, next);
      await touch('touchEnd', []);
    };

    await drive(0, -35);
    await step(page, 'brake');
    await touch('touchEnd', []);
    await hold(pl.driving.brake, 'look');
    await hold(pl.driving.look, 'left');
    for (const [signal, x, next] of [
      [pl.driving.signalLeft, -35, 'right'],
      [pl.driving.signalRight, 35, 'bell'],
    ] as const) {
      const hand = point(await position(button(page, signal)), 2);
      await touch('touchStart', [hand]);
      await expect(page.getByText(labels.feedback.turnNow)).toBeVisible();
      await touch('touchStart', [hand, point(stickCenter)]);
      await touch('touchMove', [hand, steer(x, 0)]);
      await step(page, next);
      await touch('touchEnd', []);
    }

    await hold(pl.driving.bell, 'lights');
    await button(page, pl.driving.lights).tap();
    await step(page, 'walk');
    await button(page, pl.driving.dismount).tap();
    await drive(0, -35);
    await step(page, 'stop');
    await touch('touchEnd', []);

    const canvas = page.locator('canvas');
    const startY = Number(await canvas.getAttribute('data-y'));
    await drive(0, 35);
    await page.waitForFunction(
      (y) => Number(document.querySelector('canvas')?.dataset.y) > y,
      startY + 57,
    );
    await touch('touchEnd', []);
    await hold(pl.driving.brake, 'points');

    for (const next of ['series', 'attention', 'arrow', 'phone'] as const) {
      await button(page, labels.next).tap();
      await step(page, next);
    }
    await button(page, pl.phone.open).tap();
    await expect(
      page.getByRole('dialog', { name: pl.phone.title }),
    ).toBeVisible();
    await button(page, pl.phone.close).tap();
    await step(page, 'pause');
    await button(page, pl.driving.pause).tap();
    await button(page, pl.driving.resume).tap();
    await step(page, 'finish');
    await button(page, pl.driving.menu).tap();
    await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
    await expect
      .poll(async () => (await readProfile(page)).tutorial)
      .toBe('done');
  });
});

test('updates hints when gamepad and keyboard are used and retains the current lesson', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }));
    const pad = { connected: true, axes: [0, 0], buttons };
    navigator.getGamepads = () => [pad as unknown as Gamepad];
    window.addEventListener('training-move', () => {
      pad.axes[1] = -1;
    });
    window.addEventListener('training-neutral', () => {
      pad.axes[1] = 0;
    });
  });
  await page.goto('/');
  await step(page, 'move');
  await page.evaluate(() => window.dispatchEvent(new Event('training-move')));
  await step(page, 'brake');
  await expect(
    page.getByText(labels.steps.brake.gamepad, { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new Event('training-neutral')),
  );
  await page.keyboard.down('Space');
  await step(page, 'look');
  await page.keyboard.up('Space');
  await expect(
    page.getByText(labels.steps.look.keyboard, { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readProfile(page)).tutorial)
    .toBe('look');

  await page.reload();
  await step(page, 'look');
  await page.keyboard.press('Escape');
  await button(page, pl.driving.menu).click();
  await button(page, labels.help).click();
  await button(page, labels.resume).click();
  await step(page, 'look');
});

test('skipping persists across reload and the Help menu repeats from the first lesson', async ({
  page,
}, info) => {
  await page.goto('/');
  await step(page, 'move');
  await button(page, labels.skip).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect
    .poll(async () => (await readProfile(page)).tutorial)
    .toBe('skipped');
  await page.reload();
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await button(page, labels.help).click();
  await page.screenshot({ path: info.outputPath('pomoc-po.png') });
  await button(page, labels.replay).click();
  await step(page, 'move');
});

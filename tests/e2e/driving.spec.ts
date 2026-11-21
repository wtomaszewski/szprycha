import { test, expect } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
test('ride, brake, walk, pause and return to menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.driving.start, exact: true })
    .click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await expect(canvas).toHaveAttribute('data-y', /\d+/);
  const initial = Number(await canvas.getAttribute('data-y'));
  await page.locator('canvas').click({ position: { x: 320, y: 220 } });
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')))
    .toBeLessThan(initial - 20);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: pl.driving.resume, exact: true }),
  ).toBeVisible();
  const y = await canvas.getAttribute('data-y');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(200);
  await page.keyboard.up('ArrowUp');
  expect(await canvas.getAttribute('data-y')).toBe(y);
  await page
    .getByRole('button', { name: pl.driving.resume, exact: true })
    .click();
  await page.screenshot({ path: 'test-results/driving.png' });
  await page
    .getByRole('button', { name: pl.driving.menu, exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page
    .getByRole('button', { name: pl.driving.start, exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await expect(page.locator('.driving-ui')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('touch joystick moves in simple mode and releases cleanly', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.driving.start, exact: true })
    .click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-y', /\d+/);
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  const initial = Number(await canvas.getAttribute('data-y'));
  const stick = page.locator('.joystick');
  const box = (await stick.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await page.mouse.down();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')))
    .toBeLessThan(initial - 20);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-speed', '0');
});

test('gamepad axes, dismount edge and pause are connected to gameplay', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.driving.start, exact: true })
    .click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-y', /\d+/);
  const initial = Number(await canvas.getAttribute('data-y'));
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [
        {
          connected: true,
          axes: [0, -1],
          buttons: Array.from({ length: 10 }, () => ({ pressed: false })),
        },
      ],
    }),
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')))
    .toBeLessThan(initial - 15);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [
        {
          connected: true,
          axes: [0, 0],
          buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: i === 1 })),
        },
      ],
    }),
  );
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [
        {
          connected: true,
          axes: [0, 0],
          buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: i === 0 })),
        },
      ],
    }),
  );
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [
        {
          connected: true,
          axes: [0, 0],
          buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: i === 9 })),
        },
      ],
    }),
  );
  await expect(
    page.getByRole('button', { name: pl.driving.resume, exact: true }),
  ).toBeVisible();
});

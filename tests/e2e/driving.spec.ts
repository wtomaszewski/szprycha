import { test, expect } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
test('ride, brake, walk, pause and return to menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
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
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await expect(page.locator('.driving-ui')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('touch joystick moves in simple mode and releases cleanly', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
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
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
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

test('holding W for one second accelerates, including a non-Element event target', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })),
  );
  await page.waitForTimeout(1000);
  expect(Number(await canvas.getAttribute('data-speed'))).toBeGreaterThan(20);
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })),
  );
  expect(errors).toEqual([]);
});

test('touch actions set and release rider state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
  const canvas = page.locator('canvas');
  for (const [label, key, value] of [
    [pl.driving.signalLeft, 'signal', 'left'],
    [pl.driving.signalRight, 'signal', 'right'],
    [pl.driving.look, 'looking', true],
    [pl.driving.bell, 'bell', true],
  ] as const) {
    const b = page.getByRole('button', { name: label, exact: true });
    const box = (await b.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect
      .poll(
        async () =>
          JSON.parse((await canvas.getAttribute('data-actions'))!)[key],
      )
      .toBe(value);
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          JSON.parse((await canvas.getAttribute('data-actions'))!)[key],
      )
      .toBe(key === 'signal' ? null : false);
  }
  await page
    .getByRole('button', { name: pl.driving.lights, exact: true })
    .click();
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-actions'))!).lights,
    )
    .toBe(true);
});

for (const [width, height] of [
  [1024, 768],
  [1920, 1080],
  [1366, 768],
  [844, 390],
]) {
  test(`viewport fills ${width}×${height} at maximum integer scale`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
    const metrics = await canvas.evaluate((c: HTMLCanvasElement) => ({
      w: c.width,
      h: c.height,
      rect: c.getBoundingClientRect().toJSON(),
      scroll: [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ],
    }));
    const zoom = Math.max(1, Math.floor(Math.min(width! / 640, height! / 360)));
    expect(metrics.w).toBe(Math.floor(width! / zoom));
    expect(metrics.h).toBe(Math.floor(height! / zoom));
    expect(metrics.rect.width / metrics.w).toBe(zoom);
    expect(metrics.rect.height / metrics.h).toBe(zoom);
    expect(metrics.scroll).toEqual([width, height]);
    expect(metrics.rect.x).toBeLessThan(zoom);
    expect(metrics.rect.y).toBeLessThan(zoom);
  });
}

test('phone portrait shows rotation prompt; landscape keeps controls compact', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(
    page.getByText(pl.driving.rotate, { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByText(pl.driving.rotate, { exact: true })).toBeHidden();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  // The sole menu action is inside the canvas, at its logical coordinates.
  await page.locator('canvas').tap({ position: { x: 282, y: 234 } });
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'City');
  const area = await page.evaluate(() => {
    const rects = ['.drive-bar', '.joystick', '.touch-actions'].map((s) =>
      document.querySelector(s)!.getBoundingClientRect(),
    );
    return (
      rects.reduce((sum, r) => sum + r.width * r.height, 0) /
      (innerWidth * innerHeight)
    );
  });
  expect(area).toBeLessThan(0.21);
  await page.screenshot({ path: 'test-results/mobile-landscape.png' });
  await context.close();
});

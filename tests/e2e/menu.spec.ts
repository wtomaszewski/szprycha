import { test, expect } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
test('Boot → Preload → MainMenu renders local pixel font and Polish pangram', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect(canvas).toHaveAttribute('data-pangram', pl.pangram);
  expect(
    await page.evaluate(() => document.fonts.check('20px "Pixelify Sans"')),
  ).toBe(true);
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]),
  ).toEqual([640, 360]);
  expect(errors).toEqual([]);
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/menu.png' });
});
test('failed content request shows a readable error', async ({ page }) => {
  await page.route('**/data/content.json', (route) =>
    route.fulfill({ status: 500, body: 'failed' }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText(pl.loadError);
  await expect(page.locator('canvas')).not.toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
});

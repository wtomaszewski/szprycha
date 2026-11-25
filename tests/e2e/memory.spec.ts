import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  readWebGLTextures,
  swiftShaderArgs,
  trackWebGLTextures,
} from '../../tools/webgl-textures';
import { chooseCity } from './city-picker';

test.use({
  baseURL: 'http://127.0.0.1:4174',
  serviceWorkers: 'block',
  launchOptions: {
    args: swiftShaderArgs,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  },
});

test('keeps live WebGL textures stable across repeated city changes', async ({
  page,
}) => {
  test.setTimeout(55_000);
  await page.addInitScript(trackWebGLTextures);
  await page.goto('/');
  const menu = page.locator('canvas[data-scene="MainMenu"]');
  await menu.waitFor();
  const cities = ['gdansk', 'wies', 'zakopane'] as const;

  const runRound = async () => {
    const samples = new Map<(typeof cities)[number], number>();
    for (const city of cities) {
      const before = await page.evaluate(readWebGLTextures);
      await chooseCity(page, city);
      await page.locator(`canvas[data-map="${city}"][data-x]`).waitFor();
      const riding = await page.evaluate(readWebGLTextures);
      expect(riding.created, `WebGL allocations in ${city}`).toBeGreaterThan(
        before.created,
      );
      await page
        .getByRole('button', { name: pl.driving.pause, exact: true })
        .click();
      await page
        .getByRole('button', { name: pl.driving.menu, exact: true })
        .click();
      await menu.waitFor();
      samples.set(city, (await page.evaluate(readWebGLTextures)).live);
    }
    return samples;
  };

  const first = await runRound();
  const second = await runRound();
  for (const city of cities)
    expect(
      second.get(city),
      `Live textures in menu after ${city}`,
    ).toBeLessThanOrEqual(first.get(city)! + 2);
});

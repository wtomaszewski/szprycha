import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { readProfile } from './progress-profile';

test.use({
  viewport: { width: 844, height: 390 },
  baseURL: 'http://127.0.0.1:4174',
  isMobile: true,
  hasTouch: true,
});

test('selects low graphics on a weak device and persists the manual override', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4 });
  });
  await page.goto('/');
  const start = page.getByRole('button', {
    name: pl.driving.title,
    exact: true,
  });
  await start.click();
  const controls = page.locator('.driving-ui');
  await controls.waitFor();
  await expect(controls).toHaveAttribute('data-lite', '');
  await page
    .getByRole('button', { name: pl.driving.pause, exact: true })
    .click();
  const quality = page.getByLabel(pl.driving.quality);
  await expect(quality).toHaveValue('auto');
  await page.screenshot({ path: info.outputPath('123-jakosc-grafiki.png') });
  await quality.selectOption('full');
  await expect(controls).not.toHaveAttribute('data-lite');
  await expect
    .poll(async () => (await readProfile(page)).graphicsQuality)
    .toBe('full');

  await page.reload();
  await start.click();
  await controls.waitFor();
  await expect(controls).not.toHaveAttribute('data-lite');
  await page
    .getByRole('button', { name: pl.driving.pause, exact: true })
    .click();
  await expect(quality).toHaveValue('full');
  await quality.selectOption('auto');
  await expect(controls).toHaveAttribute('data-lite', '');
});

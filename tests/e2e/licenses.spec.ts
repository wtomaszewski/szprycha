import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

test.use({ baseURL: 'http://127.0.0.1:4174' });

test('settings opens third-party licenses without a network request', async ({
  page,
  context,
}, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await context.setOffline(true);

  const settings = page.getByRole('button', {
    name: pl.settings.title,
    exact: true,
  });
  await settings.click();
  const panel = page.getByRole('dialog');
  await expect(
    panel.getByRole('heading', { name: pl.settings.title, exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole('combobox', { name: pl.m5c.breakAfter, exact: true }),
  ).toBeVisible();
  await panel.getByRole('button', { name: pl.settings.about }).click();
  await expect(
    panel.getByRole('heading', { name: pl.settings.about }),
  ).toBeVisible();
  await expect(
    panel.getByText(
      'Copyright (c) 2026 Wojciech Tomaszewski. All rights reserved.',
      { exact: true },
    ),
  ).toBeVisible();
  const notices = panel.locator('pre');
  await expect(notices).toContainText('Apache License');
  await expect(notices).toContainText('The MIT License');
  await expect(notices).toContainText('Pixelify Sans (OFL-1.1)');

  const screenshot = info.outputPath('63-licencje.png');
  await page.screenshot({ path: screenshot });
  await info.attach('O grze / Licencje', {
    path: screenshot,
    contentType: 'image/png',
  });

  await panel.getByRole('button', { name: pl.settings.back }).click();
  await expect(
    panel.getByRole('button', { name: pl.settings.about }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(settings).toBeFocused();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
});

import { test, expect } from '@playwright/test';
import { chooseCity } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../../src/core/progressStore';

test('reports a damaged legacy save and starts a fresh profile', async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, '{broken'),
    legacyProgressKey,
  );
  await page.goto('/');
  await page.getByRole('button', { name: pl.tutorial.skip }).click();
  // The driving HUD may still be mounted for a frame after skipping the tutorial.
  await expect(
    page.getByRole('status').filter({ hasText: pl.skillMap.reset }),
  ).toBeVisible();
  await page.getByRole('button', { name: pl.skillMap.title }).click();
  await expect(page.getByRole('dialog')).toContainText(`${pl.skillMap.xp} 0`);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), legacyProgressKey),
  ).toBeNull();
});

test('opens missions with IndexedDB disabled and communicates that progress is temporary', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(
    page.getByRole('status').filter({ hasText: pl.skillMap.sessionOnly }),
  ).toBeVisible();
  await chooseCity(page, 'warszawa', 'campaign');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-mission',
    'WAW-T-01',
  );
});

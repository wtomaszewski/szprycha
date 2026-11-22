import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

test('opens the yard from the main menu and rides a clean narrow track', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: pl.plac.title }).click();
  const canvas = page.locator('canvas[data-scene="Plac"]');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: pl.plac.arcade }).click();
  await expect(canvas).toHaveAttribute('data-plac-exercise', 'PLAC-01');
  await page.screenshot({ path: 'test-results/plac.png' });

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: pl.plac.return }).click();
  await page
    .getByRole('combobox', { name: pl.plac.exercise })
    .selectOption('PLAC-03');
  await page.getByRole('button', { name: pl.plac.start }).click();
  await expect(canvas).toHaveAttribute('data-plac-exercise', 'PLAC-03');
  await page.keyboard.down('ArrowUp');
  await expect(canvas).toHaveAttribute('data-plac-grade', 'good', {
    timeout: 10_000,
  });
  await page.keyboard.up('ArrowUp');
  await expect(
    page.getByRole('heading', { name: pl.plac.completed }),
  ).toBeVisible();
  await expect(page.getByText(pl.plac.practiceOutside)).toBeVisible();
  await expect(page.locator('.plac-results li')).toContainText(
    pl.plac.grades.good,
  );
  expect(errors).toEqual([]);
});

test('opens the yard from Miasteczko and returns to the map', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('canvas[data-scene="MainMenu"]').press('Enter');
  const map = page.locator('canvas[data-map="miasteczko"]');
  await expect(map).toBeVisible();
  await page.getByRole('button', { name: pl.plac.title }).click();
  await expect(
    page.getByRole('heading', { name: pl.plac.title }),
  ).toBeVisible();
  await page.getByRole('button', { name: pl.plac.returnToMap }).click();
  await expect(map).toBeVisible();
});

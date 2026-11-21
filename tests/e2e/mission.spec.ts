import { test, expect } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

test('starts WAW-T-01 from the menu with a visible goal arrow and timer', async ({
  page,
}) => {
  await page.goto('/');
  const start = page.getByRole('button', { name: pl.misje['WAW-T-01'].tytul });
  await expect(start).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-menu.png' });
  await start.press('Enter');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'City');
  const arrow = page.getByRole('img', {
    name: new RegExp(pl.missionUi.direction),
  });
  await expect(arrow).toBeVisible();
  await expect(arrow).toHaveAttribute('aria-label', /\d+ m$/);
  const timer = page.getByLabel(pl.missionUi.timer);
  await expect(timer).toHaveText(/1:[0-2]\d/);
  const helmet = page.getByRole('button', { name: pl.missionUi.equip });
  await expect(helmet).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-tutorial.png' });
  await helmet.click();
  await expect(helmet).toBeHidden();
  await expect(page.getByText(pl.misje['WAW-T-01'].jazda)).toBeVisible();
  await expect(arrow).toBeVisible();
});

test('recovers from a helmet mistake and finishes after stopping at B-20', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: pl.misje['WAW-T-01'].tytul }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await page.keyboard.down('ArrowUp');
  const resume = page.getByRole('button', { name: pl.missionUi.continue });
  await expect(resume).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await expect(page.locator('.rule-feedback')).toHaveAttribute(
    'data-kind',
    'major',
  );
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await resume.click();

  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1184);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await expect(
    page.getByText(pl.missionUi.noTimeBonus, { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-result.png' });
  await page.getByRole('button', { name: pl.missionUi.retry }).click();
  await expect(
    page.getByRole('button', { name: pl.missionUi.equip }),
  ).toBeVisible();
});

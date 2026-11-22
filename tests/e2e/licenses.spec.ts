import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';
import packageJson from '../../package.json' with { type: 'json' };
import pl from '../../i18n/pl.json' with { type: 'json' };
import { answer, parentZone } from './helpers/parent-gate';

test.use({ baseURL: 'http://127.0.0.1:4174' });

const labels = pl.aboutGame;
const { stan_prawny } = parse(readFileSync('content/przepisy.yaml', 'utf8'));

test('opens the educational notice and third-party licenses offline from the menu', async ({
  page,
  context,
}, info) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await context.setOffline(true);

  const about = page.getByRole('button', { name: labels.title, exact: true });
  const panel = page.getByRole('dialog', { name: labels.title });
  await about.click();
  await expect(
    panel.getByText(labels.educationalMaterial, { exact: false }),
  ).toBeVisible();
  await expect(panel.getByText(labels.certificate)).toBeVisible();
  await expect(panel.locator('time')).toHaveAttribute('datetime', stan_prawny);
  await expect(
    panel.getByText(`${labels.version} ${packageJson.version}`),
  ).toBeVisible();
  await expect(panel.locator('section')).toHaveText(labels.review);
  await expect(
    panel.getByText(
      'Copyright (c) 2026 Wojciech Tomaszewski. All rights reserved.',
      { exact: true },
    ),
  ).toBeVisible();

  const path = info.outputPath('90-o-grze.png');
  await page.screenshot({ path, animations: 'disabled' });
  await info.attach(labels.title, { path, contentType: 'image/png' });

  await panel.getByText(labels.thirdParty, { exact: true }).click();
  const notices = panel.locator('pre');
  await expect(notices).toBeVisible();
  await expect(notices).toContainText('Apache License');
  await expect(notices).toContainText('The MIT License');
  await expect(notices).toContainText('Pixelify Sans (OFL-1.1)');
  await page.keyboard.press('Escape');
  await expect(about).toBeFocused();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
});

test('opens About from the parent zone after the gate and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const { open, gate, settings } = parentZone(page);
  await open.click();
  await expect(gate.getByRole('button', { name: labels.title })).toHaveCount(0);
  await answer(gate, (key) => key.click());
  const about = settings.getByRole('button', { name: labels.title });
  await about.click();
  const panel = page.getByRole('dialog', { name: labels.title });
  await expect(panel.getByText(labels.certificate)).toBeVisible();
  await panel.getByRole('button', { name: pl.m5c.close }).click();
  await expect(about).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
});

test('keeps the About shortcut in settings', async ({ page }) => {
  await page.goto('/');
  const settings = page.getByRole('button', {
    name: pl.settings.title,
    exact: true,
  });
  await settings.click();
  const panel = page.getByRole('dialog', { name: pl.settings.title });
  await expect(
    panel.getByRole('combobox', { name: pl.parentZone.breakReminder }),
  ).toHaveCount(0);
  const about = panel.getByRole('button', { name: labels.title });
  await about.click();
  await expect(page.getByRole('dialog', { name: labels.title })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(about).toBeFocused();
});

import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../../src/core/progressStore';
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { readProfile } from './progress-profile';

test('opens Gdańsk only in free ride and unlocks Ołowianka after training', async ({
  page,
}, info) => {
  test.setTimeout(65_000);
  await startAt(page, 'gdansk', 1712, 2154, Math.PI / 2);
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: `${pl.cityPicker.gdansk} ${pl.cityPicker.soon}`,
    }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'gdansk');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('125-mapa-polski.png') });
  await pin.click();

  const canvas = page.locator('canvas[data-map="gdansk"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.gdanskTitle);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByText(pl.driving.districtLocked, { exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('Space');

  const option = (id: 'GDA-B-01' | 'GDA-B-02') =>
    page.getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
    });
  await page.keyboard.press('KeyM');
  await expect(option('GDA-B-02')).toHaveCount(0);
  await option('GDA-B-01').click();
  await expect(canvas).toHaveAttribute('data-mission', 'GDA-B-01');
  const skip = page.getByRole('button', { name: pl.dialogueUi.skip });
  await skip.click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await page.keyboard.press('KeyL');
  await expect(
    page.getByText(pl.misje['GDA-B-01'].kladka, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowDown', 'y', 1940, true);
  await expect(
    page.getByText(pl.misje['GDA-B-01'].meta, { exact: true }),
  ).toBeVisible();
  await page.keyboard.down('ArrowDown');
  try {
    await expect(skip).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowDown');
  }
  await skip.click();
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('GDA-B-01');

  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-y', '2154');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 2260, true);
  await page.keyboard.press('KeyM');
  await expect(option('GDA-B-02')).toBeVisible();
  expect((await readProfile(page)).selectedCity).toBeUndefined();
});

const views = [
  ['dlugi-targ', 1768, 725, -Math.PI / 2],
  ['zuraw', 1712, 1800, -Math.PI / 2],
  ['kladka', 1712, 1936, -Math.PI / 2],
  ['stocznia', 3260, 1674, -Math.PI / 2],
  ['promenada', 2900, 2900, 0],
  ['plaza', 3500, 3200, Math.PI / 2],
  ['tramwaj', 2520, 746, 0],
] as const;

for (const [name, x, y, heading] of views)
  test(`renders Gdańsk — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            completed: ['GDA-B-01', 'GDA-B-02', 'GDA-B-03', 'GDA-B-04'],
          }),
        ),
      { key: legacyProgressKey },
    );
    if (name === 'tramwaj') await page.clock.install();
    await startAt(page, 'gdansk', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'gdansk');
    const canvas = page.locator('canvas[data-map="gdansk"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (name === 'tramwaj') await page.clock.runFor(8000);
    const path = info.outputPath(`125-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

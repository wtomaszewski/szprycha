import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, startAt } from './city-picker';

test.use({ serviceWorkers: 'block' });

test('opens Łódź for free ride, remembers it and offers its four exercises', async ({
  page,
}, info) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  const picker = page.getByRole('main', { name: pl.cityPicker.title });
  const freeRide = page.getByRole('button', {
    name: pl.cityPicker.freeRide,
    exact: true,
  });
  await page.getByRole('button', { name: pl.cityPicker.campaign }).click();
  await expect(picker).toBeVisible();
  await expect(cityPin(page, 'lodz')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await freeRide.click();
  const pin = cityPin(page, 'lodz');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('139-mapa-polski.png') });
  await pin.click();
  await expect(canvas).toHaveAttribute('data-map', 'lodz', { timeout: 15_000 });
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  for (const id of ['LOD-B-01', 'LOD-B-02', 'LOD-B-03', 'LOD-B-04'] as const)
    await expect(phone).toContainText(pl.misje[id].tytul);
  await phone
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['LOD-B-02'].tytul}`,
    })
    .click();
  await expect(canvas).toHaveAttribute('data-mission', 'LOD-B-02');

  await page.reload();
  await freeRide.click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'lodz', { timeout: 15_000 });
  await expect(canvas).not.toHaveAttribute('data-mission', /.+/);
});

const views = [
  ['piotrkowska', 1705, 742, 0, 5200],
  ['fabryka', 2908, 1550, -Math.PI / 2, 0],
  ['murale', 3400, 1590, -Math.PI / 2, 0],
  ['kontrapas', 3120, 904, -Math.PI / 2, 0],
  ['brama', 3268, 1274, -Math.PI / 2, 0],
  ['tramwaj', 2538, 1456, -Math.PI / 2, 24_000],
] as const;

for (const [name, x, y, heading, wait] of views)
  test(`renders Łódź — ${name}`, async ({ page }, info) => {
    if (name === 'tramwaj') test.setTimeout(45_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startAt(page, 'lodz', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'lodz');
    const canvas = page.locator('canvas[data-map="lodz"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (wait) await page.waitForTimeout(wait);
    const path = info.outputPath(`139-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

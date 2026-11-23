import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, startAt } from './city-picker';

// The screenshots load alternate player spawns through Playwright routing.
test.use({ serviceWorkers: 'block' });

test('opens Poznań in free ride, remembers the city, and starts its training', async ({
  page,
}, info) => {
  test.setTimeout(45_000);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  const pin = cityPin(page, 'poznan');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('137-mapa-polski.png') });
  await pin.click();
  await expect(canvas).toHaveAttribute('data-map', 'poznan', {
    timeout: 25_000,
  });
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  for (const id of ['POZ-B-01', 'POZ-B-02', 'POZ-B-03', 'POZ-B-04'] as const)
    await expect(phone).toContainText(pl.misje[id].tytul);
  await phone
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['POZ-B-02'].tytul}`,
    })
    .click();
  await expect(canvas).toHaveAttribute('data-mission', 'POZ-B-02');

  await page.reload();
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await expect(pin).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'poznan', {
    timeout: 25_000,
  });
  await expect(canvas).not.toHaveAttribute('data-mission', /.+/);
});

const views = [
  ['rynek', 1742, 667, -Math.PI / 2],
  ['ostrow', 1770, 1976, -Math.PI / 2],
  ['browar', 3160, 1514, -Math.PI / 2],
  ['bulwar', 1662, 1670, 0],
  ['tramwaj', 2520, 683, -Math.PI / 2],
  ['sluza', 2268, 1119, 0],
] as const;

for (const [name, x, y, heading] of views)
  test(`renders Poznań — ${name}`, async ({ page }, info) => {
    if (name === 'rynek') test.setTimeout(45_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startAt(page, 'poznan', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'poznan');
    const canvas = page.locator('canvas[data-map="poznan"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (name === 'tramwaj') await page.waitForTimeout(7800);
    if (name === 'rynek') {
      await expect(canvas).toHaveAttribute('data-town-hall', 'before-noon');
      await page.screenshot({
        path: info.outputPath('137-przed-poludniem.png'),
      });
      await expect(canvas).toHaveAttribute('data-town-hall', 'noon', {
        timeout: 22_000,
      });
      await page.waitForTimeout(450);
    }
    const path = info.outputPath(`137-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

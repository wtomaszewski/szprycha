import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { cityPin } from './city-picker';

const { campaign, freeRide, gdansk, map, poznan, soon } = pl.cityPicker;

test('selects a city, keeps the latest choice, and limits orders to its campaign', async ({
  page,
}, info) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: campaign }).press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  await expect(canvas).toHaveAttribute('aria-label', map);
  await expect(cityPin(page, 'warszawa')).toBeFocused();
  for (const city of [gdansk, poznan])
    await expect(
      page.getByRole('button', { name: `${city} ${soon}` }),
    ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.getByRole('button', { name: campaign }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: info.outputPath('mapa-polski.png') });
  await cityPin(page, 'wroclaw').press('Enter');
  await expect(canvas).toHaveAttribute('data-mission', 'WRO-T-01');
  await expect(canvas).toHaveAttribute('data-map', 'miasteczko');

  await page.reload();
  await page.getByRole('button', { name: freeRide }).click();
  await expect(cityPin(page, 'wroclaw')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'wroclaw');
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  await expect(phone).toContainText(pl.misje['WRO-T-01'].tytul);
  await expect(phone).not.toContainText(pl.misje['WAW-T-01'].tytul);
  await expect(phone).not.toContainText(pl.misje['WRO-T-02'].tytul);

  await page.reload();
  await page.getByRole('button', { name: freeRide }).click();
  await cityPin(page, 'warszawa').click();
  await expect(canvas).toHaveAttribute('data-map', 'warszawa');
  await page.keyboard.press('KeyM');
  await expect(phone).toContainText(pl.misje['WAW-T-01'].tytul);
  await expect(phone).not.toContainText(pl.misje['WRO-T-01'].tytul);
});

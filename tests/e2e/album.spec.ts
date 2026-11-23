import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { readProfile } from './progress-profile';

test('captures the sign from a stop off the roadway in free ride', async ({
  page,
}) => {
  await page.route('**/maps/miasteczko.tmj', async (route) => {
    const response = await route.fetch();
    const map = await response.json();
    const spawns = map.layers.find(
      ({ name }: { name: string }) => name === 'spawns',
    );
    const player = spawns.objects.find(
      ({ name }: { name: string }) => name === 'player',
    );
    player.x = 364;
    player.y = 1260;
    await route.fulfill({ response, json: map });
  });
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-x', '364');
  const camera = page.getByRole('button', { name: pl.m5c.camera });

  await camera.click();
  await expect(page.getByText(pl.m5c.noPhoto)).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await camera.click();
  await expect(page.getByText(pl.m5c.photoSaved)).toBeVisible();
  await expect
    .poll(async () => (await readProfile(page)).signPhotos['B-20'])
    .toMatch(/^data:image\/png;base64,/);

  await page.reload();
  await page.getByRole('button', { name: pl.m5c.album, exact: true }).click();
  const album = page.getByRole('dialog', { name: pl.m5c.album });
  const photo = album.getByRole('img', { name: 'STOP', exact: true });
  const src = await photo.getAttribute('src');
  expect(src).toMatch(/^data:image\/png;base64,/);
  const { data, width, height } = PNG.sync.read(
    Buffer.from(src!.split(',')[1]!, 'base64'),
  );
  expect([width, height]).toEqual([64, 64]);
  let red = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i]! > 180 && data[i + 1]! < 90 && data[i + 2]! < 100) red++;
  expect(red).toBeGreaterThan(20);
});

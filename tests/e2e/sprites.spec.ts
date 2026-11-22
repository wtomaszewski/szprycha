import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import pl from '../../i18n/pl.json' with { type: 'json' };

function sleeve(image: PNG, left: boolean) {
  let count = 0;
  const edge = image.width / 2;
  for (let y = 0; y < image.height; y++)
    for (
      let x = left ? 0 : edge + 7;
      x < (left ? edge - 7 : image.width);
      x++
    ) {
      const p = (y * image.width + x) * 4;
      if (image.data.toString('hex', p, p + 3) === 'ef7d57') count++;
    }
  return count;
}

test('both hand signals draw a visible arm and the customized helmet in City', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  const helmet = page.getByRole('combobox', { name: pl.helmet.label });
  await helmet.selectOption('pink');
  await page.reload();
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect(helmet).toHaveValue('pink');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await expect(canvas).toHaveAttribute('data-y', /\d+/);
  const { x, y, width, height } = (await canvas.boundingBox())!;
  const clip = {
    x: x + width / 2 - 32,
    y: y + height / 2 - 38,
    width: 64,
    height: 50,
  };
  for (const [key, side] of [
    ['KeyQ', 'left'],
    ['KeyE', 'right'],
  ] as const) {
    await page.keyboard.down(key);
    await expect(canvas).toHaveAttribute(
      'data-actions',
      new RegExp(`"signal":"${side}"`),
    );
    const screenshot = await page.screenshot({
      clip,
      path: testInfo.outputPath(`${side}.png`),
    });
    const image = PNG.sync.read(screenshot);
    expect(sleeve(image, side === 'left')).toBeGreaterThan(4);
    expect(sleeve(image, side !== 'left')).toBeLessThan(4);
    let helmetPixels = 0;
    for (let i = 0; i < image.data.length; i += 4)
      if (image.data.toString('hex', i, i + 3) === 'ff77a8') helmetPixels++;
    expect(helmetPixels).toBeGreaterThan(4);
    await page.keyboard.up(key);
  }
});

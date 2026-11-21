import { expect, test, type Page } from '@playwright/test';

const hideControls = '.driving-ui { visibility: hidden; }';

interface MapObject {
  name: string;
  x: number;
  y: number;
  properties: { name: string; type: string; value: unknown }[];
}

const positions = [
  { name: 'center', x: 0, y: 0 },
  { name: 'upper-left', x: 210, y: 95 },
  { name: 'lower-right', x: -210, y: -95 },
] as const;

async function openCity(
  page: Page,
  position: (typeof positions)[number],
  floors?: number,
) {
  await page.route('**/maps/miasteczko.tmj*', async (route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    const response = await route.fetch();
    const map = (await response.json()) as {
      layers: { name: string; objects: MapObject[] }[];
    };
    const spawns = map.layers.find((layer) => layer.name === 'spawns')!;
    const spawn = spawns.objects.find((object) => object.name === 'player')!;
    // Keep traffic and changing signal phases out of projection comparisons.
    spawns.objects = [spawn];
    map.layers.find((layer) => layer.name === 'signals')!.objects = [];
    spawn.x = 928 + position.x;
    spawn.y = 1024 + position.y;
    if (floors !== undefined) {
      const blocks = map.layers.find((layer) => layer.name === 'blocks')!;
      const base = blocks.objects.find(
        (object) => object.name === 'palace-tier-4',
      )!;
      blocks.objects = [
        {
          ...base,
          properties: [{ name: 'height', type: 'int', value: floors }],
        },
      ];
    }
    await route.fulfill({ response, json: map });
  });
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-x', String(928 + position.x));
  return canvas;
}

test('test palace from the roadside', async ({ page }, testInfo) => {
  const canvas = await openCity(page, positions[1]);
  await canvas.screenshot({
    path: testInfo.outputPath('palace.png'),
    style: hideControls,
  });
});

for (const floors of [4, 10, 32]) {
  for (const position of positions) {
    test(`projection of a ${floors}-floor block at ${position.name}`, async ({
      page,
    }) => {
      const canvas = await openCity(page, position, floors);
      await page.addStyleTag({ content: hideControls });
      await expect(canvas).toHaveScreenshot(
        `block-${floors}-${position.name}.png`,
      );
    });
  }
}

test('F3 camera height slider updates the projection', async ({ page }) => {
  const canvas = await openCity(page, positions[1], 10);
  const slider = page.getByRole('slider');
  await expect(slider).toBeHidden();
  await page.keyboard.press('F3');
  await expect(slider).toHaveValue('1100');
  const before = await canvas.screenshot({
    style: hideControls,
  });
  await slider.fill('600');
  await expect(page.getByText('600 px')).toBeVisible();
  await expect
    .poll(async () =>
      (
        await canvas.screenshot({
          style: hideControls,
        })
      ).equals(before),
    )
    .toBe(false);
  await page.keyboard.press('F3');
  await expect(slider).toBeHidden();
});

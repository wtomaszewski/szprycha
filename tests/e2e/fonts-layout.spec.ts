import { expect, test, type Locator } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { arcadeFont } from '../../src/core/fonts';

async function expectTextToFit(controls: Locator) {
  const result = await controls.evaluateAll(
    (nodes, family) =>
      nodes.map((node) => {
        const { fontSize, fontFamily } = getComputedStyle(node);
        return {
          text: node.textContent?.trim(),
          overflows: node.scrollWidth > node.clientWidth + 1,
          offscreen: node.getBoundingClientRect().right > innerWidth + 1,
          fractional:
            fontFamily.includes(family) && parseFloat(fontSize) % 8 !== 0,
        };
      }),
    arcadeFont,
  );
  expect(result.length).toBeGreaterThan(0);
  expect(
    result.filter(
      ({ overflows, offscreen, fractional }) =>
        overflows || offscreen || fractional,
    ),
  ).toEqual([]);
}

for (const [width, height, hasTouch] of [
  [360, 640, false],
  [640, 360, true],
  [1024, 768, true],
  [1280, 720, false],
] as const) {
  test.describe(`${width}×${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch, isMobile: hasTouch });

    test('menu, panels and driving HUD fit with default and enlarged text', async ({
      page,
    }) => {
      await page.goto('/');
      const menu = page.getByRole('main', { name: pl.title });
      await expect(menu).toBeVisible();
      await expectTextToFit(menu.locator('button, h1, select'));
      await menu.getByRole('button', { name: pl.settings.title }).click();
      const settings = page.getByRole('dialog', { name: pl.settings.title });
      await settings
        .getByLabel(pl.missionResults.textSize)
        .selectOption('largest');
      await expectTextToFit(settings.locator('button, h2, select'));
      await settings.getByRole('button', { name: pl.m5c.close }).click();
      await expectTextToFit(menu.locator('button, h1, select'));
      await menu.getByRole('button', { name: pl.driving.title }).click();
      const score = page.locator('.ride-score');
      const attention = page.locator('.ride-attention');
      await expect(score.getByLabel(pl.progression.points)).toHaveText('0', {
        timeout: 20_000,
      });
      await expect(attention.getByLabel(pl.progression.attention)).toHaveText(
        '0/3',
      );
      await expectTextToFit(
        page.locator('.ride-hud-panel, .ride-hud-panel output'),
      );
      expect(
        (await score.boundingBox())!.x + (await score.boundingBox())!.width,
      ).toBeLessThan((await attention.boundingBox())!.x);
    });
  });
}

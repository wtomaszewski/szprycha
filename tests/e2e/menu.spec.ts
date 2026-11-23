import { test, expect } from '@playwright/test';
import { arcadeFont, readingFont } from '../../src/core/fonts';
import { polishCharacters } from '../../tools/font-coverage';
import pl from '../../i18n/pl.json' with { type: 'json' };
test('Boot → Preload → MainMenu renders local pixel font and Polish pangram', async ({
  page,
}) => {
  const errors: string[] = [];
  const fontRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (request) => {
    if (
      request.resourceType() === 'font' ||
      /fonts\.google(?:apis|static)\.com/.test(request.url())
    ) {
      fontRequests.push(request.url());
    }
  });
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect(canvas).toHaveAttribute('data-pangram', pl.pangram);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const sample = [...polishCharacters(process.cwd()).keys()].join(' ');
  for (const [family, size] of [
    [arcadeFont, 16],
    [readingFont, 24],
  ] as const) {
    await page.evaluate(
      async ({ family, size, sample }) => {
        const specimen = document.createElement('div');
        specimen.id = 'font-specimen';
        specimen.style.cssText = `position:absolute; top:110vh; font:${size}px "${family}", monospace`;
        specimen.textContent = sample;
        document.body.append(specimen);
        await document.fonts.ready;
      },
      { family, size, sample },
    );
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#font-specimen',
    });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.length).toBeGreaterThan(0);
    expect(
      fonts.every((font) => font.isCustomFont && font.familyName === family),
      JSON.stringify(fonts),
    ).toBe(true);
    await page.locator('#font-specimen').evaluate((node) => node.remove());
  }
  expect(fontRequests).toHaveLength(4);
  for (const url of fontRequests) {
    expect(new URL(url).origin).toBe(new URL(page.url()).origin);
    expect(url).toMatch(/\.woff2$/);
  }
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]),
  ).toEqual([640, 360]);
  expect(errors).toEqual([]);
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/menu.png' });
});
test('failed content request shows a readable error', async ({ page }) => {
  await page.route('**/data/content.json', (route) =>
    route.fulfill({ status: 500, body: 'failed' }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText(pl.loadError);
  await expect(page.locator('canvas')).not.toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
});

test('recovers from a zero-sized viewport at startup and after boot', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.route('**/viewport-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<body style="margin: 0"><iframe src="/" style="border: 0; width: 0; height: 0"></iframe></body>',
    }),
  );
  await page.goto('/viewport-test');
  const iframe = page.locator('iframe');
  const frame = page.frameLocator('iframe');
  const container = frame.locator('#game');
  const canvas = frame.locator('canvas');

  await expect(container).toHaveCSS('width', '0px');
  await expect(container).toHaveCSS('height', '0px');
  await expect(canvas).toHaveCount(0);

  await expect(frame.locator('.orientation-warning')).toHaveText(
    pl.driving.rotate,
  );
  await iframe.evaluate((element) => {
    element.style.width = '1280px';
    element.style.height = '720px';
  });
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect(canvas).toBeVisible();

  // Collapse only one axis without dispatching a window resize.
  await container.evaluate(async (element) => {
    element.style.width = '0';
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await expect(canvas).toHaveJSProperty('width', 640);
  await expect(canvas).toHaveJSProperty('height', 360);

  await container.evaluate((element) => {
    element.style.removeProperty('width');
  });
  await expect(canvas).toBeVisible();
  await canvas.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  expect(errors).toEqual([]);
});

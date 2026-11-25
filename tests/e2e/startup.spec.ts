import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { cityPin } from './city-picker';

test.use({ baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block' });

test('cold start requests the selected map once while the ride code is still loading', async ({
  page,
}) => {
  const mapsRequested: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('.tmj')) mapsRequested.push(path);
  });
  let releaseRideCode!: () => void;
  const rideCode = new Promise<void>((resolve) => {
    releaseRideCode = resolve;
  });
  await page.route(/\/assets\/City-[^/]+\.js$/, async (route) => {
    await rideCode;
    await route.continue();
  });
  try {
    await page.goto('/');
    await page
      .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
      .click();
    await Promise.all([
      page.waitForRequest(/\/assets\/warszawa-[^/]+\.tmj$/),
      cityPin(page, 'warszawa').click(),
    ]);
  } finally {
    releaseRideCode();
  }
  await expect(page.locator('canvas[data-map="warszawa"]')).toHaveAttribute(
    'data-x',
    /\d+/,
  );
  expect(mapsRequested).toEqual([expect.stringMatching(/\/warszawa-.*\.tmj$/)]);
});

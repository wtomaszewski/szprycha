import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { legacyProgressKey } from '../src/core/progressStore';
import pl from '../i18n/pl.json' with { type: 'json' };

const budgets = { menuMs: 7000, rideMs: 12000 };
const maps = ['miasteczko', 'warszawa', 'wroclaw', 'krakow'] as const;
const runs = Number(process.env.BENCH_RUNS ?? 3);
if (!Number.isSafeInteger(runs) || runs < 1)
  throw new Error('BENCH_RUNS must be a positive integer');

const server = process.env.BENCH_URL
  ? undefined
  : await preview({ preview: { host: '127.0.0.1', port: 0 } });
const url = process.env.BENCH_URL ?? server!.resolvedUrls!.local[0]!;
try {
  const browser = await chromium.launch({
    executablePath: process.env.BENCH_CHROMIUM_PATH,
  });
  try {
    console.log(`Chromium ${browser.version()}, CPU 4x, Fast 3G`);
    const failures: string[] = [];
    for (const map of maps) {
      const samples: { menuMs: number; rideMs: number }[] = [];
      for (let trial = 0; trial < runs; trial++) {
        // Fresh browser context with no HTTP cache or installed worker.
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          serviceWorkers: 'block',
        });
        try {
          await context.addInitScript(
            (key) => localStorage.setItem(key, '{"completed":[]}'),
            legacyProgressKey,
          );
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await cdp.send('Network.enable');
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 150,
            downloadThroughput: 1_600_000 / 8,
            uploadThroughput: 750_000 / 8,
            connectionType: 'cellular3g',
          });
          await page.goto(url, { waitUntil: 'commit' });
          await page.locator('canvas[data-scene="MainMenu"]').waitFor();
          const menuMs = await page.evaluate(() => performance.now());
          if (map === 'miasteczko')
            await page
              .getByRole('button', { name: pl.driving.title, exact: true })
              .click();
          else {
            await page
              .getByRole('button', { name: pl.cityPicker.freeRide })
              .click();
            await page
              .getByRole('button', { name: pl.cityPicker[map], exact: true })
              .click();
          }
          await page.locator(`canvas[data-map="${map}"][data-x]`).waitFor();
          const rideMs =
            (await page.evaluate(() => performance.now())) - menuMs;
          samples.push({
            menuMs: Math.round(menuMs),
            rideMs: Math.round(rideMs),
          });
        } finally {
          await context.close();
        }
      }
      const median = (metric: keyof typeof budgets) =>
        samples.map((sample) => sample[metric]).sort((a, b) => a - b)[
          Math.floor(runs / 2)
        ]!;
      console.log(
        JSON.stringify({
          map,
          menuMs: median('menuMs'),
          rideMs: median('rideMs'),
          samples,
        }),
      );
      for (const metric of ['menuMs', 'rideMs'] as const)
        if (median(metric) > budgets[metric])
          failures.push(
            `${map} ${metric}: ${median(metric)} > ${budgets[metric]}`,
          );
    }
    if (process.argv.includes('--check') && failures.length)
      throw new Error(failures.join('\n'));
  } finally {
    await browser.close();
  }
} finally {
  server?.httpServer.close();
}

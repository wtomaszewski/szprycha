import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { preview } from 'vite';
import pl from '../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../src/core/progressStore.ts';

const budgets = {
  menu: 12_000,
  miasteczko: 14_000,
  warszawa: 18_000,
  wroclaw: 15_000,
  krakow: 15_000,
};
const maps = ['miasteczko', 'warszawa', 'wroclaw', 'krakow'] as const;
const runs = Number(process.env.BENCH_RUNS ?? 2);
if (!Number.isInteger(runs) || runs < 1)
  throw new Error('BENCH_RUNS must be a positive integer');
const server = process.env.BENCH_URL
  ? undefined
  : await preview({
      configFile: false,
      preview: { host: '127.0.0.1', port: 0 },
    });
const url =
  process.env.BENCH_URL ??
  `http://127.0.0.1:${(server!.httpServer.address() as AddressInfo).port}/`;
const samples: {
  map: (typeof maps)[number];
  menuMs: number;
  rideMs: number;
}[] = [];
try {
  const browser = await chromium.launch({
    executablePath: process.env.BENCH_CHROMIUM_PATH,
  });
  try {
    for (let run = 0; run < runs; run++) {
      for (const map of maps) {
        const page = await browser.newPage({
          viewport: { width: 1280, height: 720 },
          serviceWorkers: 'block',
        });
        try {
          await page.addInitScript((key) => {
            localStorage.setItem(key, '{"completed":[]}');
            const scenes = new MutationObserver(() => {
              const scene = document.querySelector('canvas')?.dataset.scene;
              if (scene !== 'MainMenu' && scene !== 'City') return;
              const mark = 'startup-' + scene;
              if (!performance.getEntriesByName(mark).length)
                performance.mark(mark);
            });
            scenes.observe(document, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ['data-scene'],
            });
          }, legacyProgressKey);
          const cdp = await page.context().newCDPSession(page);
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
          const menuMs = await page.evaluate(() => {
            const menu =
              performance.getEntriesByName('startup-MainMenu')[0]!.startTime;
            performance.mark('startup-ride-request');
            return menu;
          });
          if (map === 'miasteczko')
            await page
              .getByRole('button', { name: pl.driving.title, exact: true })
              .click();
          else {
            await page
              .getByRole('button', {
                name: pl.cityPicker.freeRide,
                exact: true,
              })
              .click();
            await page
              .getByRole('button', { name: pl.cityPicker[map], exact: true })
              .click();
          }
          await page
            .locator(`canvas[data-scene="City"][data-map="${map}"][data-x]`)
            .waitFor();
          const ride = await page.evaluate(
            () =>
              performance.measure(
                'startup-ride',
                'startup-ride-request',
                'startup-City',
              ).duration,
          );
          const sample = {
            map,
            menuMs: Math.round(menuMs),
            rideMs: Math.round(ride),
          };
          samples.push(sample);
          console.log(JSON.stringify(sample));
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await server?.close();
}
await mkdir('test-results', { recursive: true });
await writeFile(
  'test-results/performance-startup.json',
  JSON.stringify({ budgets, samples }, null, 2),
);
for (const map of maps) {
  const trials = samples.filter((sample) => sample.map === map);
  const average = (key: 'menuMs' | 'rideMs') =>
    trials.reduce((total, sample) => total + sample[key], 0) / trials.length;
  if (average('menuMs') > budgets.menu || average('rideMs') > budgets[map]) {
    console.error(`Startup budget exceeded for ${map}`);
    process.exitCode = 1;
  }
}

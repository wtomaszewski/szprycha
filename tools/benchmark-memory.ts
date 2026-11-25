import { chromium } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';
import { legacyProgressKey } from '../src/core/progressStore';
import type { MapId } from '../src/scenes/cityMaps';
import pl from '../i18n/pl.json' with { type: 'json' };
import {
  readWebGLTextures,
  swiftShaderArgs,
  trackWebGLTextures,
} from './webgl-textures';

const maps = {
  miasteczko: { x: 624, y: 1120, heading: -Math.PI / 2 },
  warszawa: { x: 550, y: 1145, heading: 0 },
  wroclaw: { x: 1440, y: 1536, heading: 0 },
  krakow: { x: 1290, y: 776, heading: 0 },
  gdansk: { x: 1390, y: 783, heading: 0 },
  wies: { x: 1208, y: 866, heading: -Math.PI / 2 },
  poznan: { x: 1380, y: 862, heading: 0 },
  lodz: { x: 1438, y: 742, heading: 0 },
  zakopane: { x: 1376, y: 886, heading: 0 },
} satisfies Record<MapId, { x: number; y: number; heading: number }>;
const mapIds = Object.keys(maps) as MapId[];
const mapRequest = new RegExp(
  `/(?:maps|assets)/(${mapIds.join('|')})(?:-[^/]+)?\\.tmj(?:\\?|$)`,
);
const minutes = Number(process.env.BENCH_MINUTES ?? 10);
if (!Number.isFinite(minutes) || minutes <= 0)
  throw new Error('BENCH_MINUTES must be positive');
const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
  args: swiftShaderArgs,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    serviceWorkers: 'block',
  });
  page.setDefaultTimeout(30_000);
  await page.route('**/assets/radio/**', (route) => route.abort());
  await page.route(mapRequest, async (route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    const id = mapRequest.exec(route.request().url())![1] as MapId;
    const { x, y, heading } = maps[id];
    const response = await route.fetch();
    const tiled = await response.json();
    const player = tiled.layers
      .find(({ name }: { name: string }) => name === 'spawns')
      .objects.find(({ name }: { name: string }) => name === 'player');
    player.x = x;
    player.y = y;
    player.properties = [
      ...(player.properties ?? []).filter(
        ({ name }: { name: string }) => name !== 'heading',
      ),
      { name: 'heading', type: 'float', value: heading },
    ];
    await route.fulfill({ response, json: tiled });
  });
  await page.addInitScript(trackWebGLTextures);
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ completed: [] }));
  }, legacyProgressKey);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:4173/');
  const canvas = page.locator('canvas');
  const sample = async (stage: string) => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const { documents, nodes, jsEventListeners } = await cdp.send(
      'Memory.getDOMCounters',
    );
    console.log(
      JSON.stringify({
        stage,
        heapBytes: metrics.find(({ name }) => name === 'JSHeapUsedSize')?.value,
        documents,
        nodes,
        jsEventListeners,
        textures: await page.evaluate(readWebGLTextures),
      }),
    );
  };
  const dismissLesson = async () => {
    const replay = page.getByRole('dialog', { name: pl.replay.title });
    if (await replay.isVisible())
      await replay
        .getByRole('button', { name: pl.replay.retry, exact: true })
        .click();
    const question = page.getByRole('dialog', {
      name: pl.progression.questionTitle,
    });
    if (await question.isVisible()) {
      await question
        .locator('.control-question-answers button')
        .first()
        .click();
      await question
        .getByRole('button', { name: pl.progression.continue })
        .click();
    }
  };
  const pause = async () => {
    await dismissLesson();
    await page
      .getByRole('button', { name: pl.driving.pause, exact: true })
      .click();
  };
  const goBack = async () => {
    await pause();
    await page
      .getByRole('button', { name: pl.driving.menu, exact: true })
      .click();
    await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  };
  const openMap = async (map: MapId) => {
    if (map === 'miasteczko') {
      await page
        .getByRole('button', { name: pl.driving.title, exact: true })
        .click();
    } else {
      await page
        .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
        .click();
      await page
        .getByRole('button', { name: pl.cityPicker[map], exact: true })
        .click();
    }
    await page
      .locator(`canvas[data-scene="City"][data-map="${map}"][data-x]`)
      .waitFor({ timeout: 60_000 });
  };
  console.log(
    `Chromium ${browser.version()}, WebGL (SwiftShader), CPU 4x, ${minutes} min input`,
  );
  await openMap('miasteczko');
  if (!(await page.evaluate(readWebGLTextures)).live)
    throw new Error('WebGL required for texture counts');
  await sample('start:miasteczko');
  await goBack();

  const laps = 3;
  const rideMs = (minutes * 60_000) / (laps * mapIds.length);
  for (let lap = 1; lap <= laps; lap++) {
    for (const map of mapIds) {
      await openMap(map);
      const quality = page.getByLabel(pl.driving.quality);
      await pause();
      if (await quality.count()) await quality.selectOption('full');
      await page
        .getByRole('button', { name: pl.driving.resume, exact: true })
        .click();
      const stick = await page
        .locator('.touch-controls')
        .getByLabel(pl.driving.joystick)
        .boundingBox();
      if (!stick) throw new Error('Missing joystick');
      const { heading } = maps[map];
      let pixels = 0;
      let rideTime = 0;
      const position = () =>
        canvas.evaluate((element) => ({
          x: Number(element.dataset.x),
          y: Number(element.dataset.y),
        }));
      while (rideTime < rideMs) {
        const before = await position();
        await page.mouse.move(
          stick.x + stick.width / 2,
          stick.y + stick.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          stick.x + stick.width * (0.5 + Math.cos(heading) * 0.065),
          stick.y + stick.height * (0.5 + Math.sin(heading) * 0.065),
        );
        const interval = Math.min(5000, rideMs - rideTime);
        await setTimeout(interval);
        rideTime += interval;
        await page.mouse.up();
        const after = await position();
        pixels += Math.hypot(after.x - before.x, after.y - before.y);
        await dismissLesson();
        await page.keyboard.press('KeyR');
      }
      if (pixels <= 10) throw new Error(`No movement in ${map}`);
      console.log(JSON.stringify({ lap, map, pixels: Math.round(pixels) }));
      await goBack();
      await sample(`lap ${lap}: ${map} → menu`);
    }
  }
  await openMap('miasteczko');
  await sample('end:miasteczko');
} finally {
  await browser.close();
}

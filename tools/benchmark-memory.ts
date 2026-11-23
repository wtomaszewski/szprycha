import { chromium } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';
import { legacyProgressKey } from '../src/core/progressStore';
import pl from '../i18n/pl.json' with { type: 'json' };

const maps = {
  miasteczko: { x: 624, y: 1120, heading: -Math.PI / 2 },
  warszawa: { x: 550, y: 1145, heading: 0 },
  wroclaw: { x: 1440, y: 1536, heading: 0 },
  krakow: { x: 1290, y: 776, heading: 0 },
};
type MapId = keyof typeof maps;
const minutes = Number(process.env.BENCH_MINUTES ?? 10);
if (!Number.isFinite(minutes) || minutes <= 0)
  throw new Error('BENCH_MINUTES must be positive');
const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    serviceWorkers: 'block',
  });
  await page.route('**/assets/radio/**', (route) => route.abort());
  await page.route(
    /\/(maps|assets)\/(miasteczko|warszawa|wroclaw|krakow)(?:-[^/]+)?\.tmj$/,
    async (route) => {
      const id = /\/(miasteczko|warszawa|wroclaw|krakow)(?:-[^/]+)?\.tmj$/.exec(
        route.request().url(),
      )![1] as MapId;
      const { x, y, heading } = maps[id];
      const response = await route.fetch();
      const tiled = await response.json();
      const player = tiled.layers
        .find(({ name }: { name: string }) => name === 'spawns')
        .objects.find(({ name }: { name: string }) => name === 'player');
      Object.assign(player, {
        x,
        y,
        properties: [{ name: 'heading', type: 'float', value: heading }],
      });
      await route.fulfill({ response, json: tiled });
    },
  );
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ completed: ['KRA-B-01', 'KRA-B-02', 'KRA-B-03'] }),
    );
    const textures = { live: 0, created: 0 };
    Object.defineProperty(window, '__benchmarkTextures', { value: textures });
    const live = new WeakSet<WebGLTexture>();
    for (const { prototype } of [
      WebGLRenderingContext,
      WebGL2RenderingContext,
    ]) {
      const { createTexture, deleteTexture } = prototype;
      prototype.createTexture = function () {
        const texture = createTexture.call(this);
        if (texture && !live.has(texture)) {
          live.add(texture);
          textures.created++;
          textures.live++;
        }
        return texture;
      };
      prototype.deleteTexture = function (texture: WebGLTexture | null) {
        if (texture && live.delete(texture)) textures.live--;
        deleteTexture.call(this, texture);
      };
    }
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
        textures: await page.evaluate(() =>
          Reflect.get(window, '__benchmarkTextures'),
        ),
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
  let previousMap: MapId | undefined;
  const openMap = async (map: MapId) => {
    if (map === 'miasteczko') {
      // Older builds reused the most recent ride payload when starting the town.
      if (previousMap && previousMap !== map) {
        await page
          .getByRole('button', { name: pl.tutorial.help, exact: true })
          .click();
        await page
          .getByRole('button', { name: pl.tutorial.replay, exact: true })
          .click();
        await page
          .getByRole('button', { name: pl.tutorial.skip, exact: true })
          .click();
        await page.locator('canvas[data-scene="MainMenu"]').waitFor();
      }
      await page
        .getByRole('button', { name: pl.driving.title, exact: true })
        .click();
    } else {
      await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
      await page
        .getByRole('button', { name: pl.cityPicker[map], exact: true })
        .click();
    }
    await page
      .locator(`canvas[data-map="${map}"][data-x]`)
      .waitFor({ timeout: 60_000 });
    previousMap = map;
  };
  console.log(
    `Chromium ${browser.version()}, WebGL (SwiftShader), CPU 4x, ${minutes} min input`,
  );
  await openMap('miasteczko');
  const renderer = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.getContext('2d') ? 'Canvas' : 'WebGL',
  );
  if (renderer !== 'WebGL')
    throw new Error('WebGL required for texture counts');
  await sample('start:miasteczko');
  await goBack();

  const laps = 3;
  const mapIds = Object.keys(maps) as MapId[];
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
      const horizontal = map !== 'miasteczko';
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
          stick.x + stick.width * (horizontal ? 0.565 : 0.5),
          stick.y + stick.height * (horizontal ? 0.5 : 0.435),
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

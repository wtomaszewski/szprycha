import { chromium, type JSHandle } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { legacyProgressKey } from '../src/core/progressStore.ts';
import pl from '../i18n/pl.json' with { type: 'json' };

const minutes = Number(process.env.BENCH_MINUTES ?? 10);
type MemoryGame = {
  textures: {
    getTextureKeys(): string[];
    get(key: string): { source: { width: number; height: number }[] };
  };
  scene: {
    getScene(key: string): {
      rider: { y: number };
      controls: { read: () => object };
      reset(): void;
    };
  };
};
type MemorySample = {
  stage: string;
  heapBytes: number;
  jsEventListeners: number;
  nodes: number;
  textures: { count: number; rgbaBytes: number };
};
if (!Number.isFinite(minutes) || minutes <= 0)
  throw new Error('BENCH_MINUTES must be positive');
const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
  });
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{"completed":[]}');
  }, legacyProgressKey);
  await page.route(/\/assets\/miasteczko-[^/]+\.tmj$/, async (route) => {
    const response = await route.fetch();
    const map = await response.json();
    const spawn = map.layers
      .find(({ name }: { name: string }) => name === 'spawns')
      .objects.find(({ name }: { name: string }) => name === 'player');
    spawn.x = 624;
    spawn.y = 1120;
    await route.fulfill({ response, json: map });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:4174/');
  await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  const game = (await page.evaluateHandle(`(async () => {
    const module = await import(document.querySelector('link[href*="/phaser-"]').href);
    const prototype = Object.values(module)[0]().Scenes.SceneManager.prototype;
    const update = prototype.update;
    return new Promise(resolve => {
      prototype.update = function (time, delta) {
        prototype.update = update;
        update.call(this, time, delta);
        resolve(this.game);
      };
    });
  })()`)) as JSHandle<MemoryGame>;
  const samples: MemorySample[] = [];
  async function sample(stage: string) {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    const { jsEventListeners, nodes } = await cdp.send('Memory.getDOMCounters');
    const textures = await game.evaluate((game) => {
      const keys = game.textures.getTextureKeys();
      const rgbaBytes = keys.reduce(
        (bytes, key) =>
          bytes +
          game.textures
            .get(key)
            .source.reduce(
              (total, { width, height }) => total + width * height * 4,
              0,
            ),
        0,
      );
      return { count: keys.length, rgbaBytes };
    });
    const result = {
      stage,
      heapBytes: usedSize,
      jsEventListeners,
      nodes,
      textures,
    };
    samples.push(result);
    console.log(result);
  }
  async function training() {
    await page
      .getByRole('button', { name: pl.driving.title, exact: true })
      .click();
    await page.locator('canvas[data-map="miasteczko"]').waitFor();
  }
  async function menu() {
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: pl.driving.menu, exact: true })
      .click();
    await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  }
  await sample('menu');
  await training();
  await sample('training-start');
  const resets = await game.evaluate(
    (game, duration) =>
      new Promise<number>((resolve) => {
        const city = game.scene.getScene('City');
        const read = city.controls.read;
        city.controls.read = () => ({ x: 0, y: -0.195, scheme: 'simple' });
        let count = 0;
        const timer = setInterval(() => {
          if (city.rider.y < 1120) count++;
          city.reset();
        }, 5000);
        setTimeout(() => {
          clearInterval(timer);
          city.controls.read = read;
          resolve(count);
        }, duration);
      }),
    minutes * 60_000,
  );
  if (resets < Math.floor(minutes * 12 * 0.85))
    throw new Error(`Rider did not move in enough intervals: ${resets}`);
  await sample('training-end');
  await menu();
  for (let pass = 1; pass <= 2; pass++) {
    for (const city of ['warszawa', 'wroclaw', 'krakow'] as const) {
      await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
      await page
        .getByRole('button', { name: pl.cityPicker[city], exact: true })
        .click();
      await page.locator(`canvas[data-map="${city}"]`).waitFor();
      await sample(`${city}-pass-${pass}`);
      await menu();
    }
  }
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/performance-memory.json',
    JSON.stringify(
      { minutes, resets, chromium: browser.version(), samples },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

import { waitForMainMenu } from './skip-tutorial';
import { chromium, devices } from '@playwright/test';
import pl from '../i18n/pl.json' with { type: 'json' };

const baseURL = process.env.BENCHMARK_URL ?? 'http://127.0.0.1:4174';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
});
const phone = devices['Pixel 7 landscape']!;
const city = process.argv[2] === 'wroclaw' ? 'wroclaw' : 'warszawa';

interface BenchGame {
  scene: {
    getScene(key: 'City'): {
      environment: { weather: string; visibilityLow: boolean };
      controls: { previewNight: boolean; setLights(on: boolean): void };
      agents: readonly { active?: boolean }[];
      rules: { at: number };
    };
  };
  events: {
    on(name: string, callback: () => void): void;
    off(name: string, callback: () => void): void;
  };
  renderer: { gl?: WebGLRenderingContext };
}
interface SceneManager {
  game: BenchGame;
  update(time: number, delta: number): void;
}

function summary(samples: number[]) {
  samples.sort((a, b) => a - b);
  const percentile = (p: number) =>
    Number(samples[Math.ceil(p * samples.length) - 1]!.toFixed(2));
  return { median: percentile(0.5), p95: percentile(0.95) };
}

try {
  const context = await browser.newContext({ ...phone, baseURL });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto('/');
  await waitForMainMenu(page);
  const game = await page.evaluateHandle(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[href*="/phaser-"]',
    )!;
    const module: Record<
      string,
      () => {
        Scenes: { SceneManager: { prototype: SceneManager } };
      }
    > = await import(link.href);
    const prototype = Object.values(module)[0]!().Scenes.SceneManager.prototype;
    const original = prototype.update;
    return await new Promise<BenchGame>((resolve) => {
      prototype.update = function (time, delta) {
        prototype.update = original;
        original.call(this, time, delta);
        resolve(this.game);
      };
    });
  });
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).tap();
  await page
    .getByRole('button', { name: pl.cityPicker[city], exact: true })
    .tap();
  const canvas = page.locator('canvas[data-scene="City"]');
  await canvas.waitFor();
  await game.evaluate((value) => {
    const scene = value.scene.getScene('City');
    // Combine heavy rain and night lighting with the free-ride traffic schedule.
    scene.environment.weather = 'rain_heavy';
    scene.environment.visibilityLow = true;
    scene.controls.previewNight = true;
    scene.controls.setLights(true);
  });
  await page
    .locator('canvas[data-lighting="night"][data-weather="rain_heavy"]')
    .waitFor();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(3500);
  const result = await game.evaluate(async (value) => {
    const cpu: number[] = [];
    const interval: number[] = [];
    const scene = value.scene.getScene('City');
    const from = scene.rules.at;
    let maxActiveAgents = 0;
    let lastFrame = 0;
    let start = 0;
    const measure = {
      before() {
        start = performance.now();
        if (lastFrame) interval.push(start - lastFrame);
        lastFrame = start;
      },
      after() {
        if (!start) return;
        cpu.push(performance.now() - start);
        let activeAgents = 0;
        for (const agent of scene.agents)
          if (agent.active !== false) activeAgents++;
        maxActiveAgents = Math.max(maxActiveAgents, activeAgents);
      },
    };
    value.events.on('prestep', measure.before);
    value.events.on('postrender', measure.after);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    value.events.off('prestep', measure.before);
    value.events.off('postrender', measure.after);
    return {
      cpu,
      interval,
      maxActiveAgents,
      simulatedSeconds: scene.rules.at - from,
      renderer: value.renderer.gl ? 'WebGL' : 'Canvas',
    };
  });
  if (
    result.cpu.length < 100 ||
    result.maxActiveAgents === 0 ||
    result.simulatedSeconds < 5
  )
    throw new Error('Incomplete live traffic sample');
  console.log(
    JSON.stringify(
      {
        city,
        device: 'Pixel 7 landscape',
        viewport: phone.viewport,
        browser: browser.version(),
        renderer: result.renderer,
        cpuThrottle: 4,
        frames: result.cpu.length,
        maxActiveAgents: result.maxActiveAgents,
        simulatedSeconds: Number(result.simulatedSeconds.toFixed(2)),
        frameWorkMs: summary(result.cpu),
        frameIntervalMs: summary(result.interval),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

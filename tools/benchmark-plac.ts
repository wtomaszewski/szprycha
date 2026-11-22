import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import pl from '../i18n/pl.json' with { type: 'json' };

const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
  args: process.env.BENCH_RENDERER === 'canvas' ? ['--disable-webgl'] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:5173/');
  await page.getByRole('button', { name: pl.plac.title }).click();
  await page.getByRole('button', { name: pl.plac.arcade }).click();
  const canvas = page.locator(
    'canvas[data-scene="Plac"][data-plac-exercise="PLAC-01"]',
  );
  const renderer = await canvas.evaluate((el: HTMLCanvasElement) =>
    el.getContext('2d') ? 'Canvas' : 'WebGL',
  );
  // Ride continuous circles so the bicycle and arcade recorder update for the entire sample.
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  const speed = page.getByLabel(pl.driving.speed, { exact: true });
  await speed.filter({ hasText: /^\d{2}/ }).waitFor();
  const frames = await page.evaluate<number[]>(`new Promise(resolve => {
    const times = []; let start = 0; let last = 0;
    function frame(t) {
      if (!start) start = t;
      if (last && t - start > 1000) times.push(t - last);
      last = t;
      if (t - start < 12000) requestAnimationFrame(frame); else resolve(times);
    }
    requestAnimationFrame(frame);
  })`);
  const movingSpeed = await speed.textContent();
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  if (
    !frames.length ||
    !/^\d{2}/.test(movingSpeed ?? '') ||
    (await page.locator('dialog[open], canvas[data-plac-grade]').count())
  )
    throw new Error('Yard benchmark did not complete during riding');
  frames.sort((a, b) => a - b);
  const stats = {
    environment: `Chromium ${browser.version()} headless, 1280x720, CPU 4x`,
    renderer,
    meanFps: 1000 / (frames.reduce((sum, t) => sum + t, 0) / frames.length),
    p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    maxFrameMs: frames.at(-1),
    samples: frames.length,
  };
  console.log(stats);
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/plac-performance.json',
    JSON.stringify(stats, null, 2) + '\n',
  );
  if (stats.meanFps < 58) process.exitCode = 1;
} finally {
  await browser.close();
}

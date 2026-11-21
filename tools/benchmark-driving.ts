import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:5173/');
  await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  await page.keyboard.press('Enter');
  await page.locator('canvas[data-scene="City"]').waitFor();
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  // Raw browser source avoids TS runner helper injection into serialized callbacks.
  const frames = await page.evaluate<number[]>(`new Promise(resolve => {
    const times = []; let last = 0; let start = 0;
    function frame(t) {
      if (!start) start = t;
      if (last && t - start > 1000) times.push(t - last);
      last = t;
      if (t - start < 12000) requestAnimationFrame(frame); else resolve(times);
    }
    requestAnimationFrame(frame);
  })`);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  frames.sort((a, b) => a - b);
  const report = {
    date: new Date().toISOString(),
    environment:
      'Chromium headless, 1280x720, CPU 4x; not a physical Android measurement',
    samples: frames.length,
    meanFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    maxFrameMs: frames.at(-1),
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/performance.json',
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import pl from '../i18n/pl.json' with { type: 'json' };

const praga = process.env.BENCH_MAP === 'warszawa';
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
  await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  if (praga) await page.getByRole('button', { name: pl.driving.praga }).click();
  else await page.keyboard.press('Enter');
  await page.locator('canvas[data-scene="City"]').waitFor();
  const renderer = await page
    .locator('canvas[data-scene="City"]')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas.getContext('2d') ? 'Canvas' : 'WebGL',
    );
  const position = page.locator('canvas[data-x]');
  await position.waitFor();
  const startX = praga ? Number(await position.getAttribute('data-x')) : 0;
  if (praga) {
    await page
      .getByRole('button', { name: pl.driving.classic, exact: true })
      .click();
    // Stick slightly off-centre for a continuous ride below the random event speed.
    const stick = await page.getByLabel(pl.driving.joystick).boundingBox();
    if (!stick) throw new Error('Missing steering control');
    await page.mouse.move(
      stick.x + stick.width * 0.565,
      stick.y + stick.height / 2,
    );
    await page.mouse.down();
    await page.waitForFunction(
      () => Number(document.querySelector('canvas')?.dataset.speed) > 0,
    );
  } else {
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowRight');
  }
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
  let travelledPx: number | undefined;
  if (praga) {
    await page.mouse.up();
    const endX = Number(await page.locator('canvas').getAttribute('data-x'));
    travelledPx = endX - startX;
    if (travelledPx < 200 || (await page.locator('dialog[open]').count()))
      throw new Error(`Praga benchmark interrupted at x=${endX}`);
  } else {
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');
  }
  frames.sort((a, b) => a - b);
  const report = {
    date: new Date().toISOString(),
    environment:
      'Chromium headless, 1280x720, CPU 4x; not a physical Android measurement',
    renderer,
    map: praga ? 'warszawa' : 'miasteczko',
    travelledPx,
    samples: frames.length,
    meanFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    maxFrameMs: frames.at(-1),
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    praga
      ? 'test-results/performance-praga.json'
      : 'test-results/performance.json',
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}

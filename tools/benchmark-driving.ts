import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import pl from '../i18n/pl.json' with { type: 'json' };

const viewport = /^(\d+)x(\d+)$/.exec(process.env.BENCH_VIEWPORT ?? '1280x720');
if (!viewport || !Number(viewport[1]) || !Number(viewport[2]))
  throw new Error('BENCH_VIEWPORT must use WIDTHxHEIGHT in pixels');
const [, width, height] = viewport;
const warsaw = process.env.BENCH_MAP === 'warszawa';
const fragment = warsaw ? process.env.BENCH_FRAGMENT : undefined;
const orders = [
  'WAW-T-01',
  'WAW-T-02',
  'WAW-A1-01',
  'WAW-A1-02',
  'WAW-A1-03',
  'WAW-A1-04',
] as const;
const mission =
  fragment === 'most'
    ? 'WAW-A1-04'
    : fragment === 'starowka'
      ? 'WAW-A1-05'
      : undefined;
if (fragment && !mission)
  throw new Error(`Unknown Warsaw fragment: ${fragment}`);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
  args: process.env.BENCH_RENDERER === 'canvas' ? ['--disable-webgl'] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
  });
  if (mission) {
    const completed = mission === 'WAW-A1-04' ? orders.slice(0, -1) : orders;
    await page.addInitScript(
      (ids) =>
        localStorage.setItem(
          'szprycha.mission-progress.v1',
          JSON.stringify({ completed: ids }),
        ),
      completed,
    );
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:5173/');
  await page.locator('canvas[data-scene="MainMenu"]').waitFor();
  if (warsaw)
    await page.getByRole('button', { name: pl.driving.praga }).click();
  else await page.keyboard.press('Enter');
  await page.locator('canvas[data-scene="City"]').waitFor();
  if (mission) {
    await page.keyboard.press('KeyM');
    await page
      .getByRole('button', {
        name: `${pl.phone.start} · ${pl.misje[mission].tytul}`,
      })
      .click();
    await page.locator(`canvas[data-mission="${mission}"]`).waitFor();
    await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  }
  const renderer = await page
    .locator('canvas[data-scene="City"]')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas.getContext('2d') ? 'Canvas' : 'WebGL',
    );
  const position = page.locator('canvas[data-x]');
  await position.waitFor();
  let startX = warsaw ? Number(await position.getAttribute('data-x')) : 0;
  if (warsaw) {
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
    if (mission) {
      await page.waitForFunction(
        (x) => Number(document.querySelector('canvas')?.dataset.x) >= x,
        mission === 'WAW-A1-04' ? 2255 : 3110,
      );
      startX = Number(await position.getAttribute('data-x'));
    }
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
  if (warsaw) {
    await page.mouse.up();
    const endX = Number(await page.locator('canvas').getAttribute('data-x'));
    travelledPx = endX - startX;
    if (travelledPx < 200 || (await page.locator('dialog[open]').count()))
      throw new Error(`Warsaw benchmark interrupted at x=${endX}`);
  } else {
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');
  }
  frames.sort((a, b) => a - b);
  const report = {
    date: new Date().toISOString(),
    environment: `Chromium headless, ${width}x${height}, CPU 4x`,
    renderer,
    map: warsaw ? 'warszawa' : 'miasteczko',
    fragment,
    travelledPx,
    samples: frames.length,
    meanFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    maxFrameMs: frames.at(-1),
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    warsaw
      ? `test-results/performance-${fragment ?? 'praga'}.json`
      : 'test-results/performance.json',
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}

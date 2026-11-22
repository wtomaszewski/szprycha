import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import pl from '../i18n/pl.json' with { type: 'json' };

const viewport = /^(\d+)x(\d+)$/.exec(process.env.BENCH_VIEWPORT ?? '1280x720');
if (!viewport || !Number(viewport[1]) || !Number(viewport[2]))
  throw new Error('BENCH_VIEWPORT must use WIDTHxHEIGHT in pixels');
const [, width, height] = viewport;
const warsaw = process.env.BENCH_MAP === 'warszawa';
const map = warsaw ? 'warszawa' : 'miasteczko';
const fragment = process.env.BENCH_FRAGMENT ?? 'praga';
if (
  !['praga', 'most', 'starowka'].includes(fragment) ||
  (!warsaw && process.env.BENCH_FRAGMENT)
)
  throw new Error(`Unknown benchmark fragment: ${fragment}`);
const mode =
  process.env.BENCH_MODE ?? (fragment === 'praga' ? 'free' : 'mission');
if (mode !== 'free' && (mode !== 'mission' || fragment === 'praga'))
  throw new Error(`Unsupported benchmark mode: ${mode} (${fragment})`);
const orders = [
  'WAW-T-01',
  'WAW-T-02',
  'WAW-A1-01',
  'WAW-A1-02',
  'WAW-A1-03',
  'WAW-A1-04',
] as const;
const mission =
  mode === 'mission'
    ? fragment === 'most'
      ? 'WAW-A1-04'
      : 'WAW-A1-05'
    : undefined;
const spawn = !warsaw
  ? { x: 624, y: 1120, heading: -Math.PI / 2 }
  : mode === 'free' && fragment === 'most'
    ? { x: 2255, y: 352, heading: 0 }
    : mode === 'free' && fragment === 'starowka'
      ? { x: 3110, y: 688, heading: 0 }
      : undefined;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_CHROMIUM_PATH,
  args: process.env.BENCH_RENDERER === 'canvas' ? ['--disable-webgl'] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
  });
  if (spawn) {
    // Start on the route with the complete map and all its traffic.
    await page.route(
      new RegExp(`/(maps|assets)/${map}(?:-[^/]+)?\\.tmj(?:\\?|$)`),
      async (route) => {
        if (route.request().resourceType() === 'script')
          return route.continue();
        const response = await route.fetch();
        const tiled = await response.json();
        const player = tiled.layers
          .find(({ name }: { name: string }) => name === 'spawns')
          .objects.find(({ name }: { name: string }) => name === 'player');
        player.x = spawn.x;
        player.y = spawn.y;
        player.properties = [
          ...(player.properties ?? []).filter(
            ({ name }: { name: string }) => name !== 'heading',
          ),
          { name: 'heading', type: 'float', value: spawn.heading },
        ];
        await route.fulfill({ response, json: tiled });
      },
    );
  }
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
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  // Stick slightly off-centre for a continuous ride below the random event speed.
  const stick = await page.getByLabel(pl.driving.joystick).boundingBox();
  if (!stick) throw new Error('Missing steering control');
  await page.mouse.move(
    stick.x + stick.width * (warsaw ? 0.565 : 0.5),
    stick.y + stick.height * (warsaw ? 0.5 : 0.435),
  );
  await page.mouse.down();
  await page.waitForFunction(
    () => Number(document.querySelector('canvas')?.dataset.speed) > 0,
  );
  if (mission)
    await page.waitForFunction(
      (x) => Number(document.querySelector('canvas')?.dataset.x) >= x,
      mission === 'WAW-A1-04' ? 2255 : 3110,
      { timeout: 60_000 },
    );
  const axis = warsaw ? 'data-x' : 'data-y';
  const start = Number(await position.getAttribute(axis));
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
  await page.mouse.up();
  const end = Number(await position.getAttribute(axis));
  const travelledPx = warsaw ? end - start : start - end;
  if (travelledPx < 200 || (await page.locator('dialog[open]').count()))
    throw new Error(`${map} benchmark interrupted at ${axis}=${end}`);
  frames.sort((a, b) => a - b);
  const report = {
    date: new Date().toISOString(),
    environment: `Chromium headless, ${width}x${height}, CPU 4x`,
    renderer,
    map,
    fragment: warsaw ? fragment : undefined,
    mode,
    travelledPx,
    samples: frames.length,
    meanFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    maxFrameMs: frames.at(-1),
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    warsaw
      ? `test-results/performance-${fragment}${mode === 'free' && fragment !== 'praga' ? '-free' : ''}.json`
      : 'test-results/performance.json',
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
}

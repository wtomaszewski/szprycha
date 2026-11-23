import { legacyProgressKey } from '../src/core/progressStore';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import pl from '../i18n/pl.json' with { type: 'json' };

const runs = Number(process.env.BENCH_RUNS ?? 1);
if (!Number.isSafeInteger(runs) || runs < 1)
  throw new Error('BENCH_RUNS must be a positive integer');

const viewport = /^(\d+)x(\d+)$/.exec(process.env.BENCH_VIEWPORT ?? '1280x720');
if (!viewport || !Number(viewport[1]) || !Number(viewport[2]))
  throw new Error('BENCH_VIEWPORT must use WIDTHxHEIGHT in pixels');
const [, width, height] = viewport;
const light = process.env.BENCH_LIGHT ?? 'day';
if (light !== 'day' && light !== 'night')
  throw new Error('BENCH_LIGHT must be day or night');
const lite = process.env.BENCH_QUALITY === 'lite';
const rain = process.env.BENCH_RAIN === '1';
const requestedMap = process.env.BENCH_MAP ?? 'miasteczko';
if (
  requestedMap !== 'miasteczko' &&
  requestedMap !== 'warszawa' &&
  requestedMap !== 'wroclaw' &&
  requestedMap !== 'krakow'
)
  throw new Error(`Unknown benchmark map: ${requestedMap}`);
const map = requestedMap;
const warsaw = map === 'warszawa';
const wroclaw = map === 'wroclaw';
const fragment =
  process.env.BENCH_FRAGMENT ??
  (warsaw || map === 'miasteczko' ? 'praga' : 'rynek');
const missions = { most: 'WAW-A1-04', starowka: 'WAW-A1-05' } as const;
const warsawSpawns: Record<string, { x: number; y: number; heading: number }> =
  {
    most: { x: 2255, y: 352, heading: 0 },
    starowka: { x: 3110, y: 688, heading: 0 },
    srodmiescie: { x: 3570, y: 1808, heading: 0 },
    powisle: { x: 2930, y: 1690, heading: Math.PI / 2 },
    mokotow: { x: 3536, y: 3550, heading: -Math.PI / 2 },
  };
const wroclawSpawns: typeof warsawSpawns = {
  rynek: { x: 2976, y: 1792, heading: 0 },
  ostrow: { x: 2608, y: 1434, heading: -Math.PI / 2 },
  hala: { x: 4920, y: 2144, heading: Math.PI },
  poludnie: { x: 3030, y: 3056, heading: 0 },
  zachod: { x: 300, y: 800, heading: 0 },
  bulwary: { x: 1440, y: 1536, heading: 0 },
};
const krakowSpawns: typeof warsawSpawns = {
  rynek: { x: 1290, y: 808, heading: 0 },
  bulwary: { x: 2674, y: 2144, heading: 0 },
};
const freeSpawns =
  map === 'krakow' ? krakowSpawns : wroclaw ? wroclawSpawns : warsawSpawns;
if (
  (map === 'miasteczko' && process.env.BENCH_FRAGMENT) ||
  (map !== 'miasteczko' &&
    !(warsaw && fragment === 'praga') &&
    !Object.hasOwn(freeSpawns, fragment))
)
  throw new Error(`Unknown benchmark fragment: ${fragment}`);
const mode =
  process.env.BENCH_MODE ??
  (warsaw && Object.hasOwn(missions, fragment) ? 'mission' : 'free');
if (
  mode !== 'free' &&
  (mode !== 'mission' || !warsaw || !Object.hasOwn(missions, fragment))
)
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
  mode === 'mission' ? missions[fragment as keyof typeof missions] : undefined;
const spawn =
  map === 'miasteczko'
    ? { x: 624, y: 1120, heading: -Math.PI / 2 }
    : mode === 'free'
      ? freeSpawns[fragment]
      : undefined;
const heading = spawn?.heading ?? 0;
const horizontal = Math.abs(Math.cos(heading)) > 0.5;
const direction = horizontal
  ? Math.sign(Math.cos(heading))
  : Math.sign(Math.sin(heading));
const axis = horizontal ? 'data-x' : 'data-y';
async function runTrial() {
  const browser = await chromium.launch({
    executablePath: process.env.BENCH_CHROMIUM_PATH,
    args: process.env.BENCH_RENDERER === 'canvas' ? ['--disable-webgl'] : [],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: Number(width), height: Number(height) },
      hasTouch: true,
    });
    if (spawn || light === 'night') {
      // Start on the route with the complete map and all its traffic.
      await page.route(
        new RegExp(`/(maps|assets)/${map}(?:-[^/]+)?\\.tmj(?:\\?|$)`),
        async (route) => {
          if (route.request().resourceType() === 'script')
            return route.continue();
          const response = await route.fetch();
          const tiled = await response.json();
          if (light === 'night') {
            tiled.properties = [
              ...(tiled.properties ?? []).filter(
                ({ name }: { name: string }) =>
                  name !== 'dusk_at_s' && name !== 'dusk_free_ride_only',
              ),
              { name: 'dusk_at_s', type: 'float', value: 0 },
            ];
          }
          if (!spawn) return route.fulfill({ response, json: tiled });
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
    const completed =
      map === 'krakow'
        ? ['KRA-B-01', 'KRA-B-02', 'KRA-B-03']
        : mission === 'WAW-A1-04'
          ? orders.slice(0, -1)
          : mission
            ? orders
            : [];
    // Both revisions begin the benchmark on the same returning profile.
    await page.addInitScript(
      ({ key, completed }) =>
        localStorage.setItem(key, JSON.stringify({ completed })),
      { key: legacyProgressKey, completed },
    );
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(process.env.BENCH_URL ?? 'http://127.0.0.1:5173/');
    await page.locator('canvas[data-scene="MainMenu"]').waitFor();
    if (map !== 'miasteczko') {
      await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
      await page
        .getByRole('button', {
          name: pl.cityPicker[map],
          exact: true,
        })
        .click();
    } else await page.keyboard.press('Enter');
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
    if (light === 'night') await page.keyboard.press('KeyL');
    if (lite || rain) {
      await page.keyboard.press('Escape');
      if (lite)
        await page.getByRole('button', { name: pl.driving.full }).click();
      if (rain)
        await page.getByRole('button', { name: pl.driving.rain }).click();
      await page.keyboard.press('Escape');
    }
    // Stick slightly off-centre for a continuous ride below the random event speed.
    const stick = await page
      .locator('.touch-controls')
      .getByLabel(pl.driving.joystick)
      .boundingBox();
    if (!stick) throw new Error('Missing steering control');
    await page.mouse.move(
      stick.x + stick.width / 2,
      stick.y + stick.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      stick.x + stick.width * (horizontal ? 0.5 + direction * 0.065 : 0.5),
      stick.y + stick.height * (horizontal ? 0.5 : 0.5 + direction * 0.065),
    );
    await page.waitForFunction(
      () => Number(document.querySelector('canvas')?.dataset.speed) > 0,
    );
    if (mission)
      await page.waitForFunction(
        (x) => Number(document.querySelector('canvas')?.dataset.x) >= x,
        mission === 'WAW-A1-04' ? 2255 : 3110,
        { timeout: 60_000 },
      );
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
    const travelledPx = (end - start) * direction;
    if (
      !frames.length ||
      travelledPx < 200 ||
      (await page.locator('dialog[open]').count())
    )
      throw new Error(`${map} benchmark interrupted at ${axis}=${end}`);
    frames.sort((a, b) => a - b);
    return {
      date: new Date().toISOString(),
      environment: `Chromium ${browser.version()} headless, ${width}x${height}, CPU 4x`,
      renderer,
      map,
      fragment: map !== 'miasteczko' ? fragment : undefined,
      mode,
      light,
      quality: lite ? 'lite' : 'full',
      rain,
      travelledPx,
      samples: frames.length,
      meanFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
      p95FrameMs: frames[Math.floor(frames.length * 0.95)]!,
      maxFrameMs: frames.at(-1)!,
    };
  } finally {
    await browser.close();
  }
}

function summarize(values: number[]) {
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return {
    median:
      values.length % 2
        ? values[middle]
        : (values[middle - 1]! + values[middle]!) / 2,
    min: values[0],
    max: values.at(-1),
  };
}

const trials = [];
for (let trial = 0; trial < runs; trial++) {
  const result = await runTrial();
  trials.push(result);
  console.log(result);
}
const summary = {
  trials,
  meanFps: summarize(trials.map(({ meanFps }) => meanFps)),
  p95FrameMs: summarize(trials.map(({ p95FrameMs }) => p95FrameMs)),
};
if (runs > 1)
  console.log({ meanFps: summary.meanFps, p95FrameMs: summary.p95FrameMs });
await mkdir('test-results', { recursive: true });
const route = warsaw
  ? `-${fragment}${mode === 'free' && fragment !== 'praga' ? '-free' : ''}`
  : map !== 'miasteczko'
    ? `-${map}-${fragment}`
    : '';
await writeFile(
  `test-results/performance${route}${light === 'night' ? '-night' : ''}${lite ? '-lite' : ''}${rain ? '-rain' : ''}.json`,
  JSON.stringify(runs === 1 ? trials[0] : summary, null, 2),
);

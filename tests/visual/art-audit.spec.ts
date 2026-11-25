import { waitForMainMenu } from '../../tools/skip-tutorial';
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { chooseCity } from '../e2e/city-picker';
import { answer, parentZone } from '../e2e/helpers/parent-gate';
import { profile } from '../e2e/helpers/profile';

const phase = process.env.AUDIT_PHASE ?? 'po';
if (phase !== 'przed' && phase !== 'po')
  throw new Error('AUDIT_PHASE must be przed or po');
const folder = resolve(
  process.env.AUDIT_OUTPUT ?? 'docs/screenshots/audyt',
  phase,
);
const maps = {
  miasteczko: [624, 852],
  warszawa: [1000, 452],
  wroclaw: [3140, 1940],
} as const;
const laterMaps = {
  krakow: { missionId: 'KRA-B-01', point: [1616, 630] },
  gdansk: { missionId: 'GDA-B-01', point: [1660, 650] },
  wies: { missionId: 'WIE-B-01', point: [1280, 446] },
  poznan: { missionId: 'POZ-B-01', point: [1712, 700] },
  lodz: { missionId: 'LOD-B-01', point: [1780, 770] },
  zakopane: { missionId: 'ZAK-B-01', point: [1650, 810] },
} as const;
type LaterMap = keyof typeof laterMaps;
type MapId = keyof typeof maps | LaterMap;
const conditions = {
  dzien: ['day', 'clear', undefined],
  noc: ['night', 'clear', undefined],
  deszcz: ['day', 'rain_heavy', 'ulewa'],
  snieg: ['day', 'snow', 'snieg'],
  'noc-ulewa': ['night', 'rain_heavy', 'ulewa'],
} as const;
type Condition = keyof typeof conditions;
type MapLayer = {
  name: string;
  objects: {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
};

async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({
    path: resolve(folder, name + '.png'),
    animations: 'disabled',
    scale: 'css',
  });
}

async function moveStart(
  page: Page,
  map: MapId,
  x: number,
  y: number,
  mission = false,
) {
  await page.route(new RegExp('/maps/' + map + '\\.tmj$'), async (route) => {
    const response = await route.fetch();
    const tiled = await response.json();
    const layers: MapLayer[] = tiled.layers;
    const player = layers
      .find(({ name }) => name === 'spawns')!
      .objects.find(({ name }) => name === 'player')!;
    Object.assign(player, { x, y });
    if (mission) {
      const points = layers.find(({ name }) => name === 'pois')!.objects;
      const existing = points.find(({ name }) => name === 'tutorial_start');
      if (existing) Object.assign(existing, { x, y });
      else
        points.push({
          id: tiled.nextobjectid++,
          name: 'tutorial_start',
          x,
          y,
          width: 0,
          height: 0,
        });
      points.push({
        id: tiled.nextobjectid++,
        name: 'audit-target',
        x: x + 160,
        y,
        width: 0,
        height: 0,
      });
    }
    await route.fulfill({ response, json: tiled });
  });
}

async function auditWeather(
  page: Page,
  map: keyof typeof maps,
  condition: Condition,
  [x, y]: readonly [number, number] = maps[map],
  signalOutage?: boolean,
) {
  const city = map === 'wroclaw' ? 'wroclaw' : 'warszawa';
  const id = city === 'warszawa' ? 'WAW-T-01' : 'WRO-T-01';
  const [lighting, weather, precipitation] = conditions[condition];
  await moveStart(page, map, x, y, true);
  await page.route('**/data/content.json', async (route) => {
    const response = await route.fetch();
    const content: GameContent = await response.json();
    const mission = content.misje.find((item) => item.id === id)!;
    const objective = mission.cele.find((item) => item.typ === 'dojedz')!;
    mission.mapa = map;
    mission.start = {
      ...mission.start,
      kask_zapiety: true,
      noc: lighting === 'night' ? true : undefined,
      pogoda: precipitation,
      awaria_swiatel: signalOutage,
    };
    mission.cele = [{ ...objective, poi: 'audit-target' }];
    mission.checkpointy = [];
    mission.zdarzenia_wymuszone = [];
    await route.fulfill({ response, json: content });
  });
  await page.goto('/');
  await waitForMainMenu(page);
  await chooseCity(page, city, 'campaign');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  if (lighting === 'night') await page.keyboard.press('KeyL');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map', map);
  await expect(canvas).toHaveAttribute('data-x', String(x));
  await expect(canvas).toHaveAttribute('data-y', String(y));
  await expect(canvas).toHaveAttribute('data-lighting', lighting);
  await expect(canvas).toHaveAttribute('data-weather', weather);
}

for (const map of Object.keys(maps) as (keyof typeof maps)[])
  for (const condition of ['dzien', 'noc', 'deszcz', 'snieg'] as const)
    test(map + ' ' + condition, async ({ page }) => {
      await auditWeather(page, map, condition);
      await screenshot(page, map + '-' + condition);
    });

async function auditLaterMap(
  page: Page,
  map: LaterMap,
  condition: Condition,
  [x, y]: readonly [number, number] = laterMaps[map].point,
) {
  const { missionId } = laterMaps[map];
  const [lighting, weather, precipitation] = conditions[condition];
  await moveStart(page, map, x, y, true);
  await page.route('**/data/content.json', async (route) => {
    const response = await route.fetch();
    const content: GameContent = await response.json();
    const mission = content.misje.find((item) => item.id === missionId)!;
    const objective = mission.cele.find((item) => item.typ === 'dojedz')!;
    mission.start = {
      poi: 'tutorial_start',
      kask_zapiety: true,
      noc: lighting === 'night' ? true : undefined,
      pogoda: precipitation,
    };
    mission.cele = [{ ...objective, poi: 'audit-target' }];
    mission.checkpointy = [];
    mission.zdarzenia_wymuszone = [];
    mission.skrot = undefined;
    mission.dialog_start = undefined;
    mission.ruch_ai = true;
    await route.fulfill({ response, json: content });
  });

  await page.goto('/');
  await waitForMainMenu(page);
  await chooseCity(page, map, 'campaign');
  const skip = page.getByRole('button', { name: pl.dialogueUi.skip });
  if (await skip.isVisible()) await skip.click();
  await expect(skip).toBeHidden();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map', map);
  await expect(canvas).toHaveAttribute('data-x', String(x));
  await expect(canvas).toHaveAttribute('data-y', String(y));
  await expect(canvas).toHaveAttribute('data-lighting', lighting);
  await expect(canvas).toHaveAttribute('data-weather', weather);
  if (lighting === 'night') await page.keyboard.press('KeyL');
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const { width, height } = element.getBoundingClientRect();
        const scale = (width * devicePixelRatio) / element.width;
        return (
          Number.isInteger(scale) &&
          scale > 0 &&
          height * devicePixelRatio === element.height * scale
        );
      }),
    )
    .toBe(true);
}

test.describe('audyt #181', () => {
  test.describe.configure({ mode: 'parallel' });
  for (const device of ['desktop', 'telefon'] as const) {
    test.describe(device, () => {
      if (device === 'telefon')
        test.use({
          viewport: { width: 740, height: 390 },
          hasTouch: true,
          isMobile: true,
        });
      for (const map of Object.keys(laterMaps) as LaterMap[])
        for (const condition of ['dzien', 'noc', 'deszcz', 'snieg'] as const)
          test(`${map} ${condition}`, async ({ page }) => {
            await auditLaterMap(page, map, condition);
            if (device === 'telefon')
              await expect(
                page.getByLabel(pl.driving.joystick).filter({ visible: true }),
              ).toBeVisible();
            await screenshot(page, `181-${map}-${condition}-${device}`);
          });
    });
  }
});

const roadViews = [
  ['krakow', 'snieg', [1440, 1016]],
  ['gdansk', 'noc', [1024, 1110]],
  ['wies', 'deszcz', [1088, 1128]],
  ['poznan', 'snieg', [2504, 652]],
  ['lodz', 'noc', [2824, 1088]],
  ['zakopane', 'deszcz', [1840, 1056]],
] as const;

test.describe('oznakowanie #181', () => {
  test.describe.configure({ mode: 'parallel' });
  test.use({ reducedMotion: 'no-preference' });
  for (const [map, condition, point] of roadViews)
    test(`${map} ${condition}`, async ({ page }) => {
      await auditLaterMap(page, map, condition, point);
      await screenshot(page, `181-${map}-oznakowanie`);
    });
});

const landmarkViews = [
  ['krakow', 'wawel', [1656, 1616]],
  ['gdansk', 'zuraw', [1716, 1776]],
  ['wies', 'skansen', [2248, 1432]],
  ['lodz', 'fabryka', [2864, 1500]],
  ['zakopane', 'giewont', [1464, 790]],
] as const;

test.describe('sylwetki #181', () => {
  test.describe.configure({ mode: 'parallel' });
  for (const [map, place, point] of landmarkViews)
    test(`${map} ${place}`, async ({ page }) => {
      await auditLaterMap(page, map, 'dzien', point);
      await screenshot(page, `181-${map}-${place}`);
    });
});

const signViews = [
  ['warszawa', 'praga', [1115, 445]],
  ['wroclaw', 'rynek', [3432, 1720]],
] as const;

for (const [map, place, point] of signViews) {
  test.describe(`oznakowanie ${place}`, () => {
    test.use({ reducedMotion: 'no-preference' });
    for (const condition of ['dzien', 'noc', 'deszcz'] as const)
      test(condition, async ({ page }) => {
        await auditWeather(page, map, condition, point);
        await screenshot(page, `${place}-${condition}`);
      });

    test.describe('na telefonie', () => {
      test.use({
        viewport: { width: 640, height: 360 },
        hasTouch: true,
        isMobile: true,
      });
      test('noc i ulewa', async ({ page }) => {
        await auditWeather(page, map, 'noc-ulewa', point);
        await expect(
          page.getByLabel(pl.driving.joystick).filter({ visible: true }),
        ).toBeVisible();
        await screenshot(page, `${place}-telefon`);
      });
    });
  });
}

test.describe('sygnalizacja na Rynku na telefonie', () => {
  test.use({
    viewport: { width: 640, height: 360 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  });

  for (const outage of [false, true])
    test(outage ? 'wygaszona' : 'zielona', async ({ page }) => {
      await auditWeather(page, 'wroclaw', 'noc-ulewa', [3432, 1720], outage);
      const canvas = page.locator('canvas');
      // Bike head at (3532, 1684) with the 0.75× riding camera at (3432, 1720).
      await expect
        .poll(async () => {
          const frame = PNG.sync.read(
            await canvas.screenshot({ scale: 'css' }),
          );
          let green = 0;
          for (let y = 149; y <= 157; y++)
            for (let x = 390; x <= 400; x++) {
              const i = (y * frame.width + x) * 4;
              const [r, g, b] = frame.data.subarray(i, i + 3);
              if (g! > r! + 24 && g! > b! + 24) green++;
            }
          return green >= 5;
        })
        .toBe(!outage);
    });
});

const landmarks = [
  ['miasteczko', 'palac', 815, 1125],
  ['warszawa', 'srodmiescie', 3570, 1720],
  ['warszawa', 'starowka', 3505, 415],
  ['warszawa', 'stadion', 1780, 3260],
  ['wroclaw', 'ratusz', 3120, 2245],
  ['wroclaw', 'ostrow', 2860, 1405],
  ['wroclaw', 'hala', 5072, 616],
  ['wroclaw', 'sky-tower', 2240, 3056],
  ['wroclaw', 'stadion', 610, 727],
] as const;
function auditLandmarks(
  views: readonly (readonly [MapId, string, number, number])[],
) {
  for (const [map, name, x, y] of views)
    test(map + ' landmark ' + name, async ({ page }) => {
      await moveStart(page, map, x, y);
      await page.goto('/');
      await waitForMainMenu(page);
      if (map === 'miasteczko') await page.keyboard.press('Enter');
      else await chooseCity(page, map);
      await expect(page.locator('canvas')).toHaveAttribute('data-x', String(x));
      await screenshot(page, map + '-' + name);
    });
}

auditLandmarks(landmarks);

test.describe('landmarki #109', () => {
  auditLandmarks([
    ['warszawa', 'palac-na-wodzie', 3868, 2834],
    ['wroclaw', 'afrykarium', 5190, 2482],
  ]);
  test.describe('szerszy kadr', () => {
    test.use({ viewport: { width: 1280, height: 700 } });
    auditLandmarks([
      ['warszawa', 'stadion-narodowy', 1620, 2960],
      ['wroclaw', 'pergola-hali', 5350, 286],
    ]);
  });
});

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

test('menu, picker, quiz, exam, album and parent zone', async ({ page }) => {
  await moveStart(page, 'miasteczko', 364, 1260);
  await page.goto('/');
  await waitForMainMenu(page);
  await screenshot(page, 'menu');
  await button(page, pl.cityPicker.freeRide).click();
  await expect(button(page, pl.cityPicker.warszawa)).toBeVisible();
  await screenshot(page, 'wybor-miasta');
  await button(page, pl.cityPicker.back).click();

  await button(page, pl.quiz.title).click();
  await expect(page.getByText(pl.quiz.locked, { exact: true })).toBeVisible();
  const data = await page.request.get('/data/content.json');
  const content: GameContent = await data.json();
  await profile(page, {
    nickname: 'Szybki Jeż 1',
    missionPoints: 40_000,
    quiz: {
      streak: 0,
      cards: Object.fromEntries(
        content.pytania.pytania
          .filter(({ id, modul }) => modul === 'M03' && id !== 'Q024')
          .map(({ id }) => [id, { box: 1, due: '2099-01-01' }]),
      ),
    },
    licencePassed: true,
    licence: {
      date: '2026-11-23',
      theory: { correct: 20, total: 20 },
      practice: { points: 100, max: 100 },
    },
    completed: content.misje
      .filter(({ miasto, poboczna }) => miasto === 'warszawa' && !poboczna)
      .map(({ id }) => id),
    mastery: Object.fromEntries(
      content.przepisy.przepisy.map(({ id }) => [
        id,
        { value: 70, goodToday: 0 },
      ]),
    ),
  });
  await page.reload();

  await button(page, pl.quiz.title).click();
  await button(page, `${pl.skillMap.modules.M03} · 1`).click();
  await expect(page.locator('.question-signs img').first()).toBeVisible();
  await screenshot(page, 'quiz');
  await button(page, pl.quiz.close).click();
  await button(page, pl.exam.menu).click();
  const exam = page.getByRole('dialog', { name: pl.exam.title });
  const certificate = page.getByRole('dialog', { name: pl.exam.licence });
  await exam.getByRole('button', { name: pl.exam.certificate }).click();
  await expect(certificate).toBeVisible();
  await screenshot(page, 'licencja-szprychy');
  await certificate
    .getByRole('button', { name: pl.quiz.close, exact: true })
    .click();
  await exam.getByRole('button', { name: pl.exam.startTheory }).click();
  await expect(exam.getByRole('progressbar')).toBeVisible();
  await screenshot(page, 'egzamin');
  await exam.getByRole('button', { name: pl.quiz.close, exact: true }).click();

  await button(page, pl.driving.title).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-x', '364');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await button(page, pl.m5c.camera).click();
  await expect(page.getByText(pl.m5c.photoSaved)).toBeVisible();
  await page.reload();
  await button(page, pl.m5c.album).click();
  await expect(
    page.getByRole('img', { name: 'STOP', exact: true }),
  ).toBeVisible();
  await screenshot(page, 'album');
  await button(page, pl.m5c.close).click();

  const { open, gate, settings } = parentZone(page);
  await open.click();
  await expect(gate).toBeVisible();
  await screenshot(page, 'strefa-bramka');
  await answer(gate, (key) => key.click());
  await expect(settings).toBeVisible();
  await screenshot(page, 'strefa-rodzica');
});

test('progress, settings and licence screens', async ({ page }) => {
  await page.goto('/');
  await waitForMainMenu(page);
  for (const [name, title, close] of [
    ['mapa-umiejetnosci', pl.skillMap.title, pl.skillMap.close],
    ['osiagniecia', pl.m5c.achievements, pl.m5c.close],
    ['wyzwania', pl.m5c.daily, pl.m5c.close],
  ] as const) {
    await button(page, title).click();
    await expect(page.getByRole('dialog', { name: title })).toBeVisible();
    await screenshot(page, name);
    await button(page, close).click();
  }
  await button(page, pl.settings.title).click();
  await expect(
    page.getByRole('dialog', { name: pl.settings.title }),
  ).toBeVisible();
  await screenshot(page, 'ustawienia');
  const settings = page.getByRole('dialog', { name: pl.settings.title });
  await settings.getByRole('button', { name: pl.aboutGame.title }).click();
  const about = page.getByRole('dialog', { name: pl.aboutGame.title });
  await expect(about).toBeVisible();
  await screenshot(page, 'o-grze');
  await about.getByText(pl.aboutGame.thirdParty, { exact: true }).click();
  await expect(about.locator('pre')).toBeVisible();
  await screenshot(page, 'licencje');
});

test('practice yard and results', async ({ page }) => {
  await page.goto('/');
  await waitForMainMenu(page);
  await button(page, pl.plac.title).click();
  const canvas = page.locator('canvas[data-scene="Plac"]');
  await page
    .getByRole('combobox', { name: pl.plac.exercise })
    .selectOption('PLAC-03');
  await button(page, pl.plac.start).click();
  await expect(canvas).toHaveAttribute('data-plac-exercise', 'PLAC-03');
  await screenshot(page, 'plac');
  await page.keyboard.down('ArrowUp');
  await expect(canvas).toHaveAttribute('data-plac-grade', 'good', {
    timeout: 15_000,
  });
  await page.keyboard.up('ArrowUp');
  await expect(
    page.getByRole('heading', { name: pl.plac.completed }),
  ).toBeVisible();
  await screenshot(page, 'wyniki-placu');
});

test('mission dialogue and results', async ({ page }) => {
  await page.route('**/data/content.json', async (route) => {
    const response = await route.fetch();
    const content: GameContent = await response.json();
    const mission = content.misje.find(({ id }) => id === 'WAW-T-01')!;
    const objective = mission.cele.find((item) => item.typ === 'dojedz')!;
    mission.start.kask_zapiety = true;
    mission.cele = [{ ...objective, poi: mission.start.poi }];
    mission.zdarzenia_wymuszone = [];
    await route.fulfill({ response, json: content });
  });
  await page.goto('/');
  await waitForMainMenu(page);
  await chooseCity(page, 'warszawa', 'campaign');
  await expect(
    page.getByRole('dialog', { name: pl.dialogueUi.title }),
  ).toBeVisible();
  await screenshot(page, 'dialog');
  await button(page, pl.dialogueUi.skip).click();
  await button(page, pl.dialogueUi.skip).click();
  await expect(
    page.getByRole('region', { name: pl.missionUi.result }),
  ).toBeVisible();
  await screenshot(page, 'wyniki-misji');
});

test('typography in Ola’s tutorial and the riding HUD', async ({ page }) => {
  await moveStart(page, 'miasteczko', 2170, 637);
  await page.goto('/');
  const tutorial = page.getByRole('region', { name: pl.tutorial.title });
  await expect(tutorial).toBeVisible();
  await screenshot(page, 'dymek-oli');
  await waitForMainMenu(page);
  await button(page, pl.driving.title).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-x', '2170');
  await screenshot(page, 'hud');
});

test('typography in a 360×640 window', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await waitForMainMenu(page);
  await screenshot(page, 'menu-360x640');
});

test.describe('landscape phone', () => {
  test.use({
    viewport: { width: 640, height: 360 },
    hasTouch: true,
    isMobile: true,
  });
  test('menu, ride and pause, then pause in portrait', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await screenshot(page, 'telefon-menu');
    const { open, gate, settings } = parentZone(page);
    await open.tap();
    await answer(gate, (key) => key.tap());
    await expect(settings).toBeVisible();
    await screenshot(page, 'telefon-strefa-rodzica');
    await settings
      .getByRole('button', { name: pl.m5c.close, exact: true })
      .tap();
    await chooseCity(page, 'warszawa');
    await expect(
      page.getByLabel(pl.driving.joystick).filter({ visible: true }),
    ).toBeVisible();
    await screenshot(page, 'telefon-jazda');
    await button(page, pl.driving.pause).tap();
    await expect(
      page.getByRole('dialog', { name: pl.driving.paused }),
    ).toBeVisible();
    await screenshot(page, 'telefon-pauza');
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(
      page.getByRole('dialog', { name: pl.driving.paused }),
    ).toBeVisible();
    await screenshot(page, 'telefon-pauza-pion');
  });
});

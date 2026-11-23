import { waitForMainMenu } from '../../tools/skip-tutorial';
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
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
type MapId = keyof typeof maps;
const conditions = {
  dzien: ['day', 'clear', undefined],
  noc: ['night', 'clear', undefined],
  deszcz: ['day', 'rain_heavy', 'ulewa'],
  snieg: ['day', 'snow', 'snieg'],
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

async function auditWeather(page: Page, map: MapId, condition: Condition) {
  const city = map === 'wroclaw' ? 'wroclaw' : 'warszawa';
  const id = city === 'warszawa' ? 'WAW-T-01' : 'WRO-T-01';
  const [x, y] = maps[map];
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
      noc: condition === 'noc' ? true : undefined,
      pogoda: conditions[condition][2],
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
  if (condition === 'noc') await page.keyboard.press('KeyL');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map', map);
  await expect(canvas).toHaveAttribute('data-x', String(maps[map][0]));
  await expect(canvas).toHaveAttribute(
    'data-lighting',
    conditions[condition][0],
  );
  await expect(canvas).toHaveAttribute(
    'data-weather',
    conditions[condition][1],
  );
}

for (const map of Object.keys(maps) as MapId[])
  for (const condition of Object.keys(conditions) as Condition[])
    test(map + ' ' + condition, async ({ page }) => {
      await auditWeather(page, map, condition);
      await screenshot(page, map + '-' + condition);
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
for (const [map, name, x, y] of landmarks)
  test(map + ' landmark ' + name, async ({ page }) => {
    await moveStart(page, map, x, y);
    await page.goto('/');
    await waitForMainMenu(page);
    if (map === 'miasteczko') await page.keyboard.press('Enter');
    else await chooseCity(page, map);
    await expect(page.locator('canvas')).toHaveAttribute('data-x', String(x));
    await screenshot(page, map + '-' + name);
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
  test('menu, ride and pause, then the portrait prompt', async ({ page }) => {
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
      page.getByText(pl.driving.rotate, { exact: true }),
    ).toBeVisible();
    await screenshot(page, 'telefon-obroc');
  });
});

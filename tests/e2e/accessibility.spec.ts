import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import questions from '../../content/pytania.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { chooseCity, cityPin, startAt, waitForCity } from './city-picker';
import { mockGamepad } from './helpers/gamepad';
import { answer, parentZone } from './helpers/parent-gate';
import { profile, seedProgress } from './helpers/profile';
import { shiftPois } from './helpers/shift-pois';

function button(scope: Page | Locator, name: string) {
  return scope.getByRole('button', { name, exact: true });
}

function dialog(page: Page, name: string) {
  return page.getByRole('dialog', { name, exact: true });
}

function ratio(foreground: string, background: string) {
  function luminance(color: string) {
    const components = color.startsWith('#')
      ? color
          .slice(1)
          .match(/../g)!
          .map((value) => parseInt(value, 16))
      : color.match(/\d+/g)!.slice(0, 3).map(Number);
    const linear = components.map((component) => {
      const value = component / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  }
  const levels = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (levels[0]! + 0.05) / (levels[1]! + 0.05);
}

async function auditPalette(scope: Locator) {
  const palette = await scope.evaluate((element) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      ['bg', 'panel', 'text', 'muted', 'accent', 'cyan', 'border'].map(
        (token) => [token, style.getPropertyValue(`--ui-${token}`).trim()],
      ),
    );
  });
  for (const surface of ['bg', 'panel'])
    for (const [foreground, minimum] of [
      ['text', 4.5],
      ['muted', 4.5],
      ['accent', 4.5],
      ['cyan', 4.5],
      ['border', 3],
    ] as const)
      expect
        .soft(
          ratio(palette[foreground]!, palette[surface]!),
          `${foreground} / ${surface}`,
        )
        .toBeGreaterThanOrEqual(minimum);
}

async function audit(page: Page, scope: Locator, name: string) {
  await expect(scope).toBeVisible();
  await expect(scope).toHaveAccessibleName(name);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const problems = results.violations.flatMap(({ id, nodes }) =>
    nodes.map(({ target, failureSummary }) => ({ id, target, failureSummary })),
  );
  expect.soft(problems, name).toEqual([]);
  await auditPalette(scope);
  if (await scope.evaluate((element) => element instanceof HTMLDialogElement)) {
    const sizes = await scope.evaluate((element) => {
      const root = document.documentElement;
      const previousSize = root.style.fontSize;
      root.style.fontSize = '200%';
      const { scrollWidth, clientWidth, scrollHeight, clientHeight } = element;
      const { overflowY } = getComputedStyle(element);
      root.style.fontSize = previousSize;
      return {
        scrollWidth,
        clientWidth,
        scrollHeight,
        clientHeight,
        overflowY,
      };
    });
    expect
      .soft(sizes.scrollWidth, name)
      .toBeLessThanOrEqual(sizes.clientWidth + 1);
    if (sizes.scrollHeight > sizes.clientHeight)
      expect.soft(sizes.overflowY, name).toMatch(/auto|scroll/);
  }
}

async function useKeyboard(page: Page, target: Locator) {
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
}

async function expectFocusLoop(page: Page, first: Locator, last: Locator) {
  await first.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
}

test('menu, wybór miasta, Pomoc, Plac i kolejność fokusu', async ({ page }) => {
  await page.goto('/');
  await audit(page, page.getByRole('main'), pl.title);
  const campaign = button(page, pl.cityPicker.campaign);
  await page.keyboard.press('Tab');
  await expect(campaign).toBeFocused();
  const focusRing = await campaign.evaluate((node) => {
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(node);
    const backgroundColor = getComputedStyle(
      node.closest('main')!,
    ).backgroundColor;
    return { outlineStyle, outlineWidth, outlineColor, backgroundColor };
  });
  expect(focusRing.outlineStyle).toBe('solid');
  expect(parseFloat(focusRing.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(
    ratio(focusRing.outlineColor, focusRing.backgroundColor),
  ).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Tab');
  await expect(button(page, pl.cityPicker.freeRide)).toBeFocused();
  await useKeyboard(page, campaign);
  await audit(page, page.getByRole('main'), pl.cityPicker.title);
  await expect(button(page, pl.cityPicker.warszawa)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(page, pl.cityPicker.wroclaw)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(campaign).toBeFocused();
  await useKeyboard(page, button(page, pl.tutorial.help));
  await audit(page, dialog(page, pl.tutorial.help), pl.tutorial.help);
  await page.keyboard.press('Escape');
  await expect(button(page, pl.tutorial.help)).toBeFocused();
  await useKeyboard(page, button(page, pl.plac.title));
  await audit(page, dialog(page, pl.plac.title), pl.plac.title);
});

test('Album, Mapa Umiejętności, Strefa Rodzica, Ustawienia i O grze', async ({
  page,
}) => {
  test.setTimeout(55_000);
  await page.goto('/');
  for (const name of [
    pl.m5c.album,
    pl.m5c.achievements,
    pl.m5c.daily,
    pl.skillMap.title,
    pl.settings.title,
    pl.aboutGame.title,
  ]) {
    const trigger = button(page, name);
    await useKeyboard(page, trigger);
    const panel = dialog(page, name);
    await audit(page, panel, name);
    if (name === pl.m5c.album) {
      const close = button(panel, pl.m5c.close);
      const last = panel.locator('summary').last();
      await expectFocusLoop(page, close, last);
      await page.keyboard.press('Escape');
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  }

  const parent = parentZone(page);
  await useKeyboard(page, parent.open);
  await audit(page, parent.gate, pl.parentZone.gateTitle);
  await answer(parent.gate, (digit) => useKeyboard(page, digit));
  await audit(page, parent.settings, pl.parentZone.title);
  await useKeyboard(page, button(parent.settings, pl.aboutGame.title));
  const nested = dialog(page, pl.aboutGame.title);
  await expect(nested).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button(parent.settings, pl.aboutGame.title)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(parent.open).toBeFocused();
});

test('quiz i egzamin: pytania, dostępne nazwy oraz informacja zwrotna', async ({
  page,
}) => {
  await page.goto('/');
  await expect(button(page, pl.quiz.title)).toBeVisible();
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  await profile(page, {
    missionPoints: 40_000,
    completed: content.misje
      .filter(({ miasto, poboczna }) => miasto === 'warszawa' && !poboczna)
      .map(({ id }) => id),
    mastery: Object.fromEntries(
      content.przepisy.przepisy.map(({ id }) => [
        id,
        { value: 90, goodToday: 0 },
      ]),
    ),
    quiz: {
      cards: Object.fromEntries(
        content.pytania.pytania.map(({ id }) => [
          id,
          { box: 5, due: '2000-01-01' },
        ]),
      ),
      streak: 4,
    },
  });
  await page.reload();
  const quiz = dialog(page, pl.quiz.title);
  await useKeyboard(page, button(page, pl.quiz.title));
  await useKeyboard(page, button(quiz, `${pl.quiz.quick} · 10`));
  await audit(page, quiz, pl.quiz.title);
  await expect(quiz.getByRole('progressbar')).toHaveAccessibleName(/1 \/ 10/);
  await page.keyboard.press('Tab');
  const first = quiz.locator('.quiz-answers button').first();
  await expect(first).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(quiz.locator('.quiz-feedback')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(quiz, pl.quiz.next)).toBeFocused();
  await audit(page, quiz, pl.quiz.title);
  await page.keyboard.press('Escape');

  await useKeyboard(page, button(page, pl.exam.menu));
  const exam = dialog(page, pl.exam.title);
  await audit(page, exam, pl.exam.title);
  await expect(
    exam.getByRole('heading', { name: pl.exam.title }),
  ).toBeVisible();
  await useKeyboard(page, button(exam, pl.exam.startTheory));
  await expect(exam.getByRole('progressbar')).toHaveAccessibleName(/1 \/ 25/);
  await audit(page, exam, pl.exam.title);
});

test('HUD, SzprychaApp, pauza, dialog fabularny i stop-klatka', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  const story = dialog(page, pl.dialogueUi.title);
  await audit(page, story, pl.dialogueUi.title);
  await useKeyboard(page, button(story, pl.dialogueUi.skip));

  const hud = page.getByRole('main', { name: pl.driving.controls });
  await audit(page, hud, pl.driving.controls);
  await expect(
    hud.getByLabel(pl.progression.points, { exact: true }),
  ).toHaveAttribute('aria-live', 'off');
  await expect(
    hud.getByLabel(pl.progression.series, { exact: true }),
  ).toHaveAttribute('aria-live', 'polite');
  await expect(
    hud.getByLabel(pl.progression.attention, { exact: true }),
  ).toHaveAttribute('aria-live', 'polite');
  await expect(hud.getByLabel(pl.missionUi.timer)).toHaveAttribute(
    'aria-live',
    'off',
  );
  await expect(
    hud.getByRole('img', {
      name: new RegExp(
        `${pl.missionUi.direction} · (?:${pl.missionUi.compass.join('|')}) · \\d+ m`,
      ),
    }),
  ).toBeVisible();

  const hudContrast = await hud
    .locator('.mission-bearing')
    .evaluate((arrow) => {
      const icon = arrow.closest('main')!.querySelector('.ride-status-icon')!;
      return {
        arrow: getComputedStyle(arrow, '::after').backgroundColor,
        arrowBg: getComputedStyle(arrow).backgroundColor,
        icon: getComputedStyle(icon).backgroundColor,
        iconBg: getComputedStyle(icon.closest('.ride-status')!).backgroundColor,
      };
    });
  expect(ratio(hudContrast.arrow, hudContrast.arrowBg)).toBeGreaterThanOrEqual(
    3,
  );
  expect(ratio(hudContrast.icon, hudContrast.iconBg)).toBeGreaterThanOrEqual(3);

  await page.keyboard.press('KeyM');
  const phone = dialog(page, pl.phone.title);
  await audit(page, phone, pl.phone.title);
  await expectFocusLoop(
    page,
    button(phone, pl.phone.close),
    button(phone, pl.phone.close),
  );
  await page.keyboard.press('Escape');
  const phoneTrigger = button(page, pl.phone.open);
  await expect(phoneTrigger).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(phoneTrigger).toBeFocused();
  await page.keyboard.press('Space');
  await expect(phone).toBeVisible();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Escape');
  const pause = dialog(page, pl.driving.paused);
  await audit(page, pause, pl.driving.paused);
  await page.keyboard.press('Escape');
  await useKeyboard(page, button(page, pl.missionUi.equip));
  await page.keyboard.down('ArrowUp');
  const replay = dialog(page, pl.replay.title);
  await expect(replay).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await audit(page, replay, pl.replay.title);
  const reason = await replay.locator('#replay-reason').textContent();
  const tip = await replay.locator('#replay-feedback').textContent();
  expect(reason).toBeTruthy();
  expect(tip).toBeTruthy();
  await expect(replay).toHaveAccessibleDescription(`${reason} ${tip}`);
});

for (const source of ['system', 'profile'] as const) {
  test(`OBLAŁEŚ!, wyniki i ograniczenie ruchu (${source})`, async ({
    page,
  }) => {
    test.setTimeout(55_000);
    await page.emulateMedia({
      reducedMotion: source === 'system' ? 'reduce' : 'no-preference',
    });
    await page.goto('/');
    if (source === 'profile') {
      const settings = dialog(page, pl.settings.title);
      await useKeyboard(page, button(page, pl.settings.title));
      const reduce = settings.getByRole('checkbox', {
        name: pl.settings.reducedEffects,
      });
      await reduce.focus();
      await page.keyboard.press('Space');
      await expect(reduce).toBeChecked();
      await page.keyboard.press('Escape');
    }
    await chooseCity(page, 'warszawa', 'campaign');
    const story = dialog(page, pl.dialogueUi.title);
    await useKeyboard(page, button(story, pl.dialogueUi.skip));
    await page.keyboard.down('ArrowUp');
    const failure = dialog(page, pl.missionFailure.title);
    await expect(failure).toBeVisible();
    await page.keyboard.up('ArrowUp');
    await audit(page, failure, pl.missionFailure.title);
    await expect(failure).toHaveAccessibleDescription(/Poważny błąd.*kask/i);
    await expect(failure.locator('.mission-failure-stamp')).toHaveCSS(
      'animation-name',
      'none',
    );
    await expectFocusLoop(
      page,
      button(failure, pl.missionFailure.retry),
      button(failure, pl.missionFailure.exit),
    );

    await useKeyboard(page, button(failure, pl.missionFailure.retry));
    await useKeyboard(page, button(story, pl.dialogueUi.skip));
    await useKeyboard(page, button(page, pl.missionUi.equip));
    await page.keyboard.down('ArrowUp');
    const canvas = page.locator('canvas[data-scene="City"]');
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-y')), {
        intervals: [25, 50, 75],
      })
      .toBeGreaterThanOrEqual(1184);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.down('Space');
    await expect(canvas).toHaveAttribute('data-stop-ready', 'true');
    await page.keyboard.up('Space');
    await page.keyboard.down('ArrowUp');
    await expect(story).toBeVisible();
    await page.keyboard.up('ArrowUp');
    await useKeyboard(page, button(story, pl.dialogueUi.skip));
    const results = dialog(page, pl.missionUi.completed);
    await audit(page, results, pl.missionUi.completed);
    await expect(results.locator('.mission-confetti')).toBeHidden();
    await expect(button(results, pl.missionResults.skip)).toBeHidden();
  });
}

test.describe('pierwsze uruchomienie', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('samouczek nowego profilu ma nazwane wskazówki i przyciski', async ({
    page,
  }) => {
    await page.goto('/');
    await audit(
      page,
      page.getByRole('region', { name: pl.tutorial.title }),
      pl.tutorial.title,
    );
    await useKeyboard(page, button(page, pl.tutorial.skip));
    await expect(page.getByRole('main', { name: pl.title })).toBeVisible();
  });
});

test.describe('200% tekstu i nawigacja padem', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('dwukrotnie powiększony tekst i przewijanie dialogów', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('main', { name: pl.title })).toBeVisible();
    const settings = dialog(page, pl.settings.title);
    await useKeyboard(page, button(page, pl.settings.title));
    const close = button(settings, pl.m5c.close);
    const originalSize = await close.evaluate((node) =>
      parseFloat(getComputedStyle(node).fontSize),
    );
    await useKeyboard(page, close);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await useKeyboard(page, button(page, pl.settings.title));
    await expect(close).toHaveCSS('font-size', `${2 * originalSize}px`);
    const about = dialog(page, pl.aboutGame.title);
    for (const scroller of [settings.locator('header + div'), about]) {
      await expect(scroller).toBeVisible();
      const layout = await scroller.evaluate((node) => ({
        width: node.clientWidth,
        contentWidth: node.scrollWidth,
        height: node.clientHeight,
        contentHeight: node.scrollHeight,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.contentHeight).toBeGreaterThan(layout.height);
      if (scroller !== about)
        await useKeyboard(page, button(settings, pl.aboutGame.title));
    }
    await page.keyboard.press('Escape');
    await expect(button(settings, pl.aboutGame.title)).toBeInViewport();
    await expect(button(settings, pl.aboutGame.title)).toBeFocused();
  });

  test('pad wybiera miasto, otwiera telefon, przechodzi przez pauzę i zmienia ustawienie', async ({
    page,
  }) => {
    const { tap } = await mockGamepad(page);
    await page.goto('/');
    await expect(page.getByRole('main', { name: pl.title })).toBeVisible();
    await page.mouse.click(15, 15);
    await tap(13);
    await expect(button(page, pl.cityPicker.campaign)).toBeFocused();
    await expect(button(page, pl.cityPicker.campaign)).toHaveCSS(
      'outline-width',
      '3px',
    );
    await tap(13);
    await expect(button(page, pl.cityPicker.freeRide)).toBeFocused();
    await tap(0);
    await expect(button(page, pl.cityPicker.warszawa)).toBeFocused();
    await tap(13);
    await expect(button(page, pl.cityPicker.wroclaw)).toBeFocused();
    await tap(0);
    await expect(page.locator('canvas[data-scene="City"]')).toHaveAttribute(
      'data-map',
      'wroclaw',
    );
    await tap(8);
    const phone = dialog(page, pl.phone.title);
    await expect(phone).toBeVisible();
    await tap(1);
    await expect(phone).toBeHidden();
    await tap(9);
    const pause = dialog(page, pl.driving.paused);
    await expect(button(pause, pl.driving.resume)).toBeFocused();
    await tap(13);
    const scheme = button(pause, pl.driving.classic);
    await expect(scheme).toBeFocused();
    await tap(0);
    await expect(button(pause, pl.driving.simple)).toBeFocused();
    await tap(1);
    await expect(pause).toBeHidden();
  });
});

const pickerCities = [
  'warszawa',
  'wroclaw',
  'gdansk',
  'poznan',
  'lodz',
  'krakow',
  'zakopane',
  'wies',
] as const;

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
]) {
  test(`dziewięć pinezek Wolnej jazdy (${viewport.width} × ${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(button(page, pl.cityPicker.campaign)).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(button(page, pl.cityPicker.freeRide)).toBeFocused();
    await page.keyboard.press('Enter');
    const picker = page.getByRole('main', { name: pl.cityPicker.title });
    await audit(page, picker, pl.cityPicker.title);
    await expect(
      page.getByRole('img', { name: pl.cityPicker.map }),
    ).toBeVisible();
    const training = button(picker, pl.driving.title);
    const pins = [...pickerCities.map((city) => cityPin(page, city)), training];
    await expect(picker.locator('.city-picker-pin')).toHaveCount(9);
    const first = pins[0]!;
    const size = await first.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );
    await page.evaluate(
      () => (document.documentElement.style.fontSize = '200%'),
    );
    await expect(first).toHaveCSS('font-size', `${2 * parseFloat(size)}px`);
    for (const pin of pins) {
      await expect(pin).toBeFocused();
      await expect(pin).toBeInViewport({ ratio: 0.99 });
      const reachable = await pin.evaluate((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return node.contains(
          document.elementFromPoint(x + width / 2, y + height / 2),
        );
      });
      expect(reachable).toBe(true);
      await page.keyboard.press('Tab');
    }
    await expect(button(picker, pl.cityPicker.back)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(training).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-map',
      'miasteczko',
      { timeout: 15_000 },
    );
  });
}

const newMaps = [
  {
    city: 'gdansk',
    prefix: 'GDA',
    counter: 'bursztyny',
    puzzle: 'bursztynQuestion',
    question: 'Q014',
    total: 6,
    saved: ['gda-bursztyn-kamienice', 'gda-bursztyn-fontanna'],
  },
  {
    city: 'wies',
    prefix: 'WIE',
    counter: 'szyszki',
    puzzle: 'szyszkaQuestion',
    question: 'Q063',
    total: 4,
    saved: ['wie-szyszka-lawka', 'wie-szyszka-ganek'],
  },
  {
    city: 'poznan',
    prefix: 'POZ',
    counter: 'rogale',
    puzzle: 'rogalQuestion',
    question: 'Q014',
    total: 4,
    saved: ['poz-rogal-domki', 'poz-rogal-latarnia'],
  },
  {
    city: 'lodz',
    prefix: 'LOD',
    counter: 'szpulki',
    puzzle: 'szpulkaQuestion',
    question: 'Q014',
    total: 4,
    saved: ['lod-szpulka-latarnia', 'lod-szpulka-pasaz'],
  },
  {
    city: 'zakopane',
    prefix: 'ZAK',
    counter: 'swierki',
    puzzle: 'swierkQuestion',
    question: 'Q057',
    total: 4,
    saved: ['zak-swierk-willa', 'zak-swierk-latarnia'],
  },
] as const;

const bundledCampaignTest = test.extend({
  baseURL: 'http://127.0.0.1:4174',
  serviceWorkers: 'block',
});

for (const map of newMaps) {
  const testCampaign = map.city === 'gdansk' ? bundledCampaignTest : test;
  const title = `dialog, kolekcja i wyniki kampanii · ${pl.cityPicker[map.city]}`;
  testCampaign(title, async ({ page, baseURL }) => {
    test.setTimeout(55_000);
    await page.setViewportSize({ width: 844, height: 390 });
    const pad = map.city === 'gdansk' ? undefined : await mockGamepad(page);
    if (map.city === 'gdansk') {
      // Keep the keyboard approach to the real amber checkpoint short at low FPS.
      await shiftPois(page, map.city, { 'gda-bursztyny-start': [1440, 635] });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedProgress(page, baseURL, {
      completed: [
        ...Array.from(
          { length: map.city === 'zakopane' ? 5 : 4 },
          (_, i) => `${map.prefix}-B-0${i + 1}`,
        ),
        `${map.prefix}-A1-01`,
      ],
      [map.counter]: [...map.saved],
    });
    await page.goto('/');
    const campaign = button(page, pl.cityPicker.campaign);
    await expect(campaign).toBeVisible();
    if (pad) await pad.tap(13);
    else await page.keyboard.press('Tab');
    await expect(campaign).toBeFocused();
    if (pad) await pad.tap(0);
    else await page.keyboard.press('Enter');
    const city = cityPin(page, map.city);
    for (const id of pickerCities) {
      await expect(cityPin(page, id)).toBeFocused();
      if (id === map.city) break;
      if (pad) await pad.tap(13);
      else await page.keyboard.press('Tab');
    }
    await expect(city).toBeFocused();
    if (pad) await pad.tap(0);
    else await page.keyboard.press('Enter');
    await waitForCity(page);
    const canvas = page.locator(`canvas[data-map="${map.city}"]`);
    await expect(canvas).toHaveAttribute('data-mission', `${map.prefix}-A1-02`);
    const story = dialog(page, pl.dialogueUi.title);
    const skip = button(story, pl.dialogueUi.skip);
    await audit(page, story, pl.dialogueUi.title);
    await expect(story).toHaveAccessibleDescription(/\S/);
    const next = button(story, pl.dialogueUi.next);
    await expect(next).toBeFocused();
    if (pad) {
      await pad.tap(12);
      await expect(skip).toBeFocused();
      await pad.tap(0);
    } else {
      await page.keyboard.press('Shift+Tab');
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
    }

    const label = pl.driving[map.counter];
    const count = page.getByRole('status', { name: label });
    await expect(count).toHaveText(`${label} 2/${map.total}`);
    const phone = dialog(page, pl.phone.title);
    if (pad) await pad.tap(8);
    else await page.keyboard.press('KeyM');
    await expect(phone).toBeVisible();
    await expect(phone).toContainText(`${label} 2/${map.total}`);
    await expect(button(phone, pl.phone.close)).toBeFocused();
    if (pad) await pad.tap(1);
    else await page.keyboard.press('Escape');
    await expect(button(page, pl.phone.open)).toBeFocused();

    if (pad) await pad.tap(0);
    else {
      await page.keyboard.press('Escape');
      const pause = dialog(page, pl.driving.paused);
      await useKeyboard(page, button(pause, pl.driving.classic));
      await page.keyboard.press('Escape');
      await page.keyboard.press('KeyX');
    }
    await expect(canvas).toHaveAttribute('data-walking', 'true');
    const puzzle = dialog(page, pl.driving[map.puzzle]);
    if (pad) await pad.setAxes(0, -1);
    else await page.keyboard.down('ArrowRight');
    try {
      await expect(puzzle).toBeVisible();
    } finally {
      if (pad) await pad.setAxes(0, 0);
      else await page.keyboard.up('ArrowRight');
    }
    const question = questions.pytania.find(({ id }) => id === map.question)!;
    await audit(page, puzzle, pl.driving[map.puzzle]);
    await expect(puzzle).toHaveAccessibleDescription(question.pytanie);
    const answers = question.odpowiedzi.map((text) => button(puzzle, text));
    await expectFocusLoop(page, answers[0]!, answers.at(-1)!);
    for (let index = 0; index < question.poprawna; index++) {
      if (pad) await pad.tap(13);
      else await page.keyboard.press('Tab');
    }
    await expect(answers[question.poprawna]!).toBeFocused();
    if (pad) await pad.tap(0);
    else await page.keyboard.press('Enter');
    const proceed = button(puzzle, pl.progression.continue);
    await expect(proceed).toBeFocused();
    await expect(puzzle.getByRole('status')).toHaveText(question.wyjasnienie);
    if (pad) await pad.tap(0);
    else await page.keyboard.press('Enter');
    await expect(count).toHaveText(`${label} 3/${map.total}`);
    // The recorded items still require visiting their checkpoints on this ride.
    if (pad) await pad.setAxes(0, -1);
    else await page.keyboard.down('ArrowRight');
    try {
      if (map.city === 'lodz' && pad) {
        // Let the sign-reading encounter finish while still at the last spool.
        await page.waitForFunction(
          () => Number(document.querySelector('canvas')?.dataset.x) <= 1544,
          undefined,
          { timeout: 20_000 },
        );
        await pad.setButton(1);
      }
      await expect(story).toBeVisible({ timeout: 25_000 });
    } finally {
      if (pad) await pad.setAxes(0, 0);
      else await page.keyboard.up('ArrowRight');
    }
    await useKeyboard(page, skip);
    const results = dialog(page, pl.missionUi.completed);
    await audit(page, results, pl.missionUi.completed);
    await expect(results.locator('.mission-confetti')).toBeHidden();
    await expect(button(results, pl.missionResults.skip)).toBeHidden();
  });
}

test('stop-klatka po wjechaniu na tory we Wsi i lesie', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startAt(page, 'wies', 1150, 1296, -Math.PI / 2, {
    crossing: 'przejazd-gminny',
    seconds: 22,
  });
  await page.goto('/');
  await chooseCity(page, 'wies');
  const replay = dialog(page, pl.replay.title);
  await driveUntil(page, replay);
  await auditReplay(page, replay, 'MSC-01');
});

test('stop-klatka przy wymijaniu roweru cargo w Łodzi', async ({ page }) => {
  const pad = await mockGamepad(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startAt(page, 'lodz', 1665, 715, 0);
  await page.goto('/');
  await chooseCity(page, 'lodz');
  const replay = dialog(page, pl.replay.title);
  // Ride slowly enough to isolate the clearance verdict in the living zone.
  await pad.setAxes(0, -0.25);
  try {
    await expect(replay).toBeVisible({ timeout: 12_000 });
  } finally {
    await pad.setAxes(0, 0);
  }
  await auditReplay(page, replay, 'MAN-14');
});

test('stop-klatka na przejściu do wysepki w Poznaniu', async ({ page }) => {
  const pad = await mockGamepad(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Begin with the passenger on the zebra and the rider at its edge.
  await page.route(/\/poznan(?:-[^/]+)?\.tmj(?:\?|$)/, async (route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    const response = await route.fetch();
    const map = await response.json();
    const objects = (name: string) =>
      map.layers.find((layer: { name: string }) => layer.name === name).objects;
    const spawn = objects('spawns')[0];
    Object.assign(spawn, { x: 2530, y: 604 });
    spawn.properties.find((p: { name: string }) => p.name === 'heading').value =
      -Math.PI / 2;
    const pedestrian = objects('traffic_routes').find(
      (object: { name: string }) => object.name === 'pasazerka-na-wysepke',
    );
    pedestrian.x = 2550;
    pedestrian.polyline[1].x = -84;
    pedestrian.properties.find(
      (p: { name: string }) => p.name === 'start_s',
    ).value = 0;
    await route.fulfill({ response, json: map });
  });
  await page.goto('/');
  await chooseCity(page, 'poznan');
  await expect(page.locator('canvas')).toHaveAttribute('data-y', '604');
  await pad.setAxes(0, -0.2);
  const replay = dialog(page, pl.replay.title);
  try {
    await expect(replay).toBeVisible({ timeout: 12_000 });
  } finally {
    await pad.setAxes(0, 0);
  }
  await auditReplay(page, replay, 'PIER-10');
});

async function auditReplay(page: Page, replay: Locator, rule: string) {
  const title = await ruleTitle(page, rule);
  await audit(page, replay, pl.replay.title);
  const tip = await replay.locator('#replay-feedback').textContent();
  expect(tip).toBeTruthy();
  await expect(replay).toHaveAccessibleDescription(`${title} ${tip}`);
  const first = replay.getByRole('button').first();
  await expect(first).toBeFocused();
  await expectFocusLoop(page, first, replay.getByRole('button').last());
}

async function ruleTitle(page: Page, rule: string) {
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  return content.przepisy.przepisy.find(({ id }) => id === rule)!.tytul;
}

async function driveUntil(page: Page, panel: Locator) {
  await page.keyboard.down('ArrowUp');
  try {
    await expect(panel).toBeVisible({ timeout: 12_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
}

async function enableReducedEffects(page: Page) {
  const settings = dialog(page, pl.settings.title);
  await useKeyboard(page, button(page, pl.settings.title));
  const reduce = settings.getByRole('checkbox', {
    name: pl.settings.reducedEffects,
  });
  await reduce.focus();
  await page.keyboard.press('Space');
  await expect(reduce).toBeChecked();
  await page.keyboard.press('Escape');
}

function pixel(image: PNG, x: number, y: number) {
  const offset = (y * image.width + x) * 4;
  return '#' + image.data.subarray(offset, offset + 3).toString('hex');
}

test('mgła i zjazd mają odrębne kształty, a za szybki zjazd opisuje przyczynę', async ({
  page,
  baseURL,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedProgress(page, baseURL, { completed: ['ZAK-B-01', 'ZAK-B-02'] });
  await page.goto('/');
  await enableReducedEffects(page);
  const title = await ruleTitle(page, 'MAN-08');
  await chooseCity(page, 'zakopane', 'campaign');
  const story = dialog(page, pl.dialogueUi.title);
  await useKeyboard(page, button(story, pl.dialogueUi.skip));
  await expect(page.locator('canvas')).toHaveAttribute('data-weather', 'fog');
  const shot = await page.screenshot({
    clip: { x: 600, y: 298, width: 80, height: 28 },
  });
  await info.attach('Mgła i zjazd', { body: shot, contentType: 'image/png' });
  const image = PNG.sync.read(shot);
  for (const y of [7, 14, 20]) expect(pixel(image, 18, y)).toBe('#f4f4f4');
  expect(pixel(image, 62, 14)).toBe('#f4f4f4');
  expect(pixel(image, 62, 7)).toBe('#1a1c2c');
  expect(
    ratio(pixel(image, 62, 14), pixel(image, 62, 7)),
  ).toBeGreaterThanOrEqual(3);

  await useKeyboard(page, button(page, pl.missionUi.equip));
  await useKeyboard(page, button(page, pl.missionUi.turnOnLights));
  const failure = dialog(page, pl.missionFailure.title);
  await driveUntil(page, failure);
  await audit(page, failure, pl.missionFailure.title);
  await expect(failure).toHaveAccessibleDescription(new RegExp(title));
  await expect(failure.locator('.mission-failure-stamp')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expectFocusLoop(
    page,
    button(failure, pl.missionFailure.retry),
    button(failure, pl.missionFailure.exit),
  );
});

test('mniej efektów zatrzymuje miganie lamp bez ukrywania krzyża', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await startAt(page, 'warszawa', 3470, 2482, -Math.PI / 2, {
    crossing: 'mokotow-przejazd-z-zaporami',
    seconds: 23,
  });
  await page.goto('/');
  await enableReducedEffects(page);
  await chooseCity(page, 'warszawa');
  await expect(page.locator('canvas')).toHaveAttribute('data-x', '3470');
  const capture = () =>
    page.screenshot({ clip: { x: 697, y: 289, width: 38, height: 32 } });
  const first = await capture();
  await page.clock.runFor(650);
  const second = await capture();
  await info.attach('Sygnał kolejowy', {
    body: second,
    contentType: 'image/png',
  });
  for (const shot of [first, second]) {
    const image = PNG.sync.read(shot);
    for (const x of [11, 25]) {
      expect(pixel(image, x, 21)).toBe('#f04a4b');
      expect(pixel(image, x, 5)).toBe('#f4f4f4');
    }
    expect(pixel(image, 18, 9)).toBe('#f4f4f4');
  }
});

test.describe('zimny start wydania web', () => {
  test.use({ baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block' });

  test('plansza startowa i ładowanie jazdy mają komunikat w DOM', async ({
    page,
  }) => {
    let finishContent!: () => void;
    const contentReady = new Promise<void>(
      (resolve) => (finishContent = resolve),
    );
    await page.route('**/data/content.json', async (route) => {
      await contentReady;
      await route.continue();
    });
    const status = page.locator('#status');
    try {
      await page.goto('/');
      await expect(page.locator('#pwa-splash')).toHaveAttribute('alt', '');
      await expect(status).toHaveRole('status');
      await expect(status).toHaveText(pl.loading);
      await audit(page, status, '');
    } finally {
      finishContent();
    }
    await expect(status).toBeHidden();
    await expect(page.locator('#pwa-splash')).toHaveCount(0);
    await useKeyboard(page, button(page, pl.cityPicker.freeRide));
    let finishRide!: () => void;
    const rideReady = new Promise<void>((resolve) => (finishRide = resolve));
    await page.route(/\/assets\/City-[^/]+\.js$/, async (route) => {
      await rideReady;
      await route.continue();
    });
    try {
      await useKeyboard(page, cityPin(page, 'zakopane'));
      await expect(status).toHaveText(pl.loading);
      await audit(page, page.getByRole('main'), pl.cityPicker.title);
    } finally {
      finishRide();
    }
    await expect(page.locator('canvas[data-map="zakopane"]')).toHaveAttribute(
      'data-x',
      /\d+/,
    );
    await expect(status).toBeHidden();
  });
});

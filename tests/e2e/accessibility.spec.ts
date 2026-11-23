import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { chooseCity } from './city-picker';
import { mockGamepad } from './helpers/gamepad';
import { answer, parentZone } from './helpers/parent-gate';
import { profile } from './helpers/profile';

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
    const originalSize = await button(page, pl.settings.title).evaluate(
      (node) => parseFloat(getComputedStyle(node).fontSize),
    );
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const settings = dialog(page, pl.settings.title);
    await useKeyboard(page, button(page, pl.settings.title));
    await expect(button(settings, pl.m5c.close)).toHaveCSS(
      'font-size',
      `${2 * originalSize}px`,
    );
    for (const panel of [settings, dialog(page, pl.aboutGame.title)]) {
      await expect(panel).toBeVisible();
      const layout = await panel.evaluate((node) => ({
        width: node.clientWidth,
        contentWidth: node.scrollWidth,
        height: node.clientHeight,
        contentHeight: node.scrollHeight,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.contentHeight).toBeGreaterThan(layout.height);
      if (panel === settings)
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

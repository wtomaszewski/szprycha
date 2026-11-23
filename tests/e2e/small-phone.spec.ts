import { expect, test, type Locator, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import pl from '../../i18n/pl.json' with { type: 'json' };
import questions from '../../content/pytania.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { cityPin } from './city-picker';
import { answer, parentZone } from './helpers/parent-gate';
import { profile } from './helpers/profile';

type Insets = { top: number; right: number; bottom: number; left: number };
const buttons = 'button:not([hidden])';
const targets = [
  buttons,
  'select',
  'input[type="range"]',
  'label:has(input[type="checkbox"])',
  'summary',
  'a[href]',
].join(', ');

const button = (root: Page | Locator, name: string) =>
  root.getByRole('button', { name, exact: true });

async function fits(page: Page, element: Locator, insets: Insets) {
  await expect(element).toBeVisible();
  const viewport = page.viewportSize()!;
  const box = (await element.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(insets.left - 1);
  expect(box.y).toBeGreaterThanOrEqual(insets.top - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(
    viewport.width - insets.right + 1,
  );
  expect(box.y + box.height).toBeLessThanOrEqual(
    viewport.height - insets.bottom + 1,
  );
  const { clientWidth, scrollWidth } = await element.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

async function checkControls(page: Page, controls: Locator, insets: Insets) {
  const visible = controls.filter({ visible: true });
  expect(await visible.count()).toBeGreaterThan(0);
  for (const target of await visible.all()) {
    await target.scrollIntoViewIfNeeded();
    await fits(page, target, insets);
    const box = (await target.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(
      await target.evaluate(
        (node, { x, y }) => node.contains(document.elementFromPoint(x, y)),
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      ),
    ).toBe(true);
  }
}

function luminance(color: readonly number[]) {
  const [r, g, b] = color.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(first: readonly number[], second: readonly number[]) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function pixel(png: PNG, index: number) {
  return [...png.data.subarray(index * 4, index * 4 + 3)];
}

// Compare the solid ink with the composited background under each painted pixel.
async function inkContrast(target: Locator, label: string, icon = false) {
  await target.scrollIntoViewIfNeeded();
  const color = await target.evaluate(
    (node, icon) =>
      (icon
        ? getComputedStyle(node).backgroundColor
        : getComputedStyle(node).color
      )
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number),
    icon,
  );
  const normal = PNG.sync.read(await target.screenshot({ scale: 'css' }));
  const background = PNG.sync.read(
    await target.screenshot({
      scale: 'css',
      style: icon
        ? '.ride-status-icon { background-color: transparent !important; }'
        : '* { -webkit-text-fill-color: transparent !important; }',
    }),
  );
  let minimum = Infinity;
  for (let index = 0; index < normal.width * normal.height; index++) {
    const under = pixel(background, index);
    if (pixel(normal, index).some((value, channel) => value !== under[channel]))
      minimum = Math.min(minimum, contrast(color, under));
  }
  expect(Number.isFinite(minimum), label).toBe(true);
  expect(minimum, label).toBeGreaterThanOrEqual(4.5);
  return label + ' ' + minimum.toFixed(2);
}

async function focusContrast(page: Page, target: Locator, label: string) {
  await expect(target).toBeFocused();
  await expect(target).toHaveCSS('outline-style', 'solid');
  const box = (await target.boundingBox())!;
  const clip = {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y) - 5,
    width: 1,
    height: 5,
  };
  const strip = PNG.sync.read(await page.screenshot({ clip, scale: 'css' }));
  const ratio = contrast(pixel(strip, 1), pixel(strip, 4));
  expect(ratio, label).toBeGreaterThanOrEqual(4.5);
  return label + ' ' + ratio.toFixed(2);
}

for (const { width, height, insets } of [
  {
    width: 640,
    height: 360,
    insets: { top: 6, right: 24, bottom: 18, left: 36 },
  },
  {
    width: 360,
    height: 640,
    insets: { top: 28, right: 8, bottom: 22, left: 8 },
  },
]) {
  test.describe(width + '×' + height, () => {
    test.use({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      actionTimeout: 10_000,
    });

    for (const size of ['medium', 'largest'] as const) {
      test(
        size + ' · settings, quiz, parent zone, city map and night ride',
        async ({ page, context }, info) => {
          test.setTimeout(90_000);
          const measurements: string[] = [];
          const shot = async (name: string) => {
            await page.evaluate(() => document.fonts.ready);
            const filename =
              width + 'x' + height + '-' + size + '-' + name + '.png';
            await page.screenshot({
              path: process.env.UPDATE_SMALL_PHONE_SCREENSHOTS
                ? 'docs/screenshots/male-telefony-111/' + filename
                : info.outputPath(filename),
              scale: 'css',
              animations: 'disabled',
              style:
                '* { -webkit-tap-highlight-color: transparent !important; }',
            });
          };
          const checkPanel = async (panel: Locator) => {
            await fits(page, panel, insets);
            await checkControls(page, panel.locator(targets), insets);
          };

          await page.route('**/data/content.json', async (route) => {
            const response = await route.fetch();
            const content: GameContent = await response.json();
            const mission = content.misje.find(({ id }) => id === 'WAW-T-01')!;
            mission.start.noc = true;
            mission.start.kask_zapiety = true;
            await route.fulfill({ response, json: content });
          });
          await page.goto('/');
          const canvas = page.locator('canvas');
          await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
          await expect(page.locator('#game')).toHaveCSS(
            'left',
            insets.left + 'px',
          );

          await profile(page, {
            missionPoints: 4000,
            reducedEffects: true,
            quiz: { streak: 0, cards: { Q024: { box: 1, due: '2000-01-01' } } },
          });
          await page.reload();
          const menu = page.getByRole('main', { name: pl.title });
          await fits(page, menu, insets);
          await checkControls(page, menu.locator(buttons + ', select'), insets);
          await button(page, pl.settings.title).tap();
          const settings = page.getByRole('dialog', {
            name: pl.settings.title,
          });
          const textSize = settings.getByRole('combobox', {
            name: pl.missionResults.textSize,
          });
          await textSize.selectOption(size);
          if (size === 'largest') {
            const highContrast = settings.locator('label').filter({
              has: page.getByRole('checkbox', {
                name: pl.missionResults.highContrast,
              }),
            });
            await highContrast.tap();
            await expect(page.locator('html')).toHaveAttribute(
              'data-contrast',
              '',
            );
          }
          await expect(page.locator('html')).toHaveAttribute(
            'data-text-size',
            size,
          );
          await expect(settings.locator('h3').first()).toHaveCSS(
            'font-family',
            '"Press Start 2P", monospace',
          );
          await expect(textSize).toHaveCSS('font-family', 'VT323, monospace');
          await checkPanel(settings);
          await settings
            .locator('header + div')
            .evaluate((node) => (node.scrollTop = 0));
          await shot('ustawienia');
          measurements.push(
            await inkContrast(settings.locator('h3').first(), 'Ustawienia'),
          );
          await expect(button(settings, pl.m5c.close)).toBeInViewport();
          await button(settings, pl.m5c.close).tap();

          const { open, gate, settings: parent } = parentZone(page);
          await open.tap();
          await button(gate, '0').tap();
          await button(gate, pl.parentZone.confirm).tap();
          const gateFeedback = gate.getByText(pl.parentZone.tryAgain);
          await expect(gateFeedback).toBeInViewport();
          await shot('bramka-blad');
          measurements.push(await inkContrast(gateFeedback, 'Błąd bramki'));
          await checkPanel(gate);
          await answer(gate, (key) => key.tap());
          await shot('strefa-rodzica');
          measurements.push(
            await inkContrast(
              parent.locator('#parent-age-help'),
              'Podpowiedź wieku',
            ),
          );
          await checkPanel(parent);
          await button(parent, pl.m5c.close).tap();

          await button(page, pl.quiz.title).tap();
          const quiz = page.getByRole('dialog', { name: pl.quiz.title });
          await quiz
            .getByRole('button', { name: new RegExp(pl.quiz.quick) })
            .tap();
          const question = questions.pytania.find(({ id }) => id === 'Q024')!;
          const prompt = quiz.getByRole('heading', { name: question.pytanie });
          for (const sign of ['B-2', 'T-22'] as const) {
            const image = quiz.getByRole('img', {
              name: pl.quiz.signAlt[sign],
              exact: true,
            });
            await expect(image).toBeInViewport({ ratio: 1 });
            await expect(image).toHaveJSProperty('complete', true);
          }
          await page.keyboard.press('Tab');
          const focusedAnswer = quiz.locator('.quiz-answers button').first();
          await expect(focusedAnswer).toBeFocused();
          await shot('quiz');
          measurements.push(
            await focusContrast(page, focusedAnswer, 'Obrys odpowiedzi'),
            await inkContrast(focusedAnswer, 'Odpowiedź z fokusem'),
            await inkContrast(prompt, 'Pytanie'),
          );
          await checkPanel(quiz);
          await button(quiz, question.odpowiedzi[0]!).tap();
          const incorrect = quiz.getByText(pl.quiz.incorrect, { exact: true });
          await expect(incorrect).toBeInViewport();
          await shot('quiz-blad');
          measurements.push(await inkContrast(incorrect, 'Błąd quizu'));
          await button(quiz, pl.quiz.close).tap();

          await button(page, pl.cityPicker.campaign).tap();
          const picker = page.locator('.city-picker');
          await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
          await checkControls(page, picker.locator(buttons), insets);
          await shot('wybor-miasta');
          await cityPin(page, 'warszawa').tap();

          const dialogue = page.getByRole('dialog', {
            name: pl.dialogueUi.title,
          });
          await button(dialogue, pl.dialogueUi.skip).tap();
          await expect(canvas).toHaveAttribute('data-lighting', 'night');
          await page.keyboard.press('KeyL');
          const night = page.getByRole('img', { name: pl.rideHud.night });
          const lights = page.getByRole('img', { name: pl.rideHud.lightsOn });
          await expect(lights).toBeVisible();
          const pause = button(page, pl.driving.pause);
          await pause.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          if (height > width) {
            const hud = page.locator(
              '.ride-hud-left, .ride-hud-right, .mission-panel, .mission-arrow, .radio-station, .ride-quick-actions button, .orientation-warning',
            );
            const overlapping = await hud.evaluateAll((elements) => {
              const boxes = elements
                .filter((node) => node.getClientRects().length)
                .map((node) => ({
                  element: node.className,
                  ...node.getBoundingClientRect().toJSON(),
                }));
              return boxes.flatMap((a, index) =>
                boxes
                  .slice(index + 1)
                  .filter(
                    (b) =>
                      Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
                      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
                  )
                  .map((b) => [a.element, b.element]),
              );
            });
            expect(overlapping).toEqual([]);
          }
          await shot('hud-noc');
          measurements.push(
            await inkContrast(night, 'Ikona nocy', true),
            await inkContrast(lights, 'Ikona świateł', true),
            await inkContrast(
              page
                .getByLabel(pl.progression.points)
                .and(page.locator('output')),
              'Punkty HUD',
            ),
            await focusContrast(page, pause, 'Obrys pauzy w nocy'),
            await inkContrast(
              page.locator('.mission-timer'),
              'Czas misji w nocy',
            ),
          );
          await checkControls(
            page,
            page.locator(
              '.touch-controls button:not([hidden]), .touch-controls .joystick:visible, .ride-quick-actions button:not([hidden])',
            ),
            insets,
          );
          await page.keyboard.down('ArrowDown');
          await page.waitForFunction(
            () => Number(document.querySelector('canvas')?.dataset.y) >= 1184,
          );
          await page.keyboard.up('ArrowDown');
          await page.keyboard.down('Space');
          await expect(canvas).toHaveAttribute('data-stop-ready', 'true');
          await page.keyboard.up('Space');
          await page.keyboard.down('ArrowDown');
          await expect(dialogue).toBeVisible({ timeout: 12_000 });
          await page.keyboard.up('ArrowDown');
          await button(dialogue, pl.dialogueUi.skip).tap();
          const results = page.getByRole('dialog', {
            name: pl.missionUi.completed,
          });
          await expect(
            results.getByRole('heading', { name: pl.missionResults.mastery }),
          ).toBeVisible();
          await expect(
            results.locator('.result-scores > div').last(),
          ).toBeVisible();
          await shot('wyniki');
          measurements.push(
            await inkContrast(
              results.locator('.result-highlights dd').first(),
              'Punkty w wynikach',
            ),
          );
          await checkPanel(results);
          await button(results, pl.missionResults.map).scrollIntoViewIfNeeded();
          await shot('wyniki-koniec');
          await button(results, pl.missionResults.map).tap();
          await expect(picker).toBeVisible();

          await info.attach('Kontrast (WCAG)', {
            body: measurements.join('\n'),
            contentType: 'text/plain',
          });
        },
      );
    }
  });
}

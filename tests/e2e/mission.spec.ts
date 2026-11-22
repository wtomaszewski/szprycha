import { test, expect, type Page } from '@playwright/test';
import { chooseCity, cityPin } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };
import questions from '../../content/pytania.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';

const tutorial = pl.misje['WAW-T-01'];
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const skipDialogue = (page: Page) =>
  dialogue(page).getByRole('button', { name: pl.dialogueUi.skip }).click();
const questionDialog = (page: Page) =>
  page.getByRole('dialog', { name: pl.progression.questionTitle });
const questionFor = (rule: string) =>
  questions.pytania.find(({ przepisy }) => przepisy.includes(rule))!;

async function mockGamepad(page: Page) {
  await page.addInitScript(() => {
    const state = { button: -1 };
    window.addEventListener('test:gamepad', (event) => {
      state.button = (event as CustomEvent<number>).detail;
    });
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          connected: true,
          axes: [0, 0],
          buttons: Array.from({ length: 17 }, (_, i) => ({
            pressed: i === state.button,
          })),
        },
      ],
    });
  });
  return (button: number) =>
    page.evaluate((detail) => {
      window.dispatchEvent(new CustomEvent('test:gamepad', { detail }));
    }, button);
}

test('starts WAW-T-01 from the menu with a visible goal arrow and timer', async ({
  page,
}) => {
  await page.goto('/');
  const start = page.getByRole('button', { name: pl.cityPicker.campaign });
  await expect(start).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-menu.png' });
  await start.press('Enter');
  await cityPin(page, 'warszawa').press('Enter');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'City');
  await skipDialogue(page);
  const arrow = page.getByRole('img', {
    name: new RegExp(pl.missionUi.direction),
  });
  await expect(arrow).toBeVisible();
  await expect(arrow).toHaveAttribute('aria-label', /\d+ m$/);
  const timer = page.getByLabel(pl.missionUi.timer);
  await expect(timer).toHaveText(/1:[0-2]\d/);
  const helmet = page.getByRole('button', { name: pl.missionUi.equip });
  await expect(helmet).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-tutorial.png' });
  await helmet.click();
  await expect(helmet).toBeHidden();
  await expect(page.getByText(pl.misje['WAW-T-01'].jazda)).toBeVisible();
  await expect(arrow).toBeVisible();
});

test('recovers from a helmet mistake and keeps XP, mastery and mission progress after reload', async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await skipDialogue(page);
  const timer = page.getByLabel(pl.missionUi.timer);
  await expect(timer).toHaveText('1:24', { timeout: 12_000 });
  await page.keyboard.down('ArrowUp');
  const lesson = page.getByRole('dialog', { name: pl.replay.title });
  await expect(lesson).toBeVisible();
  await page.keyboard.up('ArrowUp');
  const feedback = lesson.locator('#replay-feedback');
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  const helmet = content.przepisy.przepisy.find(
    (rule: { id: string }) => rule.id === 'KASK-01',
  );
  await expect(feedback).toHaveText(helmet!.feedback);
  await expect(
    lesson.getByRole('button', { name: pl.replay.resume }),
  ).toBeHidden();
  const beforeReplay = await timer.textContent();
  await page.screenshot({ path: 'test-results/m4c-ups.png' });
  await lesson.getByRole('button', { name: pl.replay.play }).click();
  await expect(
    lesson.getByRole('button', { name: pl.replay.stop }),
  ).toBeVisible();
  await expect(
    lesson.getByRole('button', { name: pl.replay.play }),
  ).toBeVisible({ timeout: 8_000 });
  await expect(timer).toHaveText(beforeReplay!);
  await lesson.getByRole('button', { name: pl.replay.retry }).click();
  await expect(lesson).toBeHidden();
  await expect(canvas).toHaveAttribute('data-y', '928');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  const question = questionDialog(page);
  const helmetQuestion = questionFor('KASK-01');
  await expect(question).toContainText(helmetQuestion.pytanie);
  await expect(
    page.getByLabel(pl.progression.points, { exact: true }),
  ).toHaveText('0');
  for (const answer of await question.getByRole('button').all()) {
    await expect(answer).not.toBeFocused();
    await expect(answer).toHaveCSS('outline-style', 'none');
  }
  await page.keyboard.press('Enter');
  await expect(question.getByRole('status')).toBeHidden();
  await page.screenshot({ path: 'test-results/m5b-pytanie.png' });
  await page.keyboard.press('ArrowDown');
  await expect(question.getByRole('button').first()).toBeFocused();
  await expect(page.getByLabel(pl.progression.attention)).toContainText('3/3');
  await question
    .getByRole('button', {
      name: helmetQuestion.odpowiedzi[helmetQuestion.poprawna],
      exact: true,
    })
    .click();
  await expect(question.getByRole('status')).toHaveText(
    `${pl.progression.wiseHead} +100`,
  );
  await expect(page.getByLabel(pl.progression.attention)).toContainText('0/3');
  await question.getByRole('button', { name: pl.progression.continue }).click();
  await page.getByRole('button', { name: pl.missionUi.equip }).click();

  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1184);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await expect(
    page.getByText(pl.trafficEvents.cwiczenie_stop, { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skipDialogue(page);
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.mission-confetti')).toBeVisible();
  await expect(
    page.getByText(pl.missionUi.noTimeBonus, { exact: false }),
  ).toBeVisible();
  const summary = page.getByRole('region', { name: pl.missionUi.result });
  await expect(summary).toContainText(`${pl.missionUi.penalties} −300`);
  const points = Number(
    (await summary.textContent())?.match(
      new RegExp(`${pl.missionUi.yourPoints} (\\d+)`),
    )?.[1],
  );
  expect(points).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/m5b-wynik.png' });
  await page.getByRole('button', { name: pl.missionUi.retry }).click();
  await expect(dialogue(page)).toContainText(pl.dialogi['WAW-T-01'].powitanie);
  await skipDialogue(page);
  await expect(
    page.getByRole('button', { name: pl.missionUi.equip }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: pl.skillMap.title }).click();
  const skillMap = page.getByRole('dialog', { name: pl.skillMap.title });
  const formatter = new Intl.NumberFormat('pl-PL');
  await expect(skillMap).toContainText(
    `${pl.skillMap.xp} ${formatter.format(points / 2)}`,
  );
  await expect(skillMap).toContainText(pl.skillMap.ranks.zoltodziob);
  await expect(skillMap).toContainText(pl.misje['WAW-T-01'].tytul);
  await expect(skillMap).toContainText(`${pl.progression.record} 1`);
  await expect(skillMap.getByRole('listitem')).toHaveCount(8);
  const meter = skillMap.getByRole('meter', { name: pl.skillMap.modules.M01 });
  const moduleRules = content.przepisy.przepisy.filter(
    ({ modul }) => modul === 'M01',
  );
  await expect(meter).toHaveJSProperty('value', 15 / moduleRules.length);
  await page.screenshot({ path: 'test-results/m5b-mapa-umiejetnosci.png' });
  await skillMap.getByRole('button', { name: pl.skillMap.close }).click();
  await chooseCity(page, 'warszawa');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await page.keyboard.press('KeyM');
  await expect(
    page.getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['WAW-T-02'].tytul}`,
    }),
  ).toBeEnabled();
});

test('raises Road Attention for missed STOPs, explains the answer and grants stars', async ({
  page,
}) => {
  test.setTimeout(45_000);
  const press = await mockGamepad(page);
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  await skipDialogue(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();

  const canvas = page.locator('canvas');
  const resume = page.getByRole('button', { name: pl.missionUi.continue });
  await page.keyboard.down('ArrowUp');
  const lesson = page.getByRole('dialog', { name: pl.replay.title });
  await expect(lesson).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('ArrowUp');
  await expect(lesson).toContainText(/STOP/);
  await page.screenshot({ path: 'test-results/m4c-stop-highlight.png' });
  await lesson.getByRole('button', { name: pl.replay.resume }).click();
  await page.keyboard.down('ArrowUp');
  await expect(resume).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('ArrowUp');
  await expect(
    page.getByText(tutorial.powrot_stop, { exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute('data-y', '1199');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await resume.click();
  await expect(resume).toBeHidden();
  await expect(page.getByText(tutorial.stop, { exact: true })).toBeVisible();
  const attention = page.getByLabel(pl.progression.attention);
  await expect(attention).toContainText('1/3');

  await page.keyboard.down('ArrowUp');
  await expect(resume).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await expect(attention).toContainText('2/3');
  await resume.click();

  await page.keyboard.down('ArrowUp');
  const question = questionDialog(page);
  await expect(question).toBeVisible();
  await page.keyboard.up('ArrowUp');
  const stop = questionFor('ZNAK-STOP');
  await expect(question).toContainText(stop.pytanie);
  await expect(attention).toContainText('3/3');
  const clock = await page.getByLabel(pl.missionUi.timer).textContent();
  await press(0);
  await expect(question.getByRole('button').first()).not.toBeFocused();
  await press(-1);
  await press(13);
  await expect(
    question.getByRole('button', { name: stop.odpowiedzi[0], exact: true }),
  ).toBeFocused();
  await press(-1);
  await press(0);
  await expect(question.getByRole('status')).toHaveText(stop.wyjasnienie);
  await expect(attention).toContainText('1/3');
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText(clock!);
  await question.getByRole('button', { name: pl.progression.continue }).click();
  await page.keyboard.down('ArrowUp');
  await expect(resume).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await resume.click();

  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1218);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skipDialogue(page);
  const result = page.getByRole('region', { name: pl.missionUi.result });
  await expect(result).toContainText(pl.missionUi.completed);
  await expect(result).toContainText(`${pl.progression.stars} 1 ★`);
  await expect(result).toContainText(pl.missionUi.yourPoints);
  await expect(result).toContainText(`${pl.progression.missionSeries} 1`);
  await expect(result).toContainText(`${pl.progression.tokens} +10`);
  await page.screenshot({ path: 'test-results/m5a-wynik.png' });
});

test('opens SzprychaApp at a stop and plays the opening and closing dialogues', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');

  const phone = page.getByRole('dialog', { name: pl.phone.title });
  const openPhone = page.getByRole('button', { name: pl.phone.open });
  await page.keyboard.down('ArrowUp');
  await expect(canvas).not.toHaveAttribute('data-speed', '0');
  await page.keyboard.press('KeyM');
  await expect(phone).toBeHidden();
  await expect(page.locator('.drive-notice')).toBeVisible();
  await expect(page.locator('.drive-notice')).not.toHaveText(
    pl.driving.prototype,
  );
  await openPhone.click();
  await expect(phone).toBeHidden();
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('Space');

  await page.keyboard.press('KeyM');
  await expect(phone).toBeVisible();
  await expect(phone.getByText(tutorial.opis)).toBeVisible();
  await page.screenshot({
    path: 'test-results/m4b-szprychaapp.png',
    animations: 'disabled',
  });
  await phone.getByRole('button', { name: new RegExp(pl.phone.start) }).click();
  const conversation = dialogue(page);
  const text = conversation.locator('.dialogue-text');
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await expect(conversation.locator('.dialogue-portrait')).toHaveCSS(
    'width',
    '64px',
  );
  await expect(conversation.locator('.dialogue-portrait')).toHaveCSS(
    'height',
    '64px',
  );
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText('1:30');
  await page.keyboard.down('ArrowUp');
  await page.screenshot({ path: 'test-results/m4b-dialogue.png' });
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText('1:30');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(text).toHaveText(pl.dialogi.reguly['ZNAK-STOP']);
  const next = conversation.getByRole('button', { name: pl.dialogueUi.next });
  await next.click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].powitanie);
  await next.click();
  await expect(conversation).toBeHidden();

  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1184);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].meta);
  await page.keyboard.up('ArrowUp');
  await page.screenshot({ path: 'test-results/m4b-dialogue-end.png' });
  await next.click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].po_mecie);
  await next.click();
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();

  await page.reload();
  await chooseCity(page, 'warszawa');
  await openPhone.click();
  await phone
    .getByRole('button', { name: `${pl.phone.start} · ${tutorial.tytul}` })
    .click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].powitanie);
});

test('uses Select and A on a gamepad without passing A through to the bicycle', async ({
  page,
}) => {
  const press = await mockGamepad(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await press(8);
  await expect(
    page.getByRole('dialog', { name: pl.phone.title }),
  ).toBeVisible();
  await press(0);
  const text = dialogue(page).locator('.dialogue-text');
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await press(-1);
  await page.waitForTimeout(100);
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await press(0);
  await page.waitForTimeout(100);
  await press(-1);
  await expect(text).toHaveText(pl.dialogi.reguly['ZNAK-STOP']);
  await press(0);
  await expect(dialogue(page)).toBeHidden();
  await press(-1);
  await expect(canvas).toHaveAttribute('data-walking', 'false');
});

test.describe('touch dialogue controls', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('opens the phone and skips the dialogue with a long press', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-scene',
      'MainMenu',
    );
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: pl.phone.open }).tap();
    const phone = page.getByRole('dialog', { name: pl.phone.title });
    await phone.getByRole('button', { name: new RegExp(pl.phone.start) }).tap();
    const next = dialogue(page).getByRole('button', {
      name: pl.dialogueUi.next,
    });
    await next.tap();
    await expect(dialogue(page).locator('.dialogue-text')).toHaveText(
      pl.dialogi.reguly['ZNAK-STOP'],
    );
    const box = (await next.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await expect(dialogue(page)).toBeHidden();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(
      page.getByRole('button', { name: pl.missionUi.equip }),
    ).toBeVisible();
  });
});

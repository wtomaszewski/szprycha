import { test, expect, type Page } from '@playwright/test';
import { chooseCity, cityPin } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };
import questions from '../../content/pytania.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { expectQuestionSign } from './question-dialog';
import { mockGamepad } from './helpers/gamepad';
import { answer, parentZone } from './helpers/parent-gate';
import { readProfile } from './progress-profile';

const tutorial = pl.misje['WAW-T-01'];
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const skipDialogue = (page: Page) =>
  dialogue(page).getByRole('button', { name: pl.dialogueUi.skip }).click();
const questionDialog = (page: Page) =>
  page.getByRole('dialog', { name: pl.progression.questionTitle });
const failure = (page: Page, title = pl.missionFailure.title) =>
  page.getByRole('dialog', { name: title, exact: true });
const questionFor = (rule: string) =>
  questions.pytania.find(({ przepisy }) => przepisy.includes(rule))!;

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
  const pointsHud = page.getByLabel(pl.progression.points, { exact: true });
  const start = await canvas.getAttribute('data-y');
  await expect(timer).toHaveText('1:28', { timeout: 8_000 });
  await page.keyboard.down('ArrowUp');
  const lesson = failure(page);
  await expect(lesson).toBeVisible();
  const frozen = await canvas.getAttribute('data-y');
  await page.keyboard.press('Escape');
  await expect(lesson).toBeVisible();
  await expect(canvas).toHaveAttribute('data-y', frozen!);
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('ArrowUp');

  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  const helmet = content.przepisy.przepisy.find(({ id }) => id === 'KASK-01');
  await expect(lesson).toContainText(pl.missionFailure.reasons.major);
  await expect(lesson).toContainText(helmet!.feedback);
  await expect(questionDialog(page)).toBeHidden();
  await expect(pointsHud).toHaveText('0');
  await expect(lesson.locator('h2')).toHaveCSS(
    'animation-name',
    'mission-stamp-in',
  );
  await page.screenshot({
    path: process.env.UPDATE_FAILURE_SCREENSHOTS
      ? 'docs/screenshots/97-po.png'
      : test.info().outputPath('failure.png'),
    animations: 'disabled',
  });

  await lesson.getByRole('button', { name: pl.missionFailure.retry }).click();
  await expect(dialogue(page)).toBeVisible();
  await expect(lesson).toBeHidden();
  await expect(canvas).toHaveAttribute('data-y', start!);
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await expect(timer).toHaveText('1:30');
  await expect(pointsHud).toHaveText('0');
  await expect(page.getByLabel(pl.progression.attention)).toHaveText(/0\/3/);
  await skipDialogue(page);
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
  const summary = page.getByRole('region', { name: pl.missionUi.result });
  await expect(summary).toContainText(`${pl.missionResults.timeBonus} +500`);
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
  const meter = skillMap.getByRole('meter', { name: pl.skillMap.modules.M03 });
  const moduleRules = content.przepisy.przepisy.filter(
    ({ modul }) => modul === 'M03',
  );
  await expect(meter).toHaveJSProperty(
    'value',
    content.balans.mastery.good / moduleRules.length,
  );
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

async function reachStopQuestion(
  page: Page,
  accelerate: 'ArrowUp' | 'ArrowDown',
  highlightPath?: string,
) {
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  await skipDialogue(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();

  const canvas = page.locator('canvas');
  const resume = page.getByRole('button', { name: pl.missionUi.continue });
  await page.keyboard.down(accelerate);
  const lesson = page.getByRole('dialog', { name: pl.replay.title });
  await expect(lesson).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up(accelerate);
  await expect(lesson).toContainText(/STOP/);
  if (highlightPath) await page.screenshot({ path: highlightPath });
  await lesson.getByRole('button', { name: pl.replay.resume }).click();
  await page.keyboard.down(accelerate);
  await expect(resume).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up(accelerate);
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

  await page.keyboard.down(accelerate);
  await expect(resume).toBeVisible();
  await page.keyboard.up(accelerate);
  await expect(attention).toContainText('2/3');
  await resume.click();

  await page.keyboard.down(accelerate);
  const question = questionDialog(page);
  await expect(question).toBeVisible();
  await page.keyboard.up(accelerate);
  const stop = questionFor('ZNAK-STOP');
  await expect(question).toContainText(stop.pytanie);
  await expect(attention).toContainText('3/3');
  return { canvas, resume, attention, question, stop };
}

test('clears full Road Attention on a correct answer and grants stars', async ({
  page,
}) => {
  test.setTimeout(45_000);
  const { tap } = await mockGamepad(page);
  const { canvas, resume, attention, question, stop } = await reachStopQuestion(
    page,
    'ArrowUp',
    'test-results/m4c-stop-highlight.png',
  );
  await expectQuestionSign(question, 'B-20');
  const clock = await page.getByLabel(pl.missionUi.timer).textContent();
  await tap(0);
  await expect(question.getByRole('button').first()).not.toBeFocused();
  await tap(13);
  await expect(question.getByRole('button').first()).toBeFocused();
  const correct = question.getByRole('button', {
    name: stop.odpowiedzi[stop.poprawna],
    exact: true,
  });
  await correct.focus();
  await tap(0);
  await expect(question.getByRole('status')).toHaveText(
    `${pl.progression.wiseHead} +100`,
  );
  await expect(attention).toContainText('0/3');
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText(clock!);
  await question.getByRole('button', { name: pl.progression.continue }).click();
  await expect(question).toBeHidden();
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

test('restarts from the mission spawn after a failed control question at a checkpoint', async ({
  page,
}) => {
  const { canvas, attention, question, stop } = await reachStopQuestion(
    page,
    'ArrowUp',
  );
  expect(Number(await canvas.getAttribute('data-y'))).toBeGreaterThan(1199);
  const wrongAnswer =
    stop.odpowiedzi[(stop.poprawna + 1) % stop.odpowiedzi.length]!;
  await question
    .getByRole('button', { name: wrongAnswer, exact: true })
    .click();
  const lesson = failure(page);
  await expect(question).toBeHidden();
  await expect(lesson).toContainText(pl.missionFailure.reasons.uwaga_drogowki);
  await expect(lesson.locator('#mission-failure-tip')).toContainText('STOP');

  await lesson.getByRole('button', { name: pl.missionFailure.retry }).click();
  await expect(dialogue(page)).toBeVisible();
  await expect(canvas).toHaveAttribute('data-y', '928');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText('1:30');
  await expect(
    page.getByLabel(pl.progression.points, { exact: true }),
  ).toHaveText('0');
  await expect(attention).toContainText('0/3');
  await skipDialogue(page);
  await expect(
    page.getByRole('button', { name: pl.missionUi.equip }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readProfile(page)).missionPoints)
    .toBe(0);
});

test('shows the saved gentle heading without animation when a mission times out', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/data/content.json', async (route) => {
    const response = await route.fetch();
    const content: GameContent = await response.json();
    content.misje.find(({ id }) => id === 'WAW-T-01')!.limit_s = 1;
    await route.fulfill({ response, json: content });
  });

  await page.goto('/');
  const { open, gate, settings } = parentZone(page);
  await open.click();
  await answer(gate, (button) => button.click());
  await settings
    .getByRole('checkbox', { name: pl.parentZone.gentleFailure })
    .check();
  await expect
    .poll(async () => (await readProfile(page)).gentleFailure)
    .toBe(true);
  await page.reload();

  await chooseCity(page, 'warszawa', 'campaign');
  await skipDialogue(page);
  const lesson = failure(page, pl.missionUi.failed);
  await expect(lesson).toContainText(pl.missionFailure.reasons.czas_minal);
  await expect(lesson).toContainText(pl.missionFailure.tips.czas_minal);
  await expect(lesson.locator('h2')).toHaveCSS('animation-name', 'none');
  await page.screenshot({
    path: process.env.UPDATE_FAILURE_SCREENSHOTS
      ? 'docs/screenshots/97-lagodny.png'
      : test.info().outputPath('gentle.png'),
  });
  await lesson.getByRole('button', { name: pl.missionFailure.exit }).click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
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
  const { setButton, tap } = await mockGamepad(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await tap(8);
  await expect(
    page.getByRole('dialog', { name: pl.phone.title }),
  ).toBeVisible();
  await setButton(0);
  const text = dialogue(page).locator('.dialogue-text');
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await setButton(-1);
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await tap(0);
  await expect(text).toHaveText(pl.dialogi.reguly['ZNAK-STOP']);
  await setButton(0);
  await expect(dialogue(page)).toBeHidden();
  await setButton(-1);
  await expect(canvas).toHaveAttribute('data-walking', 'false');
});

test.describe('touch dialogue controls', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('shows the STOP sign in a Road Attention question', async ({ page }) => {
    // The touch profile uses screen directions. The tutorial heads south.
    const { question, stop } = await reachStopQuestion(page, 'ArrowDown');
    await expectQuestionSign(question, 'B-20');
    await question
      .getByRole('button', {
        name: stop.odpowiedzi[stop.poprawna],
        exact: true,
      })
      .tap();
    await expect(question.getByRole('status')).toHaveText(
      `${pl.progression.wiseHead} +100`,
    );
  });

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

import { expect, test, type Page } from '@playwright/test';
import { findDisplayedQuestion } from './question-dialog';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  FIXED_STEP,
  type DriveInput,
  type Rider,
  type RiderState,
} from '../../src/gameplay/bicycle';
import { PlacRun, placIds } from '../../src/gameplay/plac/PlacRun';
import { readContent } from '../../tools/content';
import { approachWaypoint, warsawRoutes } from '../missions/warsaw-routes';
import { cleanPlacInput } from '../plac/clean-course';
import { profile } from './helpers/profile';
import { chooseCity } from './city-picker';

test.use({ baseURL: 'http://127.0.0.1:4174', reducedMotion: 'reduce' });

const content = await readContent();
const { exam, quiz } = pl;
const points = warsawRoutes['WAW-A1-03'].legal.slice(0, 3);

type DriveScene = {
  events: { once(name: 'create', listener: () => void): void };
  sys: { sceneUpdate(time: number, delta: number): void };
  controls: { actions: RiderState; read(): DriveInput };
  rider: Rider;
  road?: { lastCountdowns: boolean };
  review?: unknown;
  resultPresented: boolean;
  tickForTest(time: number, delta: number): void;
};
type Game = { scene: { getScene(name: string): DriveScene } };
type SceneManager = {
  game: Game;
  keys: Record<string, DriveScene | undefined>;
  update(time: number, delta: number): void;
};

async function offlineGame(page: Page) {
  // Use the Phaser module already loaded by production to run deterministic
  // fixed ticks. Scene transitions, physics, judging and persistence are real.
  return page.evaluateHandle(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[href*="/phaser-"]',
    )!;
    const module: Record<
      string,
      () => { Scenes: { SceneManager: { prototype: SceneManager } } }
    > = await import(link.href);
    const phaser = Object.values(module)[0]!();
    const prototype = phaser.Scenes.SceneManager.prototype;
    const original = prototype.update;
    const remaining = new Set(['Plac', 'City']);
    return await new Promise<Game>((resolve) => {
      prototype.update = function (time, delta) {
        for (const name of remaining) {
          const scene = this.keys[name];
          if (!scene) continue;
          remaining.delete(name);
          scene.events.once('create', () => {
            scene.tickForTest = scene.sys.sceneUpdate.bind(scene);
            scene.sys.sceneUpdate = () => {};
          });
        }
        if (!remaining.size) prototype.update = original;
        original.call(this, time, delta);
        resolve(this.game);
      };
    });
  });
}

test('earns, prints and reopens the licence entirely offline', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const open = page.getByRole('button', { name: exam.menu, exact: true });
  const panel = page.getByRole('dialog', { name: exam.title });
  await page.goto('/');
  await open.click();
  await expect(
    panel.getByRole('button', { name: exam.startTheory }),
  ).toBeDisabled();
  await panel.getByRole('button', { name: quiz.close }).click();
  await chooseCity(page, 'warszawa');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.menu, exact: true })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );

  const saved = await profile(page, {
    nickname: 'Szybki Jeż 1',
    completed: content.misje
      .filter(({ miasto, poboczna }) => miasto === 'warszawa' && !poboczna)
      .map(({ id }) => id),
    missionPoints: 40_000,
    mastery: Object.fromEntries(
      content.przepisy.przepisy.map(({ id }) => [
        id,
        { value: 70, goodToday: 0 },
      ]),
    ),
    quiz: {
      cards: Object.fromEntries(
        content.pytania.pytania.map(({ id }) => [
          id,
          { box: 5, due: '2099-01-01' },
        ]),
      ),
      streak: 4,
    },
  });
  expect(saved.licencePassed).toBe(false);

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  const game = await offlineGame(page);
  const before = await profile(page);
  await open.click();
  await panel.getByRole('button', { name: exam.startTheory }).click();

  const seen = new Set<string>();
  for (let i = 1; i <= content.balans.licencja.teoria_pytan; i++) {
    await expect(panel.getByRole('progressbar')).toHaveAccessibleName(
      `${exam.theory} · ${quiz.question} ${i} / 25`,
    );
    const prompt = await panel.getByRole('heading', { level: 3 }).textContent();
    const options = await panel
      .locator('.quiz-answers button')
      .allTextContents();
    const question = findDisplayedQuestion(
      content.pytania.pytania,
      prompt,
      options,
    )!;
    expect(question).toBeDefined();
    expect(seen.has(question.id)).toBe(false);
    seen.add(question.id);
    const index =
      i <= 5
        ? (question.poprawna + 1) % question.odpowiedzi.length
        : question.poprawna;
    await panel
      .getByRole('button', { name: question.odpowiedzi[index], exact: true })
      .click();
  }
  await expect(panel.getByText('20 / 25', { exact: false })).toBeVisible();
  await expect(await profile(page)).toEqual(before);
  await panel.getByRole('button', { name: exam.startPractice }).click();

  const {
    plac: course,
    balans: { plac: balance },
  } = content;
  const actions: RiderState = {
    signal: null,
    looking: false,
    lights: false,
    bell: false,
  };
  const run = new PlacRun(course, balance, actions, placIds, false);
  for (const id of placIds) {
    const canvas = page.locator('canvas[data-scene="Plac"]');
    await expect(canvas).toHaveAttribute('data-plac-exercise', id);
    actions.signal = null;
    actions.looking = false;
    const frames: {
      input: DriveInput;
      signal: RiderState['signal'];
      looking: boolean;
    }[] = [];
    while (!run.result) {
      const input = cleanPlacInput(run, actions, course, balance);
      frames.push({ input, signal: actions.signal, looking: actions.looking });
      run.step(input);
    }
    run.advance();
    await game.evaluate(
      (game, { frames, delta }) => {
        const scene = game.scene.getScene('Plac');
        const read = scene.controls.read;
        let frame = 0;
        scene.controls.read = () => {
          const { input, looking, signal } = frames[frame++]!;
          Object.assign(scene.controls.actions, { looking, signal });
          return input;
        };
        try {
          for (let i = 0; i < frames.length; i++)
            scene.tickForTest(i * delta, delta);
        } finally {
          scene.controls.read = read;
        }
      },
      { frames, delta: FIXED_STEP * 1000 },
    );
    await expect(canvas).toHaveAttribute('data-plac-grade', 'good');
    const feedback = page.getByRole('dialog');
    await expect(
      feedback.getByText(`${pl.plac.coach} · ${exam.cleanExercise}`),
    ).toBeVisible();
    await feedback.getByRole('button', { name: exam.nextExercise }).click();
  }

  await page.getByRole('button', { name: exam.startRide }).click();
  await expect(
    page.locator('canvas[data-mission="WAW-EGZAMIN"]'),
  ).toBeVisible();
  await expect(page.getByText(exam.rideIntro)).toBeVisible();
  await page.getByRole('button', { name: pl.dialogueUi.next }).click();
  await page.keyboard.press('Escape');
  await page.getByText(pl.settings.accessibility, { exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: pl.settings.signalCountdowns }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: pl.driving.resume }).click();
  const drive = await game.evaluate(
    (game, { points, delta, approach }) => {
      const scene = game.scene.getScene('City');
      const approachWaypoint = new Function(
        `return (${approach});`,
      )() as typeof import('../missions/warsaw-routes').approachWaypoint;
      const read = scene.controls.read;
      let point = 0;
      let waited = 0;
      scene.controls.read = () => {
        const target = points[Math.min(point, points.length - 1)]!;
        const move = approachWaypoint(scene.rider, target);
        scene.controls.actions.signal = target.signal ?? null;
        if (
          move.arrived &&
          scene.rider.speed === 0 &&
          ++waited >= ((('wait' in target ? target.wait : 0) ?? 0) * 60 || 1)
        ) {
          point++;
          waited = 0;
        }
        return move;
      };
      try {
        for (
          let i = 0;
          i < 2400 && !scene.resultPresented && !scene.review;
          i++
        )
          scene.tickForTest(i * delta, delta);
        return {
          presented: scene.resultPresented,
          review: !!scene.review,
          rider: scene.rider,
          signalCountdowns: scene.road?.lastCountdowns,
        };
      } finally {
        scene.controls.read = read;
      }
    },
    { points, delta: FIXED_STEP * 1000, approach: approachWaypoint.toString() },
  );
  expect(drive, JSON.stringify(drive)).toMatchObject({
    presented: true,
    review: false,
    signalCountdowns: false,
  });

  await expect(panel.getByText(exam.reward)).toBeVisible();
  await expect.poll(async () => (await profile(page)).licencePassed).toBe(true);
  const earned = await profile(page);
  expect(earned).toEqual({
    ...before,
    licencePassed: true,
    licence: {
      date: expect.any(String),
      theory: { correct: 20, total: 25 },
      practice: { points: 6, max: 6 },
    },
  });
  await panel.getByRole('button', { name: exam.certificate }).click();
  const certificate = page.getByRole('dialog', { name: exam.licence });
  const paper = certificate.locator('article');
  await expect(paper).toContainText(earned.nickname);
  await expect(paper).toContainText(exam.disclaimer);
  await expect(certificate.getByRole('textbox')).toHaveCount(0);
  await expect(await profile(page)).toEqual(earned);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await paper.screenshot({
    path: testInfo.outputPath('61-m7c-certyfikat.png'),
  });
  await page.emulateMedia({ media: 'print' });
  await expect(paper).toBeVisible();
  await expect(
    certificate.getByRole('button', { name: exam.print }),
  ).toBeHidden();
  await expect(page.locator('canvas')).toBeHidden();
  await page.pdf({
    path: testInfo.outputPath('certyfikat.pdf'),
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await certificate.getByRole('button', { name: quiz.close }).click();
  await panel.getByRole('button', { name: quiz.close }).click();
  await page.getByRole('button', { name: pl.plac.title }).click();
  await expect(
    page.getByRole('heading', { name: pl.plac.title }),
  ).toBeVisible();
  await page.getByRole('button', { name: pl.driving.menu }).click();
  await expect(panel).toBeHidden();
  await page.locator('canvas[data-scene="MainMenu"]').press('Enter');
  await expect(page.locator('canvas[data-map="miasteczko"]')).toBeVisible();
  await page.reload();
  await open.click();
  await panel.getByRole('button', { name: exam.certificate }).click();
  await expect(certificate.locator('article')).toContainText(earned.nickname);
  await expect(certificate.getByRole('textbox')).toHaveCount(0);
  expect(errors).toEqual([]);
});

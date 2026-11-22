import { expect, test } from '@playwright/test';
import bank from '../../content/pytania.json' with { type: 'json' };
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';

const production = 'http://127.0.0.1:4174/';

test('opens both quiz modes at Kurier, studies signs offline and saves after reload', async ({
  page,
  context,
}, testInfo) => {
  const menu = page.locator('#game canvas');
  const quizButton = page.getByRole('button', {
    name: pl.quiz.title,
    exact: true,
  });
  const quiz = page.getByRole('dialog', { name: pl.quiz.title });
  await page.goto(production);
  await expect(menu).toHaveAttribute('data-scene', 'MainMenu');
  await quizButton.click();
  await expect(quiz.getByText(pl.quiz.locked)).toBeVisible();
  await page.evaluate(
    async ([name, store, key]) => {
      await navigator.serviceWorker.ready;
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, 'readwrite');
          const records = tx.objectStore(store);
          const query = records.get(key);
          query.onsuccess = () => {
            const profile = query.result as ProgressProfile;
            records.put({ ...profile, missionPoints: 4_000 }, key);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    },
    [progressDatabase, progressStoreName, progressRecordKey] as const,
  );

  await context.setOffline(true);
  await page.reload();
  await expect(menu).toHaveAttribute('data-scene', 'MainMenu');
  await quizButton.focus();
  await page.keyboard.press('Enter');
  await expect(
    quiz.getByRole('button', { name: pl.quiz.quick, exact: true }),
  ).toBeVisible();
  const study = quiz.getByRole('button', {
    name: `M03 · ${pl.skillMap.modules.M03}`,
  });
  await study.click();

  const signs = bank.pytania.filter(({ modul }) => modul === 'M03');
  const composite = signs.find(({ id }) => id === 'Q024')!;
  const prompts = new Set<string>();
  for (let index = 0; index < signs.length; index++) {
    const prompt = await quiz.getByRole('heading', { level: 3 }).innerText();
    prompts.add(prompt);
    const question = signs.find(({ pytanie }) => pytanie === prompt)!;
    if (question === composite) {
      for (const code of ['B-2', 'T-22'])
        await expect(quiz.locator(`img[data-sign="${code}"]`)).toBeVisible();
    }
    const answer = quiz.getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    });
    await answer.focus();
    await page.keyboard.press('Enter');
    await expect(quiz.getByRole('status')).toContainText(pl.quiz.mentor);
    if (question === composite)
      await quiz.screenshot({ path: testInfo.outputPath('quiz-m7b.png') });
    await quiz
      .getByRole('button', {
        name: index + 1 === signs.length ? pl.quiz.result : pl.quiz.next,
        exact: true,
      })
      .click();
  }
  expect(prompts.size).toBe(signs.length);
  await expect(
    quiz.getByText(`${pl.quiz.score} · ${signs.length} / ${signs.length}`),
  ).toBeVisible();

  await page.reload();
  await quizButton.click();
  await study.click();
  await expect(quiz.getByText(pl.quiz.empty)).toBeVisible();
  await quiz.getByRole('button', { name: pl.quiz.choose }).click();
  await quiz.getByRole('button', { name: pl.quiz.quick, exact: true }).click();
  await expect(
    quiz.getByText(`${pl.quiz.question} 1 / 10`, { exact: true }),
  ).toBeVisible();
  const prompt = await quiz.getByRole('heading', { level: 3 }).innerText();
  const quickQuestion = bank.pytania.find(({ pytanie }) => pytanie === prompt)!;
  const correctAnswer = quickQuestion.odpowiedzi[quickQuestion.poprawna]!;
  const wrongAnswer = quickQuestion.odpowiedzi.find(
    (answer) => answer !== correctAnswer,
  )!;
  await quiz.getByRole('button', { name: wrongAnswer, exact: true }).click();
  await expect(quiz.getByRole('status')).toContainText(
    `${pl.quiz.incorrect} · ${correctAnswer}`,
  );
  await expect(quiz.getByRole('button', { name: pl.quiz.next })).toBeEnabled();
  await quiz.getByRole('button', { name: pl.skillMap.close }).click();
  await page.getByRole('button', { name: pl.skillMap.title }).click();
  const skills = page.getByRole('dialog', { name: pl.skillMap.title });
  const mastery = skills.getByRole('meter', { name: pl.skillMap.modules.M03 });
  expect(Number(await mastery.getAttribute('value'))).toBeGreaterThan(0);
});

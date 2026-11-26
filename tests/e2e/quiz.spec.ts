import { expect, test, type Page } from '@playwright/test';
import bank from '../../content/pytania.json' with { type: 'json' };
import pl from '../../i18n/pl.json' with { type: 'json' };
import { findDisplayedQuestion } from './question-dialog';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
} from '../../src/core/progressStore';

test.use({ baseURL: 'http://127.0.0.1:4174' });

async function reachCourierRank(page: Page) {
  await page.evaluate(
    ({ database, storeName, key }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const get = store.get(key);
          get.onsuccess = () =>
            store.put({ ...get.result, missionPoints: 4_000 }, key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    {
      database: progressDatabase,
      storeName: progressStoreName,
      key: progressRecordKey,
    },
  );
}

test('solves illustrated questions and shows explanations offline, then retains scheduled reviews', async ({
  page,
  context,
}, testInfo) => {
  const { quiz } = pl;
  const title = page.getByRole('button', { name: quiz.title, exact: true });
  const dialog = page.getByRole('dialog', { name: quiz.title });
  await page.goto('/');
  await title.click();
  await expect(dialog.getByText(quiz.locked)).toBeVisible();
  await reachCourierRank(page);

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await title.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('button', { name: `${quiz.quick} · 10`, exact: true })
    .click();
  await expect(dialog.getByRole('progressbar')).toHaveAccessibleName(
    `${quiz.quick} · ${quiz.question} 1 / 10`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const module = pl.skillMap.modules.M03;
  const questions = bank.pytania.filter(({ modul }) => modul === 'M03');
  const composition = questions.find(({ id }) => id === 'Q024')!;
  await title.click();
  await dialog
    .getByRole('button', {
      name: `${module} · ${questions.length}`,
      exact: true,
    })
    .click();
  const seen = new Set<string>();
  for (let i = 1; i <= questions.length; i++) {
    const meter = dialog.getByRole('progressbar');
    await expect(meter).toHaveAccessibleName(
      `${module} · ${quiz.question} ${i} / ${questions.length}`,
    );
    const prompt = await dialog
      .getByRole('heading', { level: 3 })
      .textContent();
    const options = await dialog
      .locator('.quiz-answers button')
      .allTextContents();
    const question = findDisplayedQuestion(questions, prompt, options)!;
    expect(question).toBeDefined();
    expect(seen.has(question.id)).toBe(false);
    seen.add(question.id);
    const isComposition = question.id === composition.id;
    if (isComposition) {
      const sign = dialog.getByRole('img', {
        name: quiz.signAlt['B-2'],
        exact: true,
      });
      const plate = dialog.getByRole('img', {
        name: quiz.signAlt['T-22'],
        exact: true,
      });
      await expect(sign).toBeVisible();
      await expect(plate).toBeVisible();
      for (const image of [sign, plate])
        await expect
          .poll(() =>
            image.evaluate((img: HTMLImageElement) => img.naturalWidth),
          )
          .toBe(64);
      expect((await sign.boundingBox())!.y).toBeLessThan(
        (await plate.boundingBox())!.y,
      );
      await page.mouse.move(0, 0);
      await dialog.screenshot({ path: testInfo.outputPath('quiz-znaki.png') });
    }
    const index = isComposition ? 0 : question.poprawna;
    await dialog
      .getByRole('button', { name: question.odpowiedzi[index], exact: true })
      .click();
    await expect(
      dialog.getByText(isComposition ? quiz.incorrect : quiz.correct, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByText(question.wyjasnienie, { exact: true }),
    ).toBeVisible();
    if (isComposition) {
      await expect(
        dialog.getByText(question.odpowiedzi[question.poprawna]!, {
          exact: true,
        }),
      ).toBeVisible();
    }
    await dialog
      .getByRole('button', {
        name: i === questions.length ? quiz.result : quiz.next,
        exact: true,
      })
      .click();
  }
  await expect(
    dialog.getByText(
      `${quiz.score} · ${questions.length - 1} / ${questions.length}`,
    ),
  ).toBeVisible();

  await page.reload();
  await title.click();
  await dialog
    .getByRole('button', { name: `${module} · 1`, exact: true })
    .click();
  await expect(
    dialog.getByText(composition.pytanie, { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('button', {
      name: composition.odpowiedzi[composition.poprawna],
      exact: true,
    })
    .click();
  await dialog.getByRole('button', { name: quiz.result, exact: true }).click();
  await expect(dialog.getByText(`${quiz.score} · 1 / 1`)).toBeVisible();
  await dialog.getByRole('button', { name: quiz.repeat, exact: true }).click();
  await dialog
    .getByRole('button', { name: `${module} · 0`, exact: true })
    .click();
  await expect(dialog.getByText(quiz.caughtUp)).toBeVisible();
});

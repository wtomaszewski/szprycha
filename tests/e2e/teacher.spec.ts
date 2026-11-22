import { expect, test, type Page, type Request } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';
import { answer, parentZone } from './helpers/parent-gate';

test.use({ baseURL: 'http://127.0.0.1:4175', reducedMotion: 'reduce' });
const {
  teacher,
  classMembership: classroom,
  parentZone: parent,
  rankings,
} = pl;
const api = 'http://127.0.0.1:8787';

async function settings(page: Page) {
  const zone = parentZone(page);
  await zone.open.click();
  await answer(zone.gate, (button) => button.click());
  return zone.settings;
}

async function earnProgress(page: Page) {
  await page.evaluate(
    ({ database, store, key }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction(store, 'readwrite');
          const progress = transaction.objectStore(store);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
          const get = progress.get(key);
          get.onsuccess = () => {
            const profile = get.result as ProgressProfile;
            profile.quizXp += 42;
            profile.mastery['KASK-01'] = { value: 90, goodToday: 0 };
            progress.put(profile, key);
          };
        };
      }),
    {
      database: progressDatabase,
      store: progressStoreName,
      key: progressRecordKey,
    },
  );
}

test('runs the teacher classroom and gated student flow on the local API and keeps labels in one browser', async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  const game = await browser.newPage({ baseURL: 'http://127.0.0.1:4175' });
  const second = await browser.newPage({ baseURL: 'http://127.0.0.1:4175' });
  const email = `teacher-${crypto.randomUUID()}@example.test`;
  const password = 'demo-teacher-test-password';
  const label = 'Ala Próbna';
  const room = 'Klasa 4B';
  const requests: Request[] = [];
  page.on('request', (request) => requests.push(request));
  const code = page.getByLabel(classroom.code, { exact: true });
  const roster = page.getByRole('table', { name: teacher.board });
  const localLabel = (teacherPage: Page) =>
    teacherPage.getByRole('textbox', { name: /^Etykieta dla / });
  const click = (name: string) =>
    page.getByRole('button', { name, exact: true }).click();
  const login = async (teacherPage: Page) => {
    await teacherPage.getByLabel(teacher.email).fill(email);
    await teacherPage
      .getByLabel(teacher.password, { exact: true })
      .fill(password);
    await teacherPage
      .getByRole('button', { name: teacher.login, exact: true })
      .click();
    await expect(
      teacherPage.getByRole('heading', { name: room }),
    ).toBeVisible();
  };

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/nauczyciel.html');
    await expect(
      page.getByRole('heading', { name: teacher.title }),
    ).toBeVisible();
    await expect(page.locator('#pwa-splash')).toHaveCount(0);
    await click(teacher.register);
    await page.getByLabel(teacher.email).fill(email);
    await page.getByLabel(teacher.password, { exact: true }).fill(password);
    await page.getByLabel(teacher.adult).check();
    await click(teacher.register);
    await page.getByLabel(teacher.className).fill(room);
    await click(teacher.create);
    await expect(code).toBeVisible();
    const originalCode = (await code.textContent())!;
    await click(teacher.rotateCode);
    await expect(code).not.toHaveText(originalCode);
    const newCode = (await code.textContent())!;

    await game.goto('/');
    const zone = parentZone(game);
    await expect(game.getByLabel(classroom.code)).toBeHidden();
    await expect(game.getByRole('link', { name: teacher.title })).toHaveCount(
      0,
    );
    const parents = await settings(game);
    await expect(parents.getByLabel(classroom.code)).toBeHidden();
    const rankingsToggle = parents.getByRole('checkbox', {
      name: parent.rankings,
    });
    await rankingsToggle.check();
    const nickname = (await parents.getByLabel(parent.nickname).textContent())!;
    await parents.getByLabel(classroom.code).fill(originalCode);
    await parents.getByRole('button', { name: classroom.join }).click();
    await expect(parents.getByText(classroom.invalidCode)).toBeVisible();
    await parents.getByLabel(classroom.code).fill(newCode.toLowerCase());
    await parents.getByRole('button', { name: classroom.join }).click();
    await expect(parents.getByText(classroom.joined)).toBeVisible();
    await expect(
      parents.getByRole('button', { name: classroom.leave }),
    ).toBeVisible();

    await earnProgress(game);
    const synced = game.waitForResponse(
      (response) =>
        response.url() === api + '/v1/class/progress' &&
        response.request().method() === 'PUT',
    );
    await game.reload();
    expect((await synced).status()).toBe(204);
    await click(teacher.refresh);
    const row = roster.getByRole('row').filter({ hasText: nickname });
    await expect(
      row.getByRole('cell', { name: '42', exact: true }),
    ).toBeVisible();
    await expect(
      row.getByRole('cell', { name: '11', exact: true }),
    ).toBeVisible();
    await localLabel(page).fill(label);
    if (process.env.UPDATE_TEACHER_SCREENSHOTS) {
      await page.screenshot({
        path: 'docs/screenshots/83-panel-nauczyciela.png',
        animations: 'disabled',
      });
    }

    await page.reload();
    await login(page);
    await expect(localLabel(page)).toHaveValue(label);
    await second.goto('/nauczyciel.html');
    await login(second);
    await expect(localLabel(second)).toHaveValue('');

    await game
      .getByRole('button', { name: rankings.title, exact: true })
      .click();
    const board = game.getByRole('dialog', { name: rankings.title });
    await board.getByRole('tab', { name: rankings.boards.class }).click();
    await expect(board.getByRole('cell', { name: nickname })).toBeVisible();
    await expect(
      board.getByRole('cell', { name: '42', exact: true }),
    ).toBeVisible();
    await expect(board.getByText(label)).toHaveCount(0);
    if (process.env.UPDATE_TEACHER_SCREENSHOTS) {
      await game.screenshot({
        path: 'docs/screenshots/83-ranking-klasy.png',
        animations: 'disabled',
      });
    }
    await board.getByRole('button', { name: pl.m5c.close }).click();

    page.once('dialog', (dialog) => void dialog.accept());
    await click(teacher.reset);
    await expect(
      row.getByRole('cell', { name: '42', exact: true }),
    ).toHaveCount(0);
    await expect(
      row.getByRole('cell', { name: '11', exact: true }),
    ).toHaveCount(0);
    await click(teacher.closeCode);
    await expect(page.getByText(teacher.codeClosed)).toBeVisible();
    await settings(game);
    await rankingsToggle.uncheck();
    await expect(zone.settings.getByText(classroom.paused)).toBeVisible();
    await zone.settings.getByRole('button', { name: classroom.leave }).click();
    await expect(
      zone.settings.getByRole('button', { name: classroom.leave }),
    ).toBeHidden();
    await click(teacher.refresh);
    await expect(page.getByText(teacher.noStudents)).toBeVisible();

    page.once('dialog', (dialog) => void dialog.accept());
    await click(teacher.deleteClass);
    await expect(page.getByRole('heading', { name: room })).toHaveCount(0);
    page.once('dialog', (dialog) => void dialog.accept());
    await click(teacher.deleteAccount);
    await expect(page.getByText(teacher.accountDeleted)).toBeVisible();
    await second.getByRole('button', { name: teacher.refresh }).click();
    await expect(second.getByText(teacher.sessionEnded)).toBeVisible();

    const sent = await Promise.all(
      requests.map(async (request) => ({
        url: request.url(),
        body: request.postData(),
        headers: await request.allHeaders(),
      })),
    );
    expect(JSON.stringify(sent)).not.toContain(label);
    expect(JSON.stringify(sent)).not.toContain(encodeURIComponent(label));
  } finally {
    await Promise.all([game.close(), second.close()]);
  }
});

import { devices, expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';
import {
  FIXED_STEP,
  type DriveInput,
  type RiderState,
} from '../../src/gameplay/bicycle';
import { PlacRun, placIds } from '../../src/gameplay/plac/PlacRun';
import { readContent } from '../../tools/content';
import { cleanPlacInput } from '../plac/clean-course';
import { answer, parentZone } from './helpers/parent-gate';

test.use({ baseURL: 'http://127.0.0.1:4175', reducedMotion: 'reduce' });
const api = 'http://127.0.0.1:8787';
const { parentZone: parent, rankings, plac } = pl;
const content = await readContent();
const storage = {
  database: progressDatabase,
  store: progressStoreName,
  key: progressRecordKey,
};

async function profile(page: Page) {
  return page.evaluate(
    ({ database, store, key }) =>
      new Promise<ProgressProfile>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction(store).objectStore(store).get(key);
          get.onsuccess = () => {
            db.close();
            resolve(get.result);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    storage,
  );
}

async function settings(page: Page) {
  const zone = parentZone(page);
  await zone.open.click();
  await answer(zone.gate, (button) => button.click());
  return zone.settings;
}

type Scene = {
  events: { once(name: 'create', run: () => void): void };
  sys: { sceneUpdate(time: number, delta: number): void };
  controls: { actions: RiderState; read(): DriveInput };
  tickForTest(time: number, delta: number): void;
  scene: { start(key: string, data: object): void };
};
type Game = { scene: { getScene(name: string): Scene } };
type SceneManager = { game: Game; update(time: number, delta: number): void };

async function fixedTicks(page: Page, sceneName: 'Plac' | 'City') {
  return page.evaluateHandle(async (sceneName) => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[href*="/phaser-"]',
    )!;
    const module: Record<
      string,
      () => { Scenes: { SceneManager: { prototype: SceneManager } } }
    > = await import(link.href);
    const prototype = Object.values(module)[0]!().Scenes.SceneManager.prototype;
    const original = prototype.update;
    return await new Promise<Game>((resolve) => {
      prototype.update = function (time, delta) {
        prototype.update = original;
        const scene = this.game.scene.getScene(sceneName);
        scene.events.once('create', () => {
          scene.tickForTest = scene.sys.sceneUpdate.bind(scene);
          scene.sys.sceneUpdate = () => {};
        });
        original.call(this, time, delta);
        resolve(this.game);
      };
    });
  }, sceneName);
}

const close = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: pl.m5c.close }).click();

test('queues a clean Arcade run offline, syncs after reload and deletes only the server profile', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60_000);
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(api)) apiCalls.push(request.method());
  });
  await page.goto('/');
  const openRankings = page.getByRole('button', {
    name: rankings.title,
    exact: true,
  });
  await expect(openRankings).toBeHidden();
  const parents = await settings(page);
  const checkbox = parents.getByRole('checkbox', { name: parent.rankings });
  await expect(checkbox).not.toBeChecked();
  await expect(
    parents.getByRole('button', { name: parent.removeProfile }),
  ).toBeDisabled();
  expect(apiCalls).toEqual([]);
  await checkbox.check();
  await close(page);

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const game = await fixedTicks(page, 'Plac');
  await page.getByRole('button', { name: plac.title, exact: true }).click();
  await page.getByRole('button', { name: plac.arcade }).click();
  await context.setOffline(true);

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
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-plac-exercise',
      id,
    );
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
      (game, { frames, delta, feedback }) => {
        const scene = game.scene.getScene('Plac');
        const read = scene.controls.read;
        try {
          for (const { input, signal, looking } of frames) {
            scene.controls.read = () => input;
            Object.assign(scene.controls.actions, { signal, looking });
            scene.tickForTest(0, delta);
          }
          for (let i = 0; i < feedback; i++) scene.tickForTest(0, delta);
        } finally {
          scene.controls.read = read;
        }
      },
      {
        frames,
        delta: FIXED_STEP * 1000,
        feedback: Math.ceil(balance.feedback_s / FIXED_STEP),
      },
    );
  }
  await expect(page.getByRole('dialog').getByText(plac.clean)).toBeVisible();
  await expect
    .poll(async () => (await profile(page)).rankings?.queue.length)
    .toBe(1);
  const before = await profile(page);
  expect(before.plac?.times[0]).toBeDefined();
  expect(apiCalls).toEqual([]);

  await page.reload();
  await expect(openRankings).toBeVisible();
  await expect
    .poll(async () => (await profile(page)).rankings?.queue.length)
    .toBe(1);
  const uploaded = page.waitForResponse(
    (response) =>
      response.url() === api + '/v1/scores' &&
      response.request().method() === 'POST',
  );
  await context.setOffline(false);
  const response = await uploaded;
  expect(response.status()).toBe(201);
  expect((await response.request().allHeaders()).authorization).toBe(
    'Bearer ' + before.profileId,
  );
  expect(response.request().postDataJSON().score).toMatchObject({
    kind: 'plac',
    minor: 0,
    major: 0,
    inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  await expect
    .poll(async () => (await profile(page)).rankings?.queue.length)
    .toBe(0);
  await openRankings.click();
  await page.getByRole('tab', { name: rankings.boards.plac }).click();
  await expect(page.getByRole('cell', { name: before.nickname })).toBeVisible();
  await expect(page.getByText(/^Twoja pozycja:/)).toBeVisible();
  await close(page);

  await settings(page);
  await checkbox.uncheck();
  const remove = parents.getByRole('button', { name: parent.removeProfile });
  await remove.click();
  await expect(parents.getByText(parent.removeConfirmation)).toBeVisible();
  await parents.getByRole('button', { name: parent.removeCancel }).click();
  expect(apiCalls).not.toContain('DELETE');
  await remove.click();
  await parents.getByRole('button', { name: parent.removeConfirm }).click();
  await expect(parents.getByText(parent.profileRemoved)).toBeVisible();
  expect(apiCalls.filter((method) => method === 'DELETE')).toHaveLength(1);
  const after = await profile(page);
  expect(after.profileId).not.toBe(before.profileId);
  expect(after.plac).toEqual(before.plac);
  expect(after.nickname).toBe(before.nickname);
  expect(after.onlineRankings).toBe(false);
  expect(after.rankings).toBeUndefined();
  const board = await request.get(api + '/v1/rankings?board=plac', {
    headers: { Authorization: 'Bearer ' + before.profileId },
  });
  expect(await board.json()).toMatchObject({ self: null });
  await close(page);
  await expect(openRankings).toBeHidden();
});

test('publishes a completed tutorial mission and the XP earned that week', async ({
  page,
}) => {
  await page.goto('/');
  const parents = await settings(page);
  await parents.getByRole('checkbox', { name: parent.rankings }).check();
  await close(page);
  const game = await fixedTicks(page, 'City');
  const missionId = 'WAW-T-01';
  await game.evaluate((game, missionId) => {
    game.scene.getScene('MainMenu').scene.start('City', { missionId });
  }, missionId);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-mission',
    missionId,
  );
  const skip = page.getByRole('button', { name: pl.dialogueUi.skip });
  while (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: pl.missionUi.equip }).click();

  const successfulPost = (kind: string) =>
    page.waitForResponse(
      (response) =>
        response.url() === api + '/v1/scores' &&
        response.request().method() === 'POST' &&
        response.request().postDataJSON().score.kind === kind,
    );
  const mission = successfulPost('mission');
  const week = successfulPost('weekly-xp');
  await game.evaluate((game, delta) => {
    const scene = game.scene.getScene('City');
    const read = scene.controls.read;
    try {
      // Brake to a full stop before the stop line, then ride to the finish.
      for (const [ticks, y] of [
        [170, -1],
        [75, 1],
        [250, -1],
      ] as const) {
        scene.controls.read = () => ({
          x: 0,
          y,
          brake: y > 0,
          scheme: 'classic',
        });
        for (let i = 0; i < ticks; i++) scene.tickForTest(0, delta);
      }
    } finally {
      scene.controls.read = read;
    }
  }, FIXED_STEP * 1000);
  expect((await mission).status()).toBe(201);
  const weeklyResponse = await week;
  expect(weeklyResponse.status()).toBe(201);
  expect(weeklyResponse.request().postDataJSON().score.xp).toBeGreaterThan(0);
  expect((await profile(page)).completed).toContain(missionId);
});

const mobile = [
  {
    name: 'telefon',
    device: 'Pixel 7 landscape',
    viewport: { width: 640, height: 360 },
    target: 44,
  },
  {
    name: 'tablet',
    device: 'iPad (gen 7) landscape',
    viewport: { width: 1024, height: 768 },
    target: 56,
  },
] as const;
for (const { name, device, viewport, target } of mobile) {
  const { userAgent, deviceScaleFactor, isMobile, hasTouch } = devices[device]!;
  test.describe(name, () => {
    test.use({ userAgent, deviceScaleFactor, isMobile, hasTouch, viewport });

    test('shows rankings and parental settings within the safe area', async ({
      page,
      request,
    }) => {
      const insets = { top: 6, right: 24, bottom: 18, left: 36 };
      await page.goto('/');
      await page.evaluate((insets) => {
        for (const [edge, gap] of Object.entries(insets))
          document.documentElement.style.setProperty(
            `--safe-${edge}`,
            `${gap}px`,
          );
      }, insets);
      const parents = await settings(page);
      await parents.getByRole('checkbox', { name: parent.rankings }).check();
      const current = await profile(page);
      const rules = await (await request.get(api + '/v1/rules')).json();
      const result = await request.post(api + '/v1/scores', {
        headers: { Authorization: 'Bearer ' + current.profileId },
        data: {
          nickname: current.nickname,
          avatarId: current.avatarId,
          score: {
            kind: 'ride',
            city: 'warszawa',
            version: rules.ride.warszawa.version,
            ticks: 21_600,
            good: 10,
            minor: 0,
            major: 0,
            longestSeries: 10,
            cleanMeters: 1_281,
            speedPercent: 100,
            seed: 2,
            inputHash: 'a'.repeat(64),
          },
        },
      });
      expect(result.status()).toBe(201);
      await close(page);
      await page
        .getByRole('button', { name: rankings.title, exact: true })
        .tap();
      const dialog = page.getByRole('dialog', { name: rankings.title });
      await dialog.getByRole('tab', { name: rankings.boards.safety }).tap();
      await expect(
        dialog.getByRole('cell', { name: current.nickname }).first(),
      ).toBeVisible();
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(insets.left);
      expect(bounds.y).toBeGreaterThanOrEqual(insets.top);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        viewport.width - insets.right,
      );
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        viewport.height - insets.bottom,
      );
      expect(
        (await dialog
          .getByRole('tab', { name: rankings.boards.safety })
          .boundingBox())!.height,
      ).toBeGreaterThanOrEqual(target);
      await takeScreenshot(page, `${name}-rankingi`);
      await dialog.getByRole('tab', { name: rankings.boards.cities }).tap();
      await expect(dialog.getByText(rankings.event)).toBeVisible();
      await expect(dialog.getByText(/^Twój wkład/)).toBeVisible();
      if (name === 'tablet') await takeScreenshot(page, 'tablet-miasta');
      await dialog
        .getByRole('tab', { name: rankings.boards['weekly-xp'] })
        .tap();
      await expect(
        dialog.getByRole('combobox', { name: rankings.league }),
      ).toHaveValue('bronze');
      await dialog
        .getByRole('combobox', { name: rankings.league })
        .selectOption('silver');
      await expect(dialog.getByText(rankings.promotion)).toBeVisible();
      await dialog.getByRole('tab', { name: rankings.boards.class }).tap();
      await expect(
        dialog.getByText(pl.classMembership.noMembership),
      ).toBeVisible();
      await close(page);
      await settings(page);
      await parents.getByRole('button', { name: parent.removeProfile }).click();
      await expect(parents.getByText(parent.removeConfirmation)).toBeVisible();
      if (name === 'tablet') await takeScreenshot(page, 'tablet-usuwanie');
    });
  });
}

async function takeScreenshot(page: Page, name: string) {
  const path = process.env.UPDATE_RANKING_SCREENSHOTS
    ? `docs/screenshots/82-${name}.png`
    : test.info().outputPath(name + '.png');
  await page.screenshot({ path, animations: 'disabled', scale: 'css' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

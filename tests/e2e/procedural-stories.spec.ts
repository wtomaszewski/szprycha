import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { chooseCity } from './city-picker';
import { profile } from './helpers/profile';

test.use({
  timezoneId: 'Europe/Warsaw',
  reducedMotion: 'reduce',
  hasTouch: true,
});

async function rideWestAndBrake(page: Page, brakeAtX: number) {
  const canvas = page.locator('canvas');
  const stick = await page
    .locator('.touch-controls')
    .getByLabel(pl.driving.joystick)
    .boundingBox();
  expect(stick).not.toBeNull();
  const x = stick!.x + stick!.width / 2;
  const y = stick!.y + stick!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    // A small deflection rides slowly enough over the cobbles.
    await page.mouse.move(x - stick!.width * 0.065, y);
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-x')), {
        intervals: [50],
        timeout: 15_000,
      })
      .toBeLessThanOrEqual(brakeAtX);
    await page.keyboard.down('Space');
    await expect(canvas).toHaveAttribute('data-speed', '0');
  } finally {
    await page.mouse.up();
    await page.keyboard.up('Space');
  }
}

test('unlocks, resumes and completes a generated story in Free Ride', async ({
  page,
}, testInfo) => {
  test.setTimeout(85_000);
  const story = pl.procedural.stories;
  const parcel = story.templates.lostParcel;
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00+01:00'));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  // Keep the ride's opening focused on the client when introducing the chain.
  await profile(page, {
    nicknameSeed: 1,
    introduced: content.przepisy.przepisy.map(({ id }) => id),
  });
  await page.reload();
  await chooseCity(page, 'wroclaw');
  await page.keyboard.press('KeyM');

  const phone = page.getByRole('dialog', { name: pl.phone.title });
  const stories = phone.getByRole('list', { name: story.heading });
  const daily = phone.getByRole('list', { name: pl.procedural.heading });
  const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
  const skip = dialogue.getByRole('button', { name: pl.dialogueUi.skip });
  const result = page.getByRole('region', { name: pl.missionUi.result });
  const reopen = result.getByRole('button', { name: pl.phone.title });
  const choice = page.getByRole('dialog', { name: pl.missionUi.choice });

  async function finish(line: string) {
    await expect(dialogue.getByText(line, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await skip.click();
    await expect(
      result.getByText(pl.missionUi.completed, { exact: true }),
    ).toBeVisible();
  }

  async function rideToFinish(line: string, key = 'ArrowUp') {
    await page.keyboard.down(key);
    try {
      await expect(dialogue.getByText(line, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await page.keyboard.up(key);
    }
    await finish(line);
  }

  await expect(stories).toHaveText(story.locked);
  await daily
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.procedural.templates.pickup.title}`,
    })
    .click();
  await expect(canvas).toHaveAttribute('data-y', '1216');
  await skip.click();
  await rideToFinish(pl.procedural.dialogue.finish);
  await expect(result.getByText(story.unlocked, { exact: true })).toBeVisible();
  await reopen.click();

  const clientLine = stories.getByText(/ · \d+ lat · /);
  await expect(clientLine).toBeVisible();
  const client = (await clientLine.innerText()).split(' · ')[0]!;
  await expect(stories).toContainText(`${parcel.title} · Etap 1 z 3`);
  const screenshot = testInfo.outputPath('szprychaapp.png');
  await phone.screenshot({ path: screenshot });
  await testInfo.attach('SzprychaApp z odblokowanym wątkiem', {
    path: screenshot,
    contentType: 'image/png',
  });

  async function startStep(step: number) {
    const text = parcel.steps[step]!;
    await stories
      .getByRole('button', { name: `${pl.phone.start} · ${text.title}` })
      .click();
    await expect(canvas).toHaveAttribute(
      'data-mission',
      new RegExp(`^wroclaw-story-lostParcel-${step + 1}-`),
    );
    await expect(dialogue.getByText(client, { exact: true })).toBeVisible();
    await expect(dialogue.getByText(text.intro, { exact: true })).toBeVisible();
    await skip.click();
    return text;
  }

  const first = await startStep(0);
  await expect(canvas).toHaveAttribute('data-y', '3190');
  await rideToFinish(first.finish);
  await expect
    .poll(async () => (await profile(page)).stories.wroclaw?.step)
    .toBe(1);
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00+01:00'));
  await page.reload();
  await chooseCity(page, 'wroclaw');
  await page.keyboard.press('KeyM');
  await expect(stories).toContainText(`${parcel.title} · Etap 2 z 3`);

  const second = await startStep(1);
  await expect(canvas).toHaveAttribute('data-x', '3184');
  await rideWestAndBrake(page, 3044);
  const question = content.pytania.pytania.find(({ id }) => id === 'Q053')!;
  await expect(choice.getByText(question.pytanie)).toBeVisible();
  await choice
    .getByRole('button', { name: question.odpowiedzi[question.poprawna]! })
    .click();
  await choice.getByRole('button', { name: pl.progression.continue }).click();
  await finish(second.finish);
  await reopen.click();

  const third = await startStep(2);
  await expect(canvas).toHaveAttribute('data-y', '512');
  await rideToFinish(third.finish, 'ArrowDown');
  const sticker = 'story-lostParcel-wroclaw';
  await expect(
    result.getByText(
      story.reward.replace('{sticker}', pl.m5c.stickerNames[sticker]),
    ),
  ).toBeVisible();
  await expect
    .poll(async () => (await profile(page)).progression.tokens)
    .toBe(8);
  const saved = await profile(page);
  expect(saved.stories.wroclaw).toMatchObject({ finished: 1, step: 0 });
  expect(saved.stickers).toContain(sticker);
  expect(saved.completed).toEqual([]);

  await reopen.click();
  await expect(stories).toContainText(
    `${story.templates.neighbours.title} · Etap 1 z 4`,
  );
});

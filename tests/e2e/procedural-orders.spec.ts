import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import { chooseCity } from './city-picker';
import { profile } from './helpers/profile';

test.use({ timezoneId: 'Europe/Warsaw', reducedMotion: 'reduce' });

test('accepts and completes a daily pickup in Free Ride', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00+01:00'));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await profile(page, { nicknameSeed: 184, introduced: ['GDZIE-01'] });
  await page.reload();
  await chooseCity(page, 'warszawa');
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  const daily = phone.getByRole('list', { name: pl.procedural.heading });
  await expect(daily.getByRole('button')).toHaveCount(3);
  const pickup = daily.getByRole('listitem').filter({
    has: page.getByRole('heading', {
      name: pl.procedural.templates.pickup.title,
    }),
  });
  const clientProfile = pickup.getByText(/ · \d+ lat · /);
  await expect(clientProfile).toBeVisible();
  const client = (await clientProfile.innerText()).split(' · ')[0]!;
  await pickup.getByRole('button').click();
  await expect(canvas).toHaveAttribute(
    'data-mission',
    /^warszawa-daily-pickup-/,
  );
  await expect(canvas).toHaveAttribute('data-x', '3160');
  await expect(canvas).toHaveAttribute('data-y', '353');
  const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
  const portrait = dialogue.locator('.dialogue-portrait');
  await expect(dialogue.getByText(client, { exact: true })).toBeVisible();
  await expect(dialogue.locator('.dialogue-text')).toHaveText(
    /^Czy możesz odebrać dla mnie [^{}]+\?$/,
  );
  await expect(portrait).toHaveAttribute('data-emotion', 'neutral');
  await expect(portrait).toHaveCSS('width', '64px');
  await expect(portrait).toHaveCSS('height', '64px');
  const neutral = await portrait.evaluate(
    (element) => getComputedStyle(element).backgroundImage,
  );
  expect(neutral).toContain('data:image/png;base64,');
  await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect(
    page.getByText(pl.procedural.goals.ride, { exact: true }),
  ).toBeVisible();
  await page.keyboard.down('ArrowUp');
  const result = page.getByRole('region', { name: pl.missionUi.result });
  try {
    await expect(dialogue.getByText(pl.procedural.dialogue.finish)).toBeVisible(
      { timeout: 12_000 },
    );
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(dialogue.getByText(client, { exact: true })).toBeVisible();
  await expect(portrait).toHaveAttribute('data-emotion', 'happy');
  const happy = await portrait.evaluate(
    (element) => getComputedStyle(element).backgroundImage,
  );
  expect(happy).toContain('data:image/png;base64,');
  expect(happy).not.toBe(neutral);
  await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect(
    result.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();
  await expect(result).toContainText(pl.procedural.templates.pickup.title);
  await expect
    .poll(async () => (await profile(page)).missionPoints)
    .toBeGreaterThan(0);
  expect((await profile(page)).completed).toEqual([]);
  await result.getByRole('button', { name: pl.phone.title }).click();
  await expect(daily.getByRole('button')).toHaveCount(3);
});

test('unlocks daily offers only after completing that city’s campaign', async ({
  page,
}) => {
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  await expect(phone).toBeVisible();
  await expect(
    phone.getByRole('heading', { name: pl.procedural.heading }),
  ).toBeHidden();

  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  await profile(page, {
    completed: content.misje
      .filter(({ miasto, poboczna }) => miasto === 'warszawa' && !poboczna)
      .map(({ id }) => id),
  });
  await page.reload();
  await chooseCity(page, 'warszawa', 'campaign');
  await page.keyboard.press('KeyM');
  await expect(
    phone
      .getByRole('list', { name: pl.procedural.heading })
      .getByRole('button'),
  ).toHaveCount(3);
});

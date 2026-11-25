import { expect, test, type Page } from '@playwright/test';
import { chooseCity } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { seedProgress } from './helpers/profile';
import { campaignRoutes } from '../missions/warsaw-campaign-routes';
import { warsawRoutes, type Waypoint } from '../missions/warsaw-routes';

test.use({ baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block' });

const canvas = (page: Page) => page.locator('canvas');
const phone = (page: Page) =>
  page.getByRole('dialog', { name: pl.phone.title });
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const order = (page: Page, id: keyof typeof pl.misje) =>
  phone(page).getByRole('button', {
    name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
  });

const acts = Object.keys(campaignRoutes) as (keyof typeof campaignRoutes)[];
const completedAct1 = ['WAW-T-01', ...Object.keys(warsawRoutes)];

async function openPhone(page: Page) {
  await chooseCity(page, 'warszawa');
  await expect(canvas(page)).toHaveAttribute('data-map', 'warszawa');
  await page.keyboard.press('KeyM');
  await expect(phone(page)).toBeVisible();
}

test('keeps Warsaw acts 2 and 3 locked without campaign progress', async ({
  page,
}) => {
  await page.goto('/');
  await openPhone(page);
  for (const id of acts) await expect(order(page, id)).toHaveCount(0);
});

for (const [index, id] of acts.entries()) {
  test(`unlocks Warsaw order ${id} in sequence from saved campaign progress`, async ({
    page,
    baseURL,
  }) => {
    await seedProgress(page, baseURL, {
      completed: [...completedAct1, ...acts.slice(0, index)],
    });
    await page.goto('/');
    await openPhone(page);
    await expect(order(page, id)).toBeEnabled();
    for (const locked of acts.slice(index + 1))
      await expect(order(page, locked)).toHaveCount(0);
    await order(page, id).click();
    await expect(canvas(page)).toHaveAttribute('data-mission', id);
    await expect(dialogue(page)).toBeVisible();
  });
}

test('corrects an unsafe first-aid choice and unlocks the convoy after reload', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(65_000);
  const id = 'WAW-A3-04';
  await page.addInitScript(
    (points: Waypoint[]) => {
      let index = 0;
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => {
          const data = document.querySelector('canvas')?.dataset;
          const point =
            data?.mission === 'WAW-A3-04' &&
            !document.querySelector('dialog[open]')
              ? points[index]
              : undefined;
          const dx = (point?.x ?? 0) - Number(data?.x ?? 0);
          const dy = (point?.y ?? 0) - Number(data?.y ?? 0);
          const distance = Math.hypot(dx, dy);
          const toggle =
            point?.walking !== undefined &&
            String(point.walking) !== data?.walking;
          const brake = Boolean(point && (toggle || distance < 12));
          if (brake && !toggle && data?.speed === '0') index++;
          const strength =
            data?.walking === 'true'
              ? 1
              : Math.max(0.22, Math.min(1, distance / 130));
          return [
            {
              connected: true,
              axes:
                !point || brake
                  ? [0, 0]
                  : [(dx / distance) * strength, (dy / distance) * strength],
              buttons: Array.from({ length: 17 }, (_, i) => ({
                pressed:
                  (i === 0 && toggle && data?.speed === '0') ||
                  (i === 1 && brake),
              })),
            },
          ];
        },
      });
    },
    campaignRoutes[id].filter(({ answer }) => answer === undefined),
  );
  await seedProgress(page, baseURL, {
    completed: [...completedAct1, ...acts.slice(0, acts.indexOf(id))],
  });
  await page.goto('/');
  await openPhone(page);
  await expect(order(page, 'WAW-A3-05')).toHaveCount(0);
  await order(page, id).click();
  await dialogue(page)
    .getByRole('button', { name: pl.dialogueUi.skip })
    .click();

  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  const choices = page.getByRole('dialog', { name: pl.missionUi.choice });
  const choose = async (answer: string, feedback: string) => {
    await choices.getByRole('button', { name: answer, exact: true }).click();
    await expect(choices.getByRole('status')).toHaveText(feedback);
    await choices
      .getByRole('button', { name: pl.progression.continue })
      .click();
  };
  const story = pl.misje[id];
  await expect(choices).toContainText(story.cel2Pytanie, { timeout: 30_000 });
  await page.screenshot({ path: 'test-results/m6b-pierwsza-pomoc.png' });
  await choose(story.cel2Odp1, story.cel2Feedback);
  await expect(choices).toContainText(story.cel2Pytanie);
  await choose(story.cel2Odp2, story.cel2Feedback);
  await choose(story.cel3Odp3, story.cel3Feedback);
  await choose(story.cel4Odp1, story.cel4Feedback);
  await choose(story.cel5Odp2, story.cel5Feedback);
  await expect(dialogue(page)).toContainText(pl.dialogi[id].koniec_tekst);
  await dialogue(page)
    .getByRole('button', { name: pl.dialogueUi.skip })
    .click();
  await expect(
    page.getByRole('region', { name: pl.missionUi.result }),
  ).toContainText(`${pl.missionUi.penalties} −150`);

  await page.reload();
  await openPhone(page);
  await expect(order(page, 'WAW-A3-05')).toBeEnabled();
  await expect(order(page, 'WAW-A3-06')).toHaveCount(0);
});

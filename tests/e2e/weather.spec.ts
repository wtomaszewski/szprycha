import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';
import { chooseCity } from './city-picker';

const night = 'WRO-B-01';
const downpour = 'WRO-A3-03';
const courses = [
  {
    id: night,
    prerequisite: 'WRO-A1-05',
    weather: 'clear',
    lighting: 'night',
    points: [
      [4930, 670, true],
      [5300, 670, true],
      [5300, 585, true],
      [5300, 224, false],
      [5016, 224, false],
      [5016, 172, false],
    ],
  },
  {
    id: downpour,
    prerequisite: 'WRO-A3-02',
    weather: 'rain_heavy',
    lighting: 'day',
    points: [
      [3664, 1540],
      [2624, 1536],
      [2128, 1536],
    ],
  },
] as const;

for (const { id, prerequisite, weather, lighting, points } of courses) {
  test(`completes ${id} with the mission lighting and weather`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.addInitScript(
      ({ mission, points }) => {
        let index = 0;
        Object.defineProperty(navigator, 'getGamepads', {
          value: () => {
            const data = document.querySelector('canvas')?.dataset;
            const point =
              data?.mission === mission &&
              !document.querySelector('dialog[open]') &&
              document.documentElement.hasAttribute('data-drive-test')
                ? points[index]
                : undefined;
            const dx = (point?.[0] ?? 0) - Number(data?.x ?? 0);
            const dy = (point?.[1] ?? 0) - Number(data?.y ?? 0);
            const distance = Math.hypot(dx, dy);
            const mount =
              point?.[2] !== undefined && String(point[2]) !== data?.walking;
            const stopped = data?.speed === '0';
            const brake = Boolean(point && (mount || distance < 11));
            if (brake && stopped && !mount) index++;
            const strength =
              data?.walking === 'true'
                ? 1
                : Math.min(1, Math.max(0.22, distance / 130));
            return [
              {
                connected: true,
                axes:
                  !point || brake
                    ? [0, 0]
                    : [(dx / distance) * strength, (dy / distance) * strength],
                buttons: Array.from({ length: 17 }, (_, i) => ({
                  pressed: (i === 0 && mount && stopped) || (i === 7 && brake),
                })),
              },
            ];
          },
        });
      },
      { mission: id, points },
    );
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
    await page.evaluate(
      ({ database, store, key, prerequisite }) =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open(database);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction(store, 'readwrite');
            const records = transaction.objectStore(store);
            const read = records.get(key);
            read.onsuccess = () => {
              const profile: ProgressProfile = read.result;
              profile.completed = [prerequisite];
              profile.reflectiveVest = true;
              records.put(profile, key);
            };
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onabort = () => reject(transaction.error);
          };
        }),
      {
        database: progressDatabase,
        store: progressStoreName,
        key: progressRecordKey,
        prerequisite,
      },
    );
    await page.reload();
    await chooseCity(page, 'wroclaw');
    await page.keyboard.press('KeyM');
    await page
      .getByRole('dialog', { name: pl.phone.title })
      .getByRole('button', {
        name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
      })
      .click();
    const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
    await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
    await expect(canvas).toHaveAttribute('data-mission', id);
    await expect(canvas).toHaveAttribute('data-lighting', lighting);
    await expect(canvas).toHaveAttribute('data-weather', weather);
    if (weather === 'rain_heavy')
      await expect(
        page.getByRole('img', { name: pl.rideHud.weather.rain_heavy }),
      ).toBeVisible();
    await page.keyboard.press('KeyL');
    await expect(
      page.getByRole('img', { name: pl.rideHud.lightsOn }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    const simple = page.getByRole('button', {
      name: pl.driving.classic,
      exact: true,
    });
    if (await simple.isVisible()) await simple.click();
    await page.getByRole('button', { name: pl.driving.resume }).click();
    await page.screenshot({ path: test.info().outputPath(`${id}.png`) });
    await page
      .locator('html')
      .evaluate((html) => html.setAttribute('data-drive-test', ''));

    await expect(dialogue).toContainText(pl.dialogi[id].koniec_tekst, {
      timeout: 90_000,
    });
    await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
    const result = page.getByRole('region', { name: pl.missionUi.result });
    await expect(result).toContainText(pl.missionUi.completed);
    await expect(result).not.toContainText(pl.missionUi.penalties);
    if (id === night)
      await expect(result).toContainText(`${pl.missionUi.goodHabits} 2`);
  });
}

test('persists the reduced effects setting from the accessibility panel', async ({
  page,
}) => {
  await page.goto('/');
  const settings = page.getByRole('button', {
    name: pl.settings.title,
    exact: true,
  });
  const preference = page.getByRole('checkbox', {
    name: pl.settings.reducedEffects,
  });
  await settings.click();
  await expect(preference).not.toBeChecked();
  await preference.check();
  await expect(preference).toBeChecked();
  await page.reload();
  await settings.click();
  await expect(preference).toBeChecked();
});

import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import type { GameContent } from '../../src/content/schemas';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';

test('completes a generated daily challenge by turning on lights before a dusk ride', async ({
  page,
}) => {
  await page.goto('/');
  const menu = page.locator('canvas[data-scene="MainMenu"]');
  await expect(menu).toBeVisible();
  const daily = page.getByRole('button', { name: pl.m5c.daily, exact: true });
  await daily.click();
  await expect(page.getByText(pl.m5c.dailyLocked)).toBeVisible();
  await page.getByRole('button', { name: pl.m5c.close, exact: true }).click();
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  // Start at Kurier with M06 as the weakest playable module and no daily progress.
  const keys = [
    progressDatabase,
    progressStoreName,
    progressRecordKey,
  ] as const;
  await page.evaluate(
    async ({ keys: [database, store, key], rules }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, 'readwrite');
          const records = tx.objectStore(store);
          const read = records.get(key);
          read.onsuccess = () => {
            const profile: ProgressProfile = read.result;
            profile.completed = ['WAW-T-01'];
            profile.missionPoints = 4000;
            for (const { id, modul } of rules)
              if (modul !== 'M06')
                profile.mastery[id] = { value: 100, goodToday: 0 };
            records.put(profile, key);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
      });
    },
    { keys, rules: content.przepisy.przepisy },
  );

  await page.reload();
  await daily.click();
  const challenge = content.wyzwania.wyzwania.find(
    ({ good }) => good === 'MSC-04',
  )!;
  const panel = page.getByRole('dialog', { name: pl.m5c.daily });
  const goal = panel.getByRole('listitem').filter({ hasText: challenge.opis });
  await expect(panel.getByRole('progressbar')).toHaveCount(3);
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '0');
  await panel.getByRole('button', { name: pl.m5c.close }).click();

  await page.getByRole('button', { name: pl.driving.praga }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'City');
  await page.keyboard.press('KeyM');
  await page
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['WAW-T-02'].tytul}`,
    })
    .click();
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.getByRole('button', { name: pl.missionUi.turnOnLights }).click();
  await expect(page.getByText(pl.misje['WAW-T-02'].cel2)).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('dialog', { name: pl.driving.paused })
    .getByRole('button', { name: pl.driving.menu, exact: true })
    .click();
  await expect(menu).toBeVisible();

  await page.reload();
  await daily.click();
  await expect(goal.getByText(pl.m5c.done)).toBeVisible();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '1');
  await expect(
    panel.getByText(pl.m5c.stickerNames.odblask, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/m5c-wyzwania.png' });
});

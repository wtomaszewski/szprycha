import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { readProfile } from './progress-profile';
import { legacyProgressKey } from '../../src/core/progressStore';
import questions from '../../content/pytania.json' with { type: 'json' };

const training = ['POZ-B-01', 'POZ-B-02', 'POZ-B-03', 'POZ-B-04'] as const;

async function seedCompleted(page: Page, completed: readonly string[]) {
  await page.addInitScript(
    ({ key, completed }) => {
      if (!sessionStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ completed }));
        sessionStorage.setItem(key, '1');
      }
    },
    { key: legacyProgressKey, completed },
  );
}

// The screenshots load alternate player spawns through Playwright routing.
test.use({ serviceWorkers: 'block' });

test('opens Poznań in free ride, remembers the city, and starts its training', async ({
  page,
}, info) => {
  test.setTimeout(45_000);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  const pin = cityPin(page, 'poznan');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('137-mapa-polski.png') });
  await pin.click();
  await expect(canvas).toHaveAttribute('data-map', 'poznan', {
    timeout: 25_000,
  });
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  for (const id of training)
    await expect(phone).toContainText(pl.misje[id].tytul);
  await phone
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['POZ-B-02'].tytul}`,
    })
    .click();
  await expect(canvas).toHaveAttribute('data-mission', 'POZ-B-02');

  await page.reload();
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await expect(pin).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'poznan', {
    timeout: 25_000,
  });
  await expect(canvas).not.toHaveAttribute('data-mission', /.+/);
});

const views = [
  ['rynek', 1742, 667, -Math.PI / 2],
  ['ostrow', 1770, 1976, -Math.PI / 2],
  ['browar', 3160, 1514, -Math.PI / 2],
  ['bulwar', 1662, 1670, 0],
  ['tramwaj', 2520, 683, -Math.PI / 2],
  ['sluza', 2268, 1119, 0],
] as const;

for (const [name, x, y, heading] of views)
  test(`renders Poznań — ${name}`, async ({ page }, info) => {
    if (name === 'rynek') test.setTimeout(45_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startAt(page, 'poznan', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'poznan');
    const canvas = page.locator('canvas[data-map="poznan"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (name === 'tramwaj') await page.waitForTimeout(7800);
    if (name === 'rynek') {
      await expect(canvas).toHaveAttribute('data-town-hall', 'before-noon');
      await page.screenshot({
        path: info.outputPath('137-przed-poludniem.png'),
      });
      await expect(canvas).toHaveAttribute('data-town-hall', 'noon', {
        timeout: 22_000,
      });
      await page.waitForTimeout(450);
    }
    const path = info.outputPath(`137-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

test('opens the Poznań campaign at its first training and remembers the choice', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'poznan');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('138-kampania.png') });
  await pin.press('Enter');
  await expect(page.locator('canvas[data-map="poznan"]')).toHaveAttribute(
    'data-mission',
    'POZ-B-01',
    { timeout: 12_000 },
  );
  await expect
    .poll(async () => (await readProfile(page)).selectedCity)
    .toBe('poznan');
  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(pin).toBeFocused();
});

test('resumes after free-ride training and saves a wooden collectible after its riddle', async ({
  page,
}, info) => {
  await seedCompleted(page, [...training, 'POZ-A1-01']);
  await page.goto('/');
  await chooseCity(page, 'poznan', 'campaign');
  const canvas = page.locator('canvas[data-map="poznan"]');
  await expect(canvas).toHaveAttribute('data-mission', 'POZ-A1-02');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  const count = page.getByRole('status', { name: pl.driving.rogale });
  await expect(count).toHaveText(`${pl.driving.rogale} 0/4`);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.screenshot({ path: info.outputPath('138-rogale.png') });
  const puzzle = page.getByRole('dialog', { name: pl.driving.rogalQuestion });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(puzzle).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const question = questions.pytania.find(({ id }) => id === 'Q014')!;
  await expect(puzzle).toContainText(question.pytanie);
  await page.screenshot({ path: info.outputPath('138-zagadka.png') });
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(count).toHaveText(`${pl.driving.rogale} 1/4`);
  await expect
    .poll(async () => (await readProfile(page)).rogale)
    .toEqual(['poz-rogal-ratusz']);

  await page.reload();
  await chooseCity(page, 'poznan', 'campaign');
  await expect(canvas).toHaveAttribute('data-mission', 'POZ-A1-02');
  await expect(count).toHaveText(`${pl.driving.rogale} 1/4`);
});

test('reaches the first-aid scene after preparing for dusk and crossing the bridge', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await seedCompleted(page, [
    ...training,
    'POZ-A1-01',
    'POZ-A1-02',
    'POZ-A2-01',
    'POZ-A2-02',
  ]);
  await page.goto('/');
  await chooseCity(page, 'poznan', 'campaign');
  const canvas = page.locator('canvas[data-map="poznan"]');
  await expect(canvas).toHaveAttribute('data-mission', 'POZ-A3-01');
  await expect(canvas).toHaveAttribute('data-lighting', 'night');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await page
    .getByRole('button', { name: pl.missionUi.turnOnLights, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowRight', 'x', 1707, true);
  const first = pl.misje['POZ-B-04'];
  const next = pl.misje['POZ-A3-01'];
  await driveTo(page, 'ArrowDown', 'y', 2072, true);
  await expect(page.getByText(first.pytanie, { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('138-pierwsza-pomoc.png') });
  await page.getByRole('button', { name: first.odp2, exact: true }).click();
  await page.getByRole('button', { name: pl.progression.continue }).click();
  await expect(page.getByText(next.pytanie, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: next.odp1, exact: true }).click();
  await page.getByRole('button', { name: pl.progression.continue }).click();
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('POZ-A3-01');
});

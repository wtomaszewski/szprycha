import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { readProfile } from './progress-profile';
import { legacyProgressKey } from '../../src/core/progressStore';
import questions from '../../content/pytania.json' with { type: 'json' };

const night = pl.misje['WIE-B-03'];
const training = ['WIE-B-01', 'WIE-B-02', 'WIE-B-03', 'WIE-B-04'] as const;

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

async function openExercise(page: Page, id: keyof typeof pl.misje) {
  await page.keyboard.press('KeyM');
  await page
    .getByRole('button', { name: `${pl.phone.start} · ${pl.misje[id].tytul}` })
    .click();
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('data-mission', id);
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  return canvas;
}

test('offers Wieś i las in free ride and persists the map independently of campaign', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(cityPin(page, 'wies')).toBeEnabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'wies');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('127-mapa-polski.png') });
  await pin.click();
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.wiesTitle, {
    timeout: 12_000,
  });
  await expect(canvas).not.toHaveAttribute('data-mission', /./);
  await expect
    .poll(async () => (await readProfile(page)).freeRideCity)
    .toBe('wies');
  expect((await readProfile(page)).selectedCity).not.toBe('wies');
  await page.keyboard.press('KeyM');
  for (const id of training)
    await expect(
      page.getByRole('button', {
        name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
      }),
    ).toBeVisible();

  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  await expect(pin).toBeFocused();
});

test('practises helmet and lights at night', async ({ page }, info) => {
  await page.goto('/');
  await chooseCity(page, 'wies');
  const canvas = await openExercise(page, 'WIE-B-03');
  await expect(canvas).toHaveAttribute('data-lighting', 'night');
  await expect(page.getByText(night.lampki, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await expect(page.getByText(night.lampki, { exact: true })).toBeVisible();
  await page.keyboard.press('KeyL');
  await expect(page.getByText(night.meta, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByText(pl.settings.accessibility, { exact: true }).click();
  await page
    .getByRole('checkbox', { name: pl.settings.reflectiveVest })
    .check();
  await page.keyboard.press('Escape');
  await expect
    .poll(async () => (await readProfile(page)).reflectiveVest)
    .toBe(true);
  await page.screenshot({ path: info.outputPath('127-noc.png') });
});

test('completes the passive rail exercise after stopping and checking for trains', async ({
  page,
}) => {
  const lesson = pl.misje['WIE-B-02'];
  await page.goto('/');
  await chooseCity(page, 'wies');
  await openExercise(page, 'WIE-B-02');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await driveTo(page, 'ArrowUp', 'y', 1322, false);
  const answer = page.getByRole('button', { name: lesson.odp2, exact: true });
  await expect(answer).toBeVisible();
  await answer.click();
  await page
    .getByRole('button', { name: pl.progression.continue, exact: true })
    .click();
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByRole('dialog', { name: pl.missionUi.completed, exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('WIE-B-02');
});

const views = [
  ['gminna', 1198, 440, -Math.PI / 2, 8750],
  ['przystanek', 635, 530, -Math.PI / 2, 7500],
  ['kolej', 1150, 1296, -Math.PI / 2, 0],
  ['gospodarstwo', 718, 2240, Math.PI, 0],
  ['mostek', 1110, 1634, -Math.PI / 2, 0],
  ['ciagnik', 3898, 622, Math.PI, 6200],
] as const;

for (const [name, x, y, heading, time] of views) {
  test(`renders Wieś i las — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (time) await page.clock.install();
    // Start the rail view midway through the train's 20–27 s passage.
    const railOffset =
      name === 'kolej'
        ? { crossing: 'przejazd-gminny', seconds: 23.5 }
        : undefined;
    await startAt(page, 'wies', x, y, heading, railOffset);
    await page.goto('/');
    await chooseCity(page, 'wies');
    const canvas = page.locator('canvas[data-map="wies"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (time) await page.clock.runFor(time);
    await expect(canvas).toBeVisible();
    const path = info.outputPath(`127-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });
}

test('starts the Wieś i las campaign at the first training mission', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'wies');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('128-kampania.png') });
  await pin.press('Enter');
  await expect(page.locator('canvas[data-map="wies"]')).toHaveAttribute(
    'data-mission',
    'WIE-B-01',
    { timeout: 12_000 },
  );
  await expect
    .poll(async () => (await readProfile(page)).selectedCity)
    .toBe('wies');
});

test('resumes the campaign, saves a pine cone after its riddle and keeps it after reload', async ({
  page,
}, info) => {
  await seedCompleted(page, [...training, 'WIE-A1-01']);
  await page.goto('/');
  await chooseCity(page, 'wies', 'campaign');
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('data-mission', 'WIE-A1-02');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  const count = page.getByRole('status', { name: pl.driving.szyszki });
  await expect(count).toHaveText('Szyszki 0/4');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.screenshot({ path: info.outputPath('128-szyszki.png') });
  const puzzle = page.getByRole('dialog', { name: pl.driving.szyszkaQuestion });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(puzzle).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const question = questions.pytania.find(({ id }) => id === 'Q063')!;
  await expect(puzzle).toContainText(question.pytanie);
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(count).toHaveText('Szyszki 1/4');
  await expect
    .poll(async () => (await readProfile(page)).szyszki)
    .toEqual(['wie-szyszka-bramka']);

  await page.reload();
  await chooseCity(page, 'wies', 'campaign');
  await expect(canvas).toHaveAttribute('data-mission', 'WIE-A1-02');
  await expect(count).toHaveText('Szyszki 1/4');
});

test('requires the vest in the dusk exercise alongside both lamps and a helmet', async ({
  page,
}, info) => {
  await seedCompleted(page, [
    ...training,
    'WIE-A1-01',
    'WIE-A1-02',
    'WIE-A2-01',
  ]);
  await page.goto('/');
  await chooseCity(page, 'wies', 'campaign');
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('data-mission', 'WIE-A2-02');
  await expect(canvas).toHaveAttribute('data-lighting', 'night');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await page
    .getByRole('button', { name: pl.missionUi.turnOnLights, exact: true })
    .click();
  const vest = page.getByRole('button', {
    name: pl.missionUi.equipVest,
    exact: true,
  });
  await expect(vest).toBeVisible();
  await page.screenshot({ path: info.outputPath('128-kamizelka.png') });
  await vest.click();
  await expect(
    page.getByText(pl.misje['WIE-A2-02'].meta, { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readProfile(page)).reflectiveVest)
    .toBe(true);
});

test('practises helping a fallen cyclist beside the dirt road', async ({
  page,
}, info) => {
  await seedCompleted(page, [
    ...training,
    'WIE-A1-01',
    'WIE-A1-02',
    'WIE-A2-01',
    'WIE-A2-02',
  ]);
  await page.goto('/');
  await chooseCity(page, 'wies', 'campaign');
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('data-mission', 'WIE-A3-01');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 653, true);
  const aid = pl.misje['WIE-A3-01'];
  await expect(page.getByText(aid.pytanie, { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('128-pierwsza-pomoc.png') });
  await page.getByRole('button', { name: aid.odp2, exact: true }).click();
  await page.getByRole('button', { name: pl.progression.continue }).click();
  await expect(page.getByText(aid.dalej, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: aid.dalej1, exact: true }).click();
  await page.getByRole('button', { name: pl.progression.continue }).click();
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('WIE-A3-01');
});

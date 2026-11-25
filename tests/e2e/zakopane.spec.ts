import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { legacyProgressKey } from '../../src/core/progressStore';
import type { GameContent } from '../../src/content/schemas';
import { readProfile } from './progress-profile';
import { profile } from './helpers/profile';
import questions from '../../content/pytania.json' with { type: 'json' };

const trainings = [
  'ZAK-B-01',
  'ZAK-B-02',
  'ZAK-B-03',
  'ZAK-B-04',
  'ZAK-B-05',
] as const;

async function openCampaignAt(page: Page, completed: string[]) {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await profile(page, { completed, freeRideCity: 'zakopane' });
  await page.reload();
  await chooseCity(page, 'zakopane', 'campaign');
}

test.use({ serviceWorkers: 'block' });

async function startTraining(page: Page, id: (typeof trainings)[number]) {
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  for (const training of trainings)
    await expect(phone).toContainText(pl.misje[training].tytul);
  await phone
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
    })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute('data-mission', id);
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
}

test('opens Zakopane from Poland, renders Krupówki and remembers the free-ride city', async ({
  page,
}, info) => {
  test.setTimeout(50_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  const pin = cityPin(page, 'zakopane');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('141-mapa-polski.png') });
  await pin.click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-map', 'zakopane', {
    timeout: 20_000,
  });
  await page.screenshot({ path: info.outputPath('141-krupowki.png') });
  await expect
    .poll(async () => (await readProfile(page)).freeRideCity)
    .toBe('zakopane');
  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(pin).toBeEnabled();
  await page.getByRole('button', { name: pl.cityPicker.back }).click();
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'zakopane', {
    timeout: 20_000,
  });
  expect(errors).toEqual([]);
});

test('blocks motion until the rider prepares for fog and rejects a fast descent', async ({
  page,
}, info) => {
  const id = 'ZAK-B-03';
  // Load the fog training directly, without loading the free-ride scene first.
  await page.addInitScript(
    ({ key, completed }) =>
      localStorage.setItem(key, JSON.stringify({ completed })),
    { key: legacyProgressKey, completed: trainings.slice(0, 2) },
  );
  await page.goto('http://127.0.0.1:4174/');
  await chooseCity(page, 'zakopane', 'campaign');
  const canvas = page.locator('canvas[data-map="zakopane"]');
  await expect(canvas).toHaveAttribute('data-mission', id);
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect(canvas).toHaveAttribute('data-weather', 'fog');
  const equip = page.getByRole('button', {
    name: pl.missionUi.equip,
    exact: true,
  });
  const lights = page.getByRole('button', {
    name: pl.missionUi.turnOnLights,
    exact: true,
  });
  await expect(equip).toBeVisible();
  await expect(lights).toBeVisible();
  await expect(canvas).toHaveAttribute('data-y', '1832');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('KeyC');
  try {
    // The HUD confirms that the scene has processed input during preparation.
    await expect(canvas).toHaveAttribute('data-actions', /"looking":true/);
    await expect(canvas).toHaveAttribute('data-y', '1832');
    await expect(canvas).toHaveAttribute('data-speed', '0');
  } finally {
    await page.keyboard.up('KeyC');
    await page.keyboard.up('ArrowUp');
  }
  await equip.click();
  await lights.click();
  await expect(lights).toBeHidden();
  await expect(
    page.getByText(pl.misje[id].meta, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('141-mgla.png') });
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  const safeSpeed = content.przepisy.przepisy.find(
    ({ id }) => id === 'MAN-08',
  )!;
  const failure = page.getByRole('dialog', {
    name: pl.missionFailure.title,
    exact: true,
  });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(failure).toBeVisible({ timeout: 12_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(failure).toContainText(
    `${pl.missionFailure.reasons.dowolny_blad} · ${safeSpeed.tytul}`,
  );
  expect((await readProfile(page)).completed).not.toContain(id);
});

test('reaches the shoulder stop and finishes without points for speed', async ({
  page,
}, info) => {
  await page.goto('/');
  await chooseCity(page, 'zakopane');
  await startTraining(page, 'ZAK-B-02');
  const training = pl.misje['ZAK-B-02'];
  await page.screenshot({ path: info.outputPath('141-pobocze.png') });
  await driveTo(page, 'ArrowUp', 'y', 3417, false);
  await expect(page.getByText(training.pytanie, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: training.odp1, exact: true }).click();
  await page.getByRole('button', { name: pl.progression.continue }).click();
  await expect(page.getByText(training.meta, { exact: true })).toBeVisible();
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByRole('dialog', { name: pl.missionUi.completed, exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(
    page.getByText(pl.missionResults.timeBonus, { exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('ZAK-B-02');
});

test('renders both wooden bridge approaches over the stream', async ({
  page,
}, info) => {
  await startAt(page, 'zakopane', 1936, 1754, Math.PI / 2);
  await page.goto('/');
  await chooseCity(page, 'zakopane');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-x', '1936');
  await expect(canvas).toHaveAttribute('data-y', '1754');
  await page.screenshot({ path: info.outputPath('141-mostki.png') });
});

test('opens the campaign at its first training and remembers the selection', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'zakopane');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('142-kampania.png') });
  await pin.press('Enter');
  await expect(page.locator('canvas[data-map="zakopane"]')).toHaveAttribute(
    'data-mission',
    trainings[0],
  );
  await expect
    .poll(async () => (await readProfile(page)).selectedCity)
    .toBe('zakopane');
});

test('reuses completed training and restores the wooden spruce after its riddle', async ({
  page,
}, info) => {
  test.setTimeout(50_000);
  await openCampaignAt(page, [...trainings, 'ZAK-A1-01']);
  const canvas = page.locator('canvas[data-map="zakopane"]');
  await expect(canvas).toHaveAttribute('data-mission', 'ZAK-A1-02');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  const count = page.getByRole('status', { name: pl.driving.swierki });
  await expect(count).toHaveText(`${pl.driving.swierki} 0/4`);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.screenshot({ path: info.outputPath('142-swierki.png') });

  const puzzle = page.getByRole('dialog', { name: pl.driving.swierkQuestion });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(puzzle).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const question = questions.pytania.find(({ id }) => id === 'Q057')!;
  await expect(puzzle).toContainText(question.pytanie);
  await page.screenshot({ path: info.outputPath('142-zagadka.png') });
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(count).toHaveText(`${pl.driving.swierki} 1/4`);
  await expect
    .poll(async () => (await readProfile(page)).swierki)
    .toEqual(['zak-swierk-stojak']);

  await page.reload();
  await chooseCity(page, 'zakopane', 'campaign');
  await expect(canvas).toHaveAttribute('data-mission', 'ZAK-A1-02');
  await expect(count).toHaveText(`${pl.driving.swierki} 1/4`);
});

test('rejects speeding on the campaign descent after equipping both lights', async ({
  page,
}, info) => {
  test.setTimeout(50_000);
  await openCampaignAt(page, [
    ...trainings,
    'ZAK-A1-01',
    'ZAK-A1-02',
    'ZAK-A2-01',
  ]);
  const canvas = page.locator('canvas[data-map="zakopane"]');
  await expect(canvas).toHaveAttribute('data-mission', 'ZAK-A2-02');
  await expect(canvas).toHaveAttribute('data-weather', 'fog');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.getByRole('button', { name: pl.missionUi.turnOnLights }).click();
  await expect(
    page.getByText(pl.misje['ZAK-B-03'].meta, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('142-zjazd.png') });

  const failure = page.getByRole('dialog', {
    name: pl.missionFailure.title,
    exact: true,
  });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(failure).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(failure).toContainText(pl.missionFailure.reasons.dowolny_blad);
  expect((await readProfile(page)).completed).not.toContain('ZAK-A2-02');
});

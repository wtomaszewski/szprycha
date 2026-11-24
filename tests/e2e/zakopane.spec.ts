import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { readProfile } from './progress-profile';

const trainings = [
  'ZAK-B-01',
  'ZAK-B-02',
  'ZAK-B-03',
  'ZAK-B-04',
  'ZAK-B-05',
] as const;

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
  await expect(pin).toHaveCount(0);
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
  await page.goto('/');
  await chooseCity(page, 'zakopane');
  await startTraining(page, 'ZAK-B-03');
  const canvas = page.locator('canvas');
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
  await page.keyboard.down('ArrowUp');
  try {
    await expect.poll(async () => canvas.getAttribute('data-y')).toBe('1832');
    await page.waitForTimeout(400); // Hold the pedal across simulation ticks.
    await expect(canvas).toHaveAttribute('data-y', '1832');
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await equip.click();
  await lights.click();
  await expect(lights).toBeHidden();
  await expect(
    page.getByText(pl.misje['ZAK-B-03'].meta, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('141-mgla.png') });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByRole('dialog', { name: pl.missionFailure.title, exact: true }),
    ).toBeVisible({ timeout: 12_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  expect((await readProfile(page)).completed).not.toContain('ZAK-B-03');
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

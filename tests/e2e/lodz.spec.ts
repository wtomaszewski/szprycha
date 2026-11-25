import { expect, test, type Page } from '@playwright/test';
import questions from '../../content/pytania.json' with { type: 'json' };
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { profile } from './helpers/profile';

const training = ['LOD-B-01', 'LOD-B-02', 'LOD-B-03', 'LOD-B-04'] as const;
const skipDialogue = (page: Page) =>
  page.getByRole('button', { name: pl.dialogueUi.skip }).click();

async function seedCompleted(page: Page, completed: string[]) {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await profile(page, { completed, reducedEffects: true });
  await page.reload();
}

test.use({ serviceWorkers: 'block' });

test('opens Łódź for free ride, remembers it and offers its four exercises', async ({
  page,
}, info) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  const freeRide = page.getByRole('button', {
    name: pl.cityPicker.freeRide,
    exact: true,
  });
  await freeRide.click();
  const pin = cityPin(page, 'lodz');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('139-mapa-polski.png') });
  await pin.click();
  await expect(canvas).toHaveAttribute('data-map', 'lodz', { timeout: 15_000 });
  await page.keyboard.press('KeyM');
  const phone = page.getByRole('dialog', { name: pl.phone.title });
  for (const id of training)
    await expect(phone).toContainText(pl.misje[id].tytul);
  await phone
    .getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje['LOD-B-02'].tytul}`,
    })
    .click();
  await expect(canvas).toHaveAttribute('data-mission', 'LOD-B-02');

  await page.reload();
  await freeRide.click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-map', 'lodz', { timeout: 15_000 });
  await expect(canvas).not.toHaveAttribute('data-mission', /.+/);
});

test('opens Łódź in campaign at its first exercise and remembers the choice', async ({
  page,
}, info) => {
  await page.goto('/');
  const campaign = page.getByRole('button', {
    name: pl.cityPicker.campaign,
    exact: true,
  });
  await campaign.click();
  const pin = cityPin(page, 'lodz');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('140-kampania.png') });
  await pin.click();
  await expect(page.locator('canvas[data-map="lodz"]')).toHaveAttribute(
    'data-mission',
    'LOD-B-01',
    { timeout: 15_000 },
  );
  await expect
    .poll(async () => (await profile(page)).selectedCity)
    .toBe('lodz');
  await page.reload();
  await campaign.click();
  await expect(pin).toBeFocused();
});

test('resumes after training and saves a spool after its riddle', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await seedCompleted(page, [...training, 'LOD-A1-01']);
  await chooseCity(page, 'lodz', 'campaign');
  const canvas = page.locator('canvas[data-map="lodz"]');
  await expect(canvas).toHaveAttribute('data-mission', 'LOD-A1-02');
  await skipDialogue(page);
  const counter = page.getByRole('status', { name: pl.driving.szpulki });
  await expect(counter).toHaveText(`${pl.driving.szpulki} 0/4`);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.screenshot({ path: info.outputPath('140-szpulki.png') });
  const puzzle = page.getByRole('dialog', { name: pl.driving.szpulkaQuestion });
  await page.keyboard.down('ArrowUp');
  try {
    await expect(puzzle).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const question = questions.pytania.find(({ id }) => id === 'Q014')!;
  await expect(puzzle).toContainText(question.pytanie);
  await page.screenshot({ path: info.outputPath('140-zagadka.png') });
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(counter).toHaveText(`${pl.driving.szpulki} 1/4`);
  await expect
    .poll(async () => (await profile(page)).szpulki)
    .toEqual(['lod-szpulka-arkady']);

  await page.reload();
  await chooseCity(page, 'lodz', 'campaign');
  await expect(canvas).toHaveAttribute('data-mission', 'LOD-A1-02');
  await expect(counter).toHaveText(`${pl.driving.szpulki} 1/4`);
});

test('practises first aid and restores guidance to the finale after a reload', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await seedCompleted(page, [
    ...training,
    'LOD-A1-01',
    'LOD-A1-02',
    'LOD-A1-03',
    'LOD-A2-01',
    'LOD-A2-02',
  ]);
  await chooseCity(page, 'lodz', 'campaign');
  const canvas = page.locator('canvas[data-map="lodz"]');
  await expect(canvas).toHaveAttribute('data-mission', 'LOD-A3-01');
  await skipDialogue(page);
  const mission = pl.misje['LOD-A3-01'];
  await page.keyboard.press('KeyX');
  await driveTo(page, 'ArrowUp', 'x', 3405, true);
  await expect(
    page.getByText(mission.pytanie_bezpieczenstwo, { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('140-pierwsza-pomoc.png') });
  for (const answer of [
    mission.bezpieczenstwo_odp2,
    mission.dorosly_odp1,
    mission.telefon_odp2,
  ]) {
    await page.getByRole('button', { name: answer, exact: true }).click();
    await page.getByRole('button', { name: pl.progression.continue }).click();
  }
  await skipDialogue(page);
  const results = page.getByRole('region', { name: pl.missionUi.result });
  await results.getByRole('button', { name: pl.progression.continue }).click();
  const guidance = page.getByRole('region', {
    name: pl.campaignRide.navigation,
  });
  await expect(guidance).toContainText(pl.misje['LOD-A3-02'].tytul);
  await expect
    .poll(async () => (await profile(page)).campaignRides?.lodz?.after)
    .toBe('LOD-A3-01');

  await page.reload();
  await chooseCity(page, 'lodz', 'campaign');
  await expect(guidance).toContainText(pl.misje['LOD-A3-02'].tytul);
  await expect(canvas).not.toHaveAttribute('data-mission', /.+/);
});

const views = [
  ['piotrkowska', 1705, 742, 0, 5200],
  ['fabryka', 2908, 1550, -Math.PI / 2, 0],
  ['murale', 3400, 1590, -Math.PI / 2, 0],
  ['kontrapas', 3120, 904, -Math.PI / 2, 0],
  ['brama', 3268, 1274, -Math.PI / 2, 0],
  ['tramwaj', 2538, 1456, -Math.PI / 2, 24_000],
] as const;

for (const [name, x, y, heading, wait] of views)
  test(`renders Łódź — ${name}`, async ({ page }, info) => {
    if (name === 'tramwaj') test.setTimeout(45_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startAt(page, 'lodz', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'lodz');
    const canvas = page.locator('canvas[data-map="lodz"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (wait) await page.waitForTimeout(wait);
    const path = info.outputPath(`139-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

import { expect, test } from '@playwright/test';
import questions from '../../content/pytania.json' with { type: 'json' };
import pl from '../../i18n/pl.json' with { type: 'json' };
import { legacyProgressKey } from '../../src/core/progressStore';
import {
  chooseCity,
  cityPin,
  driveTo,
  startAt,
  stopRider,
} from './city-picker';
import { readProfile } from './progress-profile';

test('opens Kraków in free ride and saves district progression', async ({
  page,
}, info) => {
  test.setTimeout(100_000);
  await startAt(page, 'krakow', 1730, 1270, Math.PI / 2);
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(cityPin(page, 'krakow')).toBeEnabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'krakow');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('105-mapa-polski.png') });
  await pin.click();
  const canvas = page.locator('canvas[data-map="krakow"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.krakowTitle);
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByText(pl.driving.districtLocked, { exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await stopRider(page);
  const option = (id: 'KRA-B-01' | 'KRA-B-02') =>
    page.getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
    });
  await page.keyboard.press('KeyM');
  await expect(
    page.getByRole('dialog', { name: pl.phone.title }),
  ).toBeVisible();
  await expect(option('KRA-B-02')).toHaveCount(0);
  await option('KRA-B-01').click();
  await expect(canvas).toHaveAttribute('data-mission', 'KRA-B-01');
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.missionUi.equip, exact: true })
    .click();
  await page.keyboard.press('KeyL');
  await expect(
    page.getByText(pl.misje['KRA-B-01'].deptak, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 638, false);
  await driveTo(page, 'ArrowRight', 'x', 1633, true);
  await expect(
    page.getByText(pl.misje['KRA-B-01'].meta, { exact: true }),
  ).toBeVisible();
  await driveTo(page, 'ArrowDown', 'y', 770, true);
  await page.keyboard.down('ArrowRight');
  try {
    await expect(
      page.getByRole('button', { name: pl.dialogueUi.skip }),
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect(
    page.getByText(pl.driving.districtsOpened, { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('KRA-B-01');

  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await expect(canvas).toHaveAttribute('data-x', '1730');
  await driveTo(page, 'ArrowUp', 'y', 1326, true);
  await page.keyboard.press('KeyM');
  await expect(option('KRA-B-02')).toBeVisible();
});

test('starts the campaign with training for a new rider', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'krakow', 'campaign');
  await expect(page.locator('canvas[data-map="krakow"]')).toHaveAttribute(
    'data-mission',
    'KRA-B-01',
  );
  await expect
    .poll(async () => (await readProfile(page)).selectedCity)
    .toBe('krakow');
});

test('resumes the campaign and saves an obwarzanek after its quiz', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.addInitScript(
    ({ key, completed }) => {
      if (!sessionStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ completed }));
        sessionStorage.setItem(key, '1');
      }
    },
    {
      key: legacyProgressKey,
      completed: ['KRA-B-01', 'KRA-B-02', 'KRA-B-03', 'KRA-A1-01'],
    },
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'krakow');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('106-kampania.png') });
  await pin.click();
  const canvas = page.locator('canvas[data-map="krakow"]');
  await expect(canvas).toHaveAttribute('data-mission', 'KRA-A1-02', {
    timeout: 15_000,
  });
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
  const collection = page.getByRole('status', { name: pl.driving.obwarzanki });
  await expect(collection).toHaveText('Obwarzanki 0/7');
  await expect(
    page.getByRole('status', { name: pl.driving.gnomes }),
  ).toHaveCount(0);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 637, false);
  await page.screenshot({ path: info.outputPath('106-obwarzanki.png') });
  const puzzle = page.getByRole('dialog', {
    name: pl.driving.obwarzanekQuestion,
  });
  await page.keyboard.down('ArrowRight');
  try {
    await expect(puzzle).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  const question = questions.pytania.find(({ id }) => id === 'Q026')!;
  await expect(puzzle).toContainText(question.pytanie);
  await page.screenshot({ path: info.outputPath('106-zagadka.png') });
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(collection).toHaveText('Obwarzanki 1/7');
  await expect
    .poll(async () => (await readProfile(page)).obwarzanki)
    .toEqual(['krk-obwarzanek-sukiennice']);
  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  await expect(pin).toBeFocused();
  await pin.click();
  await expect(canvas).toHaveAttribute('data-mission', 'KRA-A1-02', {
    timeout: 15_000,
  });
  await expect(collection).toHaveText('Obwarzanki 1/7');
});

const views = [
  ['rynek', 1710, 614],
  ['wawel', 1708, 1636, -Math.PI / 2],
  ['kazimierz', 3280, 1472],
  ['bulwary', 2950, 2176],
  ['kopiec', 3216, 2862],
  ['tramwaj', 2520, 720],
] as const;

for (const [name, x, y, heading = 0] of views)
  test(`renders Kraków — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key }) =>
        localStorage.setItem(
          key,
          JSON.stringify({ completed: ['KRA-B-01', 'KRA-B-02', 'KRA-B-03'] }),
        ),
      { key: legacyProgressKey },
    );
    if (name === 'tramwaj') await page.clock.install();
    await startAt(page, 'krakow', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'krakow');
    const canvas = page.locator('canvas[data-map="krakow"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    // The tram reaches the stop about seven seconds into the ride.
    if (name === 'tramwaj') await page.clock.runFor(8000);
    const path = info.outputPath(`105-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    if (name === 'wawel') {
      await page.keyboard.down('ArrowUp');
      try {
        await expect(
          page.getByText(pl.driving.collision, { exact: true }),
        ).toBeVisible();
        await expect(canvas).toHaveAttribute('data-speed', '0');
      } finally {
        await page.keyboard.up('ArrowUp');
      }
      const stoppedAt = Number(await canvas.getAttribute('data-y'));
      expect(stoppedAt).toBeGreaterThan(1604);
      expect(stoppedAt).toBeLessThan(y);
    }
    expect(errors).toEqual([]);
  });

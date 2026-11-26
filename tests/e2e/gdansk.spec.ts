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
  waitForCity,
} from './city-picker';
import { readProfile } from './progress-profile';

test.use({ baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block' });

test('opens Gdańsk in free ride and unlocks Ołowianka after training', async ({
  page,
}, info) => {
  test.setTimeout(65_000);
  await startAt(page, 'gdansk', 1712, 2154, Math.PI / 2);
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'gdansk');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('125-mapa-polski.png') });
  await pin.click();
  await waitForCity(page);

  const canvas = page.locator('canvas[data-map="gdansk"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.gdanskTitle);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await page.keyboard.down('ArrowUp');
  try {
    await expect(
      page.getByText(pl.driving.districtLocked, { exact: true }),
    ).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await stopRider(page);

  const option = (id: 'GDA-B-01' | 'GDA-B-02') =>
    page.getByRole('button', {
      name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
    });
  await page.keyboard.press('KeyM');
  await expect(
    page.getByRole('dialog', { name: pl.phone.title }),
  ).toBeVisible();
  await expect(option('GDA-B-02')).toHaveCount(0);
  await option('GDA-B-01').click();
  await expect(canvas).toHaveAttribute('data-mission', 'GDA-B-01');
  const skip = page.getByRole('button', { name: pl.dialogueUi.skip });
  await skip.click();
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
    page.getByText(pl.misje['GDA-B-01'].kladka, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowDown', 'y', 1940, true);
  await expect(
    page.getByText(pl.misje['GDA-B-01'].meta, { exact: true }),
  ).toBeVisible();
  await page.keyboard.down('ArrowDown');
  try {
    await expect(skip).toBeVisible({ timeout: 15_000 });
  } finally {
    await page.keyboard.up('ArrowDown');
  }
  await skip.click();
  await expect
    .poll(async () => (await readProfile(page)).completed)
    .toContain('GDA-B-01');

  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await waitForCity(page);
  await expect(canvas).toHaveAttribute('data-y', '2154');
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  await driveTo(page, 'ArrowUp', 'y', 2260, true);
  await page.keyboard.press('KeyM');
  await expect(option('GDA-B-02')).toBeVisible();
  expect((await readProfile(page)).selectedCity).toBeUndefined();
});

test('starts the Gdańsk campaign with the first training mission', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'gdansk');
  await expect(pin).toBeEnabled();
  await pin.hover();
  await page.screenshot({ path: info.outputPath('126-kampania.png') });
  await pin.press('Enter');
  await waitForCity(page);
  await expect(page.locator('canvas[data-map="gdansk"]')).toHaveAttribute(
    'data-mission',
    'GDA-B-01',
  );
  await expect
    .poll(async () => (await readProfile(page)).selectedCity)
    .toBe('gdansk');
});

test('resumes Gdańsk after training and saves amber only after a correct answer', async ({
  page,
}, info) => {
  test.setTimeout(75_000);
  await page.addInitScript(
    ({ key, completed }) => {
      if (!sessionStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ completed }));
        sessionStorage.setItem(key, '1');
      }
    },
    {
      key: legacyProgressKey,
      completed: ['GDA-B-01', 'GDA-B-02', 'GDA-B-03', 'GDA-B-04', 'GDA-A1-01'],
    },
  );
  const canvas = page.locator('canvas[data-map="gdansk"]');
  const counter = page.getByRole('status', { name: pl.driving.bursztyny });
  const startWalking = async () => {
    await chooseCity(page, 'gdansk', 'campaign');
    await expect(canvas).toHaveAttribute('data-mission', 'GDA-A1-02');
    await page.getByRole('button', { name: pl.dialogueUi.skip }).click();
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: pl.driving.classic, exact: true })
      .click();
    await page.keyboard.press('Escape');
    await expect(counter).toHaveText('Bursztyny 0/6');
    await page.keyboard.press('KeyX');
    await expect(canvas).toHaveAttribute('data-walking', 'true');
    await driveTo(page, 'ArrowRight', 'x', 1420, true);
  };
  await page.goto('/');
  await startWalking();
  await page.screenshot({ path: info.outputPath('126-bursztyny.png') });

  const puzzle = page.getByRole('dialog', {
    name: pl.driving.bursztynQuestion,
  });
  const walkToPuzzle = async () => {
    await page.keyboard.down('ArrowRight');
    try {
      await expect(puzzle).toBeVisible();
    } finally {
      await page.keyboard.up('ArrowRight');
    }
  };
  await walkToPuzzle();
  const question = questions.pytania.find(({ id }) => id === 'Q014')!;
  await expect(puzzle).toContainText(question.pytanie);
  await page.screenshot({ path: info.outputPath('126-zagadka.png') });
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi.find((_, i) => i !== question.poprawna),
      exact: true,
    })
    .click();
  await expect(puzzle.getByRole('status')).toHaveText(question.wyjasnienie);
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(counter).toHaveText('Bursztyny 0/6');

  await page.reload();
  await startWalking();
  await walkToPuzzle();
  await puzzle
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await puzzle.getByRole('button', { name: pl.progression.continue }).click();
  await expect(counter).toHaveText('Bursztyny 1/6');
  await expect
    .poll(async () => (await readProfile(page)).bursztyny)
    .toEqual(['gda-bursztyn-targ']);
  await page.reload();
  await page
    .getByRole('button', { name: pl.cityPicker.campaign, exact: true })
    .click();
  const pin = cityPin(page, 'gdansk');
  await expect(pin).toBeFocused();
  await pin.press('Enter');
  await waitForCity(page);
  await expect(canvas).toHaveAttribute('data-mission', 'GDA-A1-02');
  await expect(counter).toHaveText('Bursztyny 1/6');
});

const views = [
  ['dlugi-targ', 1768, 725, -Math.PI / 2],
  ['zuraw', 1712, 1800, -Math.PI / 2],
  ['kladka', 1712, 1936, -Math.PI / 2],
  ['stocznia', 3260, 1674, -Math.PI / 2],
  ['promenada', 2900, 2900, 0],
  ['plaza', 3500, 3200, Math.PI / 2],
  ['tramwaj', 2520, 746, 0],
] as const;

for (const [name, x, y, heading] of views)
  test(`renders Gdańsk — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            completed: ['GDA-B-01', 'GDA-B-02', 'GDA-B-03', 'GDA-B-04'],
          }),
        ),
      { key: legacyProgressKey },
    );
    if (name === 'tramwaj') await page.clock.install();
    await startAt(page, 'gdansk', x, y, heading);
    await page.goto('/');
    await chooseCity(page, 'gdansk');
    const canvas = page.locator('canvas[data-map="gdansk"]');
    await expect(canvas).toHaveAttribute('data-x', String(x));
    await expect(canvas).toHaveAttribute('data-y', String(y));
    if (name === 'tramwaj') await page.clock.runFor(8000);
    const path = info.outputPath(`125-${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    expect(errors).toEqual([]);
  });

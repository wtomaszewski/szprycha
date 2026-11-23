import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin, driveTo, startAt } from './city-picker';
import { readProfile } from './progress-profile';

const night = pl.misje['WIE-B-03'];

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
  await expect(page.getByRole('button', { name: /Wieś i las/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.cityPicker.freeRide, exact: true })
    .click();
  const pin = cityPin(page, 'wies');
  await expect(pin).toBeEnabled();
  await page.screenshot({ path: info.outputPath('127-mapa-polski.png') });
  await pin.click();
  const canvas = page.locator('canvas[data-map="wies"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.wiesTitle);
  await expect(canvas).not.toHaveAttribute('data-mission', /./);
  await expect
    .poll(async () => (await readProfile(page)).freeRideCity)
    .toBe('wies');
  expect((await readProfile(page)).selectedCity).not.toBe('wies');
  await page.keyboard.press('KeyM');
  for (const id of ['WIE-B-01', 'WIE-B-02', 'WIE-B-03', 'WIE-B-04'] as const)
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
  ['kolej', 1150, 1296, -Math.PI / 2, 22000],
  ['gospodarstwo', 718, 2240, Math.PI, 0],
  ['mostek', 1110, 1634, -Math.PI / 2, 0],
  ['ciagnik', 3898, 622, Math.PI, 6200],
] as const;

for (const [name, x, y, heading, time] of views) {
  test(`renders Wieś i las — ${name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (time) await page.clock.install();
    await startAt(page, 'wies', x, y, heading);
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

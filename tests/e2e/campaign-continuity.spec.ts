import { expect, test, type Locator, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, driveTo, startAt } from './city-picker';
import { profile, seedProgress } from './helpers/profile';
import { shiftPois } from './helpers/shift-pois';
import { installRideClock, setRideClockRate } from './helpers/ride-clock';
import type { CampaignRide } from '../../src/core/progressStore';

const city = (page: Page) => page.locator('canvas[data-scene="City"]');
const directions = (page: Page) =>
  page.getByRole('img', { name: /^Start misji · .*odległość w metrach/ });
const navigation = (page: Page) =>
  page.getByRole('region', { name: pl.campaignRide.navigation });
const offer = (page: Page) =>
  page.getByRole('dialog', { name: pl.campaignRide.offer });
const result = (page: Page) =>
  page.getByRole('region', { name: pl.missionUi.result });
const skip = (page: Page) =>
  page.getByRole('button', { name: pl.dialogueUi.skip }).click();

async function position(canvas: Locator) {
  return canvas.evaluate((element) => {
    const { x, y } = (element as HTMLCanvasElement).dataset;
    return { x, y };
  });
}

async function useDirectionalControls(page: Page) {
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.classic, exact: true })
    .click();
  await page.keyboard.press('Escape');
}

async function seed(page: Page, completed: string[]) {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await profile(page, { completed, reducedEffects: true });
  await page.reload();
}

async function continueRide(page: Page) {
  const finish = await position(city(page));
  await result(page)
    .getByRole('button', { name: pl.progression.continue })
    .click();
  await expect(navigation(page)).toBeVisible();
  await expect(city(page)).not.toHaveAttribute('data-mission', /.+/);
  expect(await position(city(page))).toEqual(finish);
}

async function accept(page: Page, id: string) {
  await expect(offer(page)).toBeVisible();
  await expect(city(page)).toHaveAttribute('data-speed', '0');
  await expect(city(page)).not.toHaveAttribute('data-mission', /.+/);
  const stopped = await position(city(page));
  await offer(page)
    .getByRole('button', { name: pl.campaignRide.accept })
    .click();
  await expect(city(page)).toHaveAttribute('data-mission', id);
  expect(await position(city(page))).toEqual(stopped);
  await expect(page.getByRole('dialog', { name: pl.phone.title })).toHaveCount(
    0,
  );
}

test.use({ baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block' });

test('Warsaw continues after training, transfers maps, and accepts at the marker', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  // Enter Warsaw from the access lane near the workshop to exercise a short, legal approach.
  await startAt(page, 'warszawa', 800, 315, -Math.PI / 2);
  await seed(page, ['WAW-T-01']);
  await chooseCity(page, 'warszawa', 'campaign');
  await expect(city(page)).toHaveAttribute('data-mission', 'WAW-T-02');
  await skip(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.getByRole('button', { name: pl.missionUi.turnOnLights }).click();
  await useDirectionalControls(page);
  await driveTo(page, 'ArrowDown', 'y', 1041, true);
  await page.keyboard.down('ArrowRight');
  try {
    await expect(
      page.getByText(pl.dialogi['WAW-T-02'].koniec_tekst),
    ).toBeVisible({ timeout: 12_000 });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await skip(page);
  await continueRide(page);
  await expect(navigation(page)).toContainText(
    pl.campaignRide.trainingComplete,
  );
  await expect(directions(page)).toHaveCount(0);
  await navigation(page)
    .getByRole('button', { name: /Przejdź na mapę/ })
    .click();
  await expect(city(page)).toHaveAttribute('data-map', 'warszawa');
  await expect(directions(page)).toBeVisible();
  const screenshot = info.outputPath('152-warszawa-desktop.png');
  await page.screenshot({ path: screenshot });
  await info.attach('Wskaźnik na desktopie', {
    path: screenshot,
    contentType: 'image/png',
  });
  await expect(offer(page)).toBeHidden();
  await page.keyboard.press('KeyX');
  await driveTo(page, 'ArrowUp', 'y', 244, false);
  await expect(offer(page)).toContainText(pl.dialogi.postacie.pan_kazik);
  await accept(page, 'WAW-A1-01');
});

test.describe('mobile 640 × 360', () => {
  test.use({
    viewport: { width: 640, height: 360 },
    hasTouch: true,
    isMobile: true,
  });

  const beforeFirstAid = [
    'POZ-B-01',
    'POZ-B-02',
    'POZ-B-03',
    'POZ-B-04',
    'POZ-A1-01',
    'POZ-A1-02',
    'POZ-A2-01',
    'POZ-A2-02',
  ];
  const afterFirstAid: CampaignRide = {
    after: 'POZ-A3-01',
    map: 'poznan',
    x: 1712,
    y: 2072,
    heading: Math.PI / 2,
    walking: true,
    helmet: true,
    lights: true,
    scheme: 'simple',
  };

  test('Poznań saves the position and directions after first aid', async ({
    page,
    baseURL,
  }) => {
    await installRideClock(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedProgress(page, baseURL, { completed: beforeFirstAid });
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-scene',
      'MainMenu',
    );
    // Keep the turn, bridge and help objectives, with a shorter approach on the same lane.
    const restoreMap = await shiftPois(page, 'poznan', {
      'poz-bulwar-start': [1712, 1988],
      'poz-bulwar-zakret': [1712, 2008],
      'poz-bulwar-most': [1712, 2035],
    });
    await chooseCity(page, 'poznan', 'campaign');
    await expect(city(page)).toHaveAttribute('data-mission', 'POZ-A3-01');
    await restoreMap();
    await skip(page);
    await page
      .getByRole('button', { name: pl.missionUi.equip, exact: true })
      .click();
    await page
      .getByRole('button', { name: pl.missionUi.turnOnLights, exact: true })
      .click();
    await page.keyboard.press('KeyX');
    await setRideClockRate(page, 3);
    await driveTo(page, 'ArrowDown', 'y', 2072, true);
    for (const answer of [
      pl.misje['POZ-B-04'].odp2,
      pl.misje['POZ-A3-01'].odp1,
    ]) {
      await page.getByRole('button', { name: answer, exact: true }).click();
      await page.getByRole('button', { name: pl.progression.continue }).click();
    }
    await skip(page);
    await continueRide(page);
    await expect(directions(page)).toBeVisible();
    await expect(page.locator('.campaign-navigation-status')).toHaveText(
      /odległość w metrach: \d+/,
    );
    const finish = await position(city(page));

    await expect
      .poll(async () => {
        const saved = (await profile(page)).campaignRides?.poznan;
        if (!saved) return;
        return {
          after: saved.after,
          x: String(Math.round(saved.x)),
          y: String(Math.round(saved.y)),
        };
      })
      .toEqual({ after: afterFirstAid.after, ...finish });
  });

  test('Poznań restores a guided ride and accepts the next mission after stopping', async ({
    page,
    baseURL,
  }, info) => {
    await installRideClock(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedProgress(page, baseURL, {
      completed: [...beforeFirstAid, afterFirstAid.after],
      campaignRides: { poznan: afterFirstAid },
    });
    await page.goto('/');
    await chooseCity(page, 'poznan', 'campaign');
    await expect(navigation(page)).toContainText(pl.misje['POZ-A3-02'].tytul);
    expect(await position(city(page))).toEqual({
      x: String(afterFirstAid.x),
      y: String(afterFirstAid.y),
    });
    const screenshot = info.outputPath('152-poznan-telefon.png');
    await expect(directions(page)).toBeVisible();
    await page.screenshot({ path: screenshot });
    await info.attach('Wskaźnik na telefonie', {
      path: screenshot,
      contentType: 'image/png',
    });
    await setRideClockRate(page, 3);
    await driveTo(page, 'ArrowLeft', 'x', 1555, false);
    await expect(offer(page)).toBeHidden();
    await driveTo(page, 'ArrowDown', 'y', 2160, true);
    await expect(offer(page)).toContainText(pl.dialogi.postacie.lena_mapa);
    await offer(page)
      .getByRole('button', { name: pl.campaignRide.decline })
      .click();
    await expect(offer(page)).toBeHidden();
    await driveTo(page, 'ArrowUp', 'y', 2138, false);
    await driveTo(page, 'ArrowDown', 'y', 2160, true);
    await accept(page, 'POZ-A3-02');
  });
});

test('a completed campaign shows the exam and city picker', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  const content = (await (
    await page.request.get('/data/content.json')
  ).json()) as import('../../src/content/schemas').GameContent;
  const completed = content.misje
    .filter(({ miasto, poboczna }) => miasto === 'poznan' && !poboczna)
    .map(({ id }) => id);
  await profile(page, {
    completed,
    campaignRides: {
      poznan: {
        after: 'POZ-A3-02',
        map: 'poznan',
        x: 1552,
        y: 2430,
        walking: true,
        heading: Math.PI / 2,
        helmet: true,
        lights: false,
      },
    },
  });
  await page.reload();
  await chooseCity(page, 'poznan', 'campaign');
  await expect(navigation(page)).toContainText(pl.campaignRide.complete);
  await expect(directions(page)).toHaveCount(0);
  await expect(
    navigation(page).getByRole('button', { name: pl.campaignRide.cities }),
  ).toBeEnabled();
  await navigation(page).getByRole('button', { name: pl.exam.menu }).click();
  await expect(
    page.getByRole('dialog', { name: pl.exam.title, exact: true }),
  ).toBeVisible();
});

test('announces the next act and applies dusk and helmet settings on acceptance', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await profile(page, {
    completed: [
      'POZ-B-01',
      'POZ-B-02',
      'POZ-B-03',
      'POZ-B-04',
      'POZ-A1-01',
      'POZ-A1-02',
      'POZ-A2-01',
      'POZ-A2-02',
    ],
    campaignRides: {
      poznan: {
        after: 'POZ-A2-02',
        map: 'poznan',
        x: 1430,
        y: 1622,
        heading: 0,
        walking: false,
        helmet: true,
        lights: false,
      },
    },
  });
  await page.reload();
  await chooseCity(page, 'poznan', 'campaign');
  await expect(page.locator('.campaign-navigation-panel')).toContainText(
    pl.campaignRide.actComplete.replace('{act}', '2'),
  );
  await expect(city(page)).not.toHaveAttribute('data-lighting', 'night');
  await expect(offer(page)).toContainText(pl.dialogi['POZ-A3-01'].start);
  await accept(page, 'POZ-A3-01');
  await expect(city(page)).toHaveAttribute('data-lighting', 'night');
  const instruction = page.getByRole('button', { name: pl.dialogueUi.skip });
  if (await instruction.isVisible()) await instruction.click();
  await expect(
    page.getByRole('button', { name: pl.missionUi.equip }),
  ).toBeVisible();
});

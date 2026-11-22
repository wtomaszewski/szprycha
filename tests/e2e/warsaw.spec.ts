import { expect as playwrightExpect, test, type Page } from '@playwright/test';
import { chooseCity } from './city-picker';
import type { GameContent } from '../../src/content/schemas';
import pl from '../../i18n/pl.json' with { type: 'json' };
import questions from '../../content/pytania.json' with { type: 'json' };
import { findDisplayedQuestion } from './question-dialog';
import {
  warsawRoutes,
  type WarsawMissionId,
  type Waypoint,
} from '../missions/warsaw-routes';

const expect = playwrightExpect.configure({ timeout: 12_000 });
const canvas = (page: Page) => page.locator('canvas');
const riderY = async (page: Page) =>
  Number.parseFloat((await canvas(page).getAttribute('data-y')) ?? '');
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const skip = (page: Page) =>
  dialogue(page).getByRole('button', { name: pl.dialogueUi.skip }).click();
const phone = (page: Page) =>
  page.getByRole('dialog', { name: pl.phone.title });
const order = (page: Page, id: WarsawMissionId) =>
  phone(page).getByRole('button', {
    name: `${pl.phone.start} · ${pl.misje[id].tytul}`,
  });

async function routeWithGamepad(page: Page, points: Waypoint[]) {
  await page.evaluate((route) => {
    window.dispatchEvent(
      new CustomEvent('test:warsaw-route', { detail: route }),
    );
  }, points);
}

test('completes Warsaw act 1 in order and explains the illegal shortcut', async ({
  page,
}) => {
  test.setTimeout(480_000);
  await page.addInitScript(() => {
    let route: Waypoint[] = [];
    let rate = 1;
    const wallTime = performance.now.bind(performance);
    let lastWallTime = wallTime();
    let gameTime = lastWallTime;
    const now = () => {
      const current = wallTime();
      gameTime += (current - lastWallTime) * rate;
      lastWallTime = current;
      return gameTime;
    };
    const raf = window.requestAnimationFrame.bind(window);
    Object.defineProperty(performance, 'now', { value: now });
    window.requestAnimationFrame = (callback) => raf(() => callback(now()));
    window.addEventListener('test:warsaw-rate', (event) => {
      now();
      rate = (event as CustomEvent<number>).detail;
    });
    let addressedEvent = false;
    window.addEventListener('test:warsaw-route', (event) => {
      route = (event as CustomEvent<Waypoint[]>).detail;
      addressedEvent = false;
    });
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        const active = document.querySelector('dialog[open]')
          ? undefined
          : route[0];
        const attributes = document.querySelector('canvas')?.dataset;
        const dx = (active?.x ?? 0) - Number(attributes?.x ?? 0);
        const dy = (active?.y ?? 0) - Number(attributes?.y ?? 0);
        const distance = Math.hypot(dx, dy);
        const switchingMode =
          active?.walking !== undefined &&
          String(active.walking) !== attributes?.walking;
        const gentle = attributes?.mission === 'WAW-A1-05';
        const coasting = active?.coast && !switchingMode;
        const arrived = Boolean(
          active &&
          (distance < (active.photo ? 7 : gentle ? 11 : 16) || switchingMode),
        );
        const stop = arrived && !coasting;
        addressedEvent ||= Boolean(attributes?.trafficEvent);
        if (
          active &&
          attributes &&
          arrived &&
          !switchingMode &&
          (coasting || attributes.speed === '0')
        ) {
          const ready =
            active.until === 'officer-go'
              ? attributes.officerCleared === 'true'
              : active.until === 'traffic-ended'
                ? addressedEvent && !attributes.trafficEvent
                : active.until === 'driveway-stop'
                  ? attributes.drivewayStopReady === 'true'
                  : active.until !== 'signaled' ||
                    attributes.signalReady === 'true';
          if (ready) route.shift();
        }
        const strength = Math.min(
          active?.maxInput ?? 1,
          gentle && !coasting
            ? Math.max(
                0.22,
                Math.sqrt(Math.max(0, distance - 5) * 50) /
                  (attributes?.walking === 'true' ? 32 : 150),
              )
            : attributes?.walking === 'true'
              ? 1
              : Math.max(0.22, distance / 130),
        );
        return [
          {
            connected: true,
            axes:
              !active || stop || distance === 0
                ? [0, 0]
                : [(dx / distance) * strength, (dy / distance) * strength],
            buttons: Array.from({ length: 17 }, (_, i) => ({
              pressed:
                (i === 0 && switchingMode && attributes?.speed === '0') ||
                (i === 1 && stop && (!gentle || switchingMode)) ||
                (i === 3 && Boolean(active?.look)) ||
                (i === 4 && active?.signal === 'left') ||
                (i === 5 && active?.signal === 'right'),
            })),
          },
        ];
      },
    });
  });

  await page.goto('/');
  await expect(canvas(page)).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas(page)).toHaveAttribute('data-map', 'miasteczko');
  await page.keyboard.press('KeyM');
  for (const id of Object.keys(warsawRoutes) as WarsawMissionId[])
    await expect(order(page, id)).toHaveCount(0);
  await phone(page)
    .getByRole('button', { name: new RegExp(pl.misje['WAW-T-01'].tytul) })
    .click();
  await skip(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(() => riderY(page), {
      intervals: [30, 50, 70],
    })
    .toBeGreaterThanOrEqual(1185);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas(page)).toHaveAttribute('data-speed', '0');
  await expect(canvas(page)).toHaveAttribute('data-stop-ready', 'true');
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skip(page);

  const ids = Object.keys(warsawRoutes) as WarsawMissionId[];
  const speedUp = (detail: number) =>
    page.evaluate((speed) => {
      window.dispatchEvent(
        new CustomEvent('test:warsaw-rate', { detail: speed }),
      );
    }, detail);
  for (const [index, id] of ids.entries()) {
    await test.step(id, async () => {
      await expect(
        page.getByText(pl.missionUi.completed, { exact: true }),
      ).toBeVisible();
      await page.keyboard.press('KeyM');
      await expect(order(page, id)).toBeEnabled();
      for (const locked of ids.slice(index + 1))
        await expect(order(page, locked)).toHaveCount(0);
      await order(page, id).click();
      await expect(canvas(page)).toHaveAttribute('data-mission', id);
      await expect(canvas(page)).toHaveAttribute(
        'data-map',
        id === 'WAW-T-02' ? 'miasteczko' : 'warszawa',
      );
      await skip(page);
      if (id === 'WAW-T-02') {
        await page.screenshot({ path: 'test-results/m4d-garaz.png' });
        await page.getByRole('button', { name: pl.missionUi.equip }).click();
        await expect(
          page.getByRole('button', { name: pl.missionUi.turnOnLights }),
        ).toBeVisible();
        await expect(page.getByText(pl.misje[id].cel2)).toHaveCount(0);
        await page
          .getByRole('button', { name: pl.missionUi.turnOnLights })
          .click();
        await expect(page.getByText(pl.misje[id].cel2)).toBeVisible();
      }
      if (id === 'WAW-A1-02')
        await page.screenshot({ path: 'test-results/m4d-praga.png' });
      if (id === 'WAW-A1-03') {
        await expect(canvas(page)).toHaveAttribute('data-y', '878');
        await page.keyboard.down('ArrowUp');
        await expect
          .poll(() => riderY(page), { intervals: [30, 50, 70] })
          .toBeLessThanOrEqual(590);
        await page.keyboard.up('ArrowUp');
        await page.keyboard.down('Space');
        await expect(canvas(page)).toHaveAttribute('data-speed', '0');
        const stoppedY = await riderY(page);
        expect(stoppedY).toBeGreaterThan(512);
        expect(stoppedY).toBeLessThan(576);
        const crossingTraffic = page.getByText(
          pl.trafficEvents.pojazd_na_skrzyzowaniu,
          { exact: true },
        );
        await expect(crossingTraffic).toBeVisible();
        await expect(crossingTraffic).toBeHidden({ timeout: 12_000 });
        await page.keyboard.up('Space');

        await page.keyboard.down('ArrowUp');
        await expect
          .poll(() => riderY(page), { intervals: [30, 50, 70] })
          .toBeLessThanOrEqual(378);
        await page.keyboard.up('ArrowUp');
        await page.keyboard.down('Space');
        await expect(canvas(page)).toHaveAttribute('data-speed', '0');
        await page.keyboard.up('Space');
        await expect(
          page.getByText(pl.misje[id].cel4, { exact: true }),
        ).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: pl.driving.classic, exact: true })
        .click();
      await page.keyboard.press('Escape');
      if (id === 'WAW-A1-03') {
        // The keyboard has already cleared STOP. Now enter the passage and deliver.
        await routeWithGamepad(page, warsawRoutes[id].shortcut.slice(2));
        const lesson = page.getByRole('dialog', { name: pl.replay.title });
        await expect(lesson.locator('#replay-feedback')).toContainText(
          'Białe koło z czerwoną obwódką oznacza zakaz ruchu także dla rowerów',
        );
        await page.screenshot({
          path: 'test-results/m4d-skrot-stop-klatka.png',
        });
        await lesson.getByRole('button', { name: pl.replay.resume }).click();
        await speedUp(4);
      } else if (id === 'WAW-A1-04') {
        await routeWithGamepad(page, warsawRoutes[id].legal);
        await expect
          .poll(async () => Number(await canvas(page).getAttribute('data-x')), {
            timeout: 14_000,
          })
          .toBeGreaterThan(2450);
        await page.screenshot({ path: 'test-results/m4d-most.png' });
        await expect(
          page.getByText(pl.trafficEvents.pieszy_na_pasach, { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
        await speedUp(4);
      } else if (id === 'WAW-A1-05') {
        const shocks = page.getByRole('progressbar', {
          name: pl.missionUi.shocks,
        });
        await expect(shocks).toBeVisible();
        await expect(shocks).toHaveAttribute('value', '0');
        await routeWithGamepad(page, warsawRoutes[id].legal);
        await expect(
          page.getByText(pl.trafficEvents.turysci_na_starowce, { exact: true }),
        ).toBeVisible({ timeout: 12_000 });
        await page.screenshot({ path: 'test-results/m4d-starowka.png' });
        await speedUp(4);
      } else if (id === 'WAW-A1-06') {
        const photo = page.getByRole('button', {
          name: pl.missionUi.photograph,
        });
        const [stop, junction, sidewalk, crossing, sign, ...clue] =
          warsawRoutes[id].legal;
        await routeWithGamepad(page, [stop!, junction!]);
        await expect(
          page.getByText(pl.trafficEvents.polecenie_oli, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(pl.trafficEvents.olaRusza, { exact: true }),
        ).toBeVisible();
        await expect(photo).toBeDisabled();
        await expect
          .poll(async () => Number(await canvas(page).getAttribute('data-x')))
          .toBeGreaterThan(3568);
        await expect(canvas(page)).toHaveAttribute('data-speed', '0');
        await routeWithGamepad(page, [sidewalk!, crossing!, sign!]);
        await expect(photo).toBeEnabled({ timeout: 20_000 });
        await page.screenshot({ path: 'test-results/m4d-znak.png' });
        await photo.click();
        await expect(page.getByText(pl.m5c.photoSaved)).toBeVisible();
        await expect(
          page.getByText(pl.misje[id].cel4, { exact: true }),
        ).toBeVisible();
        await routeWithGamepad(page, clue);
        await speedUp(4);
      } else {
        await routeWithGamepad(page, warsawRoutes[id].legal);
        if (id !== 'WAW-T-02') await speedUp(4);
      }
      const replay = page.getByRole('dialog', { name: pl.replay.title });
      const control = page.getByRole('dialog', {
        name: pl.progression.questionTitle,
      });
      await expect(async () => {
        if (await replay.isVisible())
          await replay.getByRole('button', { name: pl.replay.resume }).click();
        if (await control.isVisible()) {
          const prompt = await control
            .locator('.control-question-prompt')
            .textContent();
          const options = await control
            .locator('.control-question-answers button')
            .allTextContents();
          const question = findDisplayedQuestion(
            questions.pytania,
            prompt,
            options,
          )!;
          await control
            .getByRole('button', {
              name: question.odpowiedzi[question.poprawna],
              exact: true,
            })
            .click();
          await control
            .getByRole('button', { name: pl.progression.continue })
            .click();
        }
        await expect(dialogue(page)).toBeVisible({ timeout: 500 });
      }).toPass({ timeout: 100_000, intervals: [150] });
      await speedUp(1);
      if (id === 'WAW-A1-04')
        await expect(dialogue(page)).toContainText(pl.dialogi[id].koniec_tekst);
      if (id === 'WAW-A1-06') {
        await dialogue(page)
          .getByRole('button', { name: pl.dialogueUi.next })
          .click();
        await expect(dialogue(page)).toContainText(pl.dialogi[id].final);
      }
      await routeWithGamepad(page, []);
      await skip(page);
      if (id === 'WAW-A1-02')
        await page.screenshot({ path: 'test-results/m4d-bazar.png' });
      if (id === 'WAW-A1-03') {
        await expect(
          page.getByText(pl.missionUi.illegalShortcut),
        ).toBeVisible();
        await page.screenshot({ path: 'test-results/m4d-skrot-wynik.png' });
      }
      await expect(
        page.getByText(pl.missionUi.completed, { exact: true }),
      ).toBeVisible();
      const summary = page.getByRole('region', { name: pl.missionUi.result });
      if (id === 'WAW-A1-04') {
        await expect(summary).toContainText(pl.missionUi.yourPoints);
        await expect(summary).toContainText(pl.missionUi.turboPoints);
      }
      if (id === 'WAW-A1-05')
        await expect(summary).toContainText(pl.missionUi.smoothBonus);
      if (id === 'WAW-A1-06')
        await expect(summary).toContainText(`${pl.missionUi.photos} 1`);
    });
  }
  await page.reload();
  await page.getByRole('button', { name: pl.skillMap.title }).click();
  const skillMap = page.getByRole('dialog', { name: pl.skillMap.title });
  for (const id of ['WAW-T-01', ...ids] as const)
    await expect(
      skillMap.getByText(pl.misje[id].tytul, { exact: true }),
    ).toBeVisible();
  await skillMap.getByRole('button', { name: pl.skillMap.close }).click();
  const content: GameContent = await (
    await page.request.get('/data/content.json')
  ).json();
  const sign = content.znaki.znaki.find(({ kod }) => kod === 'A-7')!;
  await page.getByRole('button', { name: pl.m5c.album }).click();
  const album = page.getByRole('dialog', { name: pl.m5c.album });
  await expect(album).toContainText(
    `${pl.m5c.albumProgress} 1 / ${content.znaki.znaki.length}`,
  );
  await expect(album.getByText(sign.dla_dziecka)).toBeVisible();
  const image = album.getByRole('img', { name: sign.nazwa });
  await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(64);
  await page.screenshot({ path: 'test-results/m5c-album.png' });
  await album.getByRole('button', { name: pl.m5c.close }).click();
  await chooseCity(page, 'warszawa');
  await expect(canvas(page)).toHaveAttribute('data-map', 'warszawa');
  await page.keyboard.press('KeyM');
  await expect(order(page, 'WAW-A1-06')).toBeEnabled();
});

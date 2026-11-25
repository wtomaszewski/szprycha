import { arcadeFont, readingFont } from '../src/core/fonts';
import { waitForMainMenu } from './skip-tutorial';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { build, preview } from 'vite';
import pl from '../i18n/pl.json';
import { appBackground, appTheme, drawAppArt } from './app-icons';
import {
  storeDevices,
  storeFeatureGraphic,
  storeIcon,
  storeScenes,
  storeScreenshot,
  writeStorePng,
} from './store-assets';

type Device = (typeof storeDevices)[number];
type MapObject = {
  name: string;
  x: number;
  y: number;
  properties?: { name: string; type: string; value: number }[];
};

async function setSpawn(
  page: Page,
  city: 'miasteczko' | 'wies' | 'lodz',
  x: number,
  y: number,
  heading?: number,
  railOffset?: { crossing: string; seconds: number },
) {
  const mapPath = new RegExp(`/assets/${city}-[^/]+\\.tmj$`);
  await page.unroute(mapPath);
  await page.route(mapPath, async (route) => {
    const response = await route.fetch();
    const map: {
      layers: {
        name: string;
        objects?: MapObject[];
      }[];
    } = await response.json();
    const objects = (layerName: string) =>
      map.layers.find((layer) => layer.name === layerName)?.objects ?? [];
    const player = objects('spawns').find(({ name }) => name === 'player');
    if (!player) throw new Error(`Missing player spawn in ${city}`);
    Object.assign(player, { x, y });
    if (heading !== undefined) {
      const direction = player.properties?.find(
        ({ name }) => name === 'heading',
      );
      if (!direction) throw new Error(`Missing player heading in ${city}`);
      direction.value = heading;
    }
    if (railOffset) {
      const crossing = objects('crossings').find(
        ({ name }) => name === railOffset.crossing,
      );
      if (!crossing?.properties)
        throw new Error(
          `Missing rail crossing ${railOffset.crossing} in ${city}`,
        );
      crossing.properties.push({
        name: 'offset_s',
        type: 'float',
        value: railOffset.seconds,
      });
    }
    await route.fulfill({ response, json: map });
  });
}

async function captureDevice(
  browser: Browser,
  origin: string,
  device: Device,
  output: string,
) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    serviceWorkers: 'block',
  });
  const errors: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) {
      await route.continue();
    } else {
      errors.push(`Unexpected network request: ${url.origin}`);
      await route.abort();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = page.locator('canvas');
  const button = (name: string) =>
    page.getByRole('button', { name, exact: true });

  async function menu() {
    await page.goto(origin);
    await waitForMainMenu(page);
  }

  async function startTraining(x: number, y: number) {
    await setSpawn(page, 'miasteczko', x, y);
    await menu();
    await button(pl.driving.title).click();
    await expect(canvas).toHaveAttribute('data-x', String(x));
  }

  async function freeRide(city: 'zakopane' | 'wies' | 'lodz') {
    await menu();
    await button(pl.cityPicker.freeRide).click();
    const pin = button(pl.cityPicker[city]);
    await expect(pin).toBeEnabled();
    await pauseClock();
    await pin.dispatchEvent('click');
    // Advance a frame at a time so traffic timing starts with the first City frame.
    await expect
      .poll(
        async () => {
          await page.clock.runFor(16);
          return canvas.getAttribute('data-map');
        },
        { intervals: [20], timeout: 15_000 },
      )
      .toBe(city);
    await expect(canvas).toHaveAttribute('data-speed', '0');
  }

  async function pauseClock() {
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 5000);
  }

  async function save(scene: (typeof storeScenes)[number], style?: string) {
    const asset = storeScreenshot(device, scene);
    const buffer = await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      style,
    });
    await writeStorePng(output, asset, buffer);
  }

  async function saveCity(scene: (typeof storeScenes)[number], style = '') {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('status', { name: pl.progression.attention }),
    ).toHaveText(/^0\//);
    await save(
      scene,
      `
      .ride-score, .ride-details > output[title] { display: none; }
      .radio-station, .radio-caption { visibility: hidden; }
      ${style}
    `,
    );
  }

  try {
    // Start on the northbound cycle path in the training town.
    await startTraining(624, 900);
    await page.keyboard.press('KeyL');
    await expect(
      page.getByRole('img', { name: pl.rideHud.helmetOn }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: pl.rideHud.lightsOn }),
    ).toBeVisible();
    await page.keyboard.press('F3');
    await button(pl.driving.previewNight).click();
    await page.keyboard.press('F3');
    await expect(
      page.getByRole('img', { name: pl.rideHud.night }),
    ).toBeVisible();
    await save(storeScenes[0]);

    // Enter the zebra from the south pavement on foot with the bicycle.
    await startTraining(656, 714);
    await page.keyboard.press('KeyX');
    await expect(canvas).toHaveAttribute('data-walking', 'true');
    await page.keyboard.down('ArrowUp');
    try {
      await page.waitForFunction(
        () => Number(document.querySelector('canvas')?.dataset.y) < 700,
      );
    } finally {
      await page.keyboard.up('ArrowUp');
    }
    await expect(canvas).toHaveAttribute('data-speed', '0');
    const y = Number(await canvas.getAttribute('data-y'));
    if (y < 675 || y >= 704)
      throw new Error(`Unexpected position on zebra: y=${y}`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await save(storeScenes[1]);

    await menu();
    await button(pl.plac.title).click();
    await button(pl.plac.arcade).click();
    await expect(canvas).toHaveAttribute('data-plac-exercise', 'PLAC-01');
    await save(storeScenes[2]);

    // Take a real photo after dismounting on the pavement by the STOP sign.
    await startTraining(364, 1260);
    await page.keyboard.press('KeyX');
    await expect(canvas).toHaveAttribute('data-walking', 'true');
    await page.keyboard.press('KeyP');
    await expect(page.getByText(pl.m5c.photoSaved)).toBeVisible();
    await page.keyboard.press('Escape');
    await button(pl.driving.menu).click();
    await button(pl.m5c.album).click();
    const album = page.getByRole('dialog', { name: pl.m5c.album });
    await expect(
      album.getByRole('img', { name: 'STOP', exact: true }),
    ).toBeVisible();
    await album.locator('summary').click();
    await album.evaluate((dialog) => (dialog.scrollTop = 0));
    await save(storeScenes[3]);

    await album.getByRole('button', { name: pl.m5c.close }).click();
    // Capture only the module grid from a fresh session, without the profile.
    await page.addStyleTag({
      content: '.skill-map > :not(header, ul) { display: none; }',
    });
    await button(pl.skillMap.title).click();
    const skills = page.getByRole('dialog', { name: pl.skillMap.title });
    await expect(skills.getByRole('meter')).toHaveCount(8);
    await save(storeScenes[4]);

    // MAN-08 / MSC-04: equip the rider before rolling slowly downhill in fog.
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await freeRide('zakopane');
    await page.clock.resume();
    await page.keyboard.press('KeyM');
    await button(`${pl.phone.start} · ${pl.misje['ZAK-B-03'].tytul}`).click();
    await expect(canvas).toHaveAttribute('data-mission', 'ZAK-B-03');
    await expect(button(pl.dialogueUi.skip)).toBeVisible();
    await pauseClock();
    await button(pl.dialogueUi.skip).dispatchEvent('click');
    await button(pl.missionUi.equip).dispatchEvent('click');
    await button(pl.missionUi.turnOnLights).dispatchEvent('click');
    await page.clock.runFor(120);
    await expect(canvas).toHaveAttribute('data-weather', 'fog');
    await expect(
      page.getByRole('img', { name: pl.rideHud.helmetOn }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: pl.rideHud.lightsOn }),
    ).toBeVisible();
    const startY = Number(await canvas.getAttribute('data-y'));
    await page.keyboard.down('ArrowDown');
    await page.clock.runFor(250);
    await page.keyboard.up('ArrowDown');
    await page.clock.runFor(300);
    const downhill = Number(await canvas.getAttribute('data-y'));
    const speed = Number(await canvas.getAttribute('data-speed'));
    if (downhill <= startY || !(speed > 0 && speed <= 60))
      throw new Error(`Unexpected descent: y=${downhill}, speed=${speed}`);
    // The training tip overlaps the mission objective on short viewports.
    await expect(page.locator('.traffic-event')).toHaveText(
      pl.trafficEvents.cwiczenie_trasy,
    );
    await saveCity(storeScenes[5], '.traffic-event { display: none; }');
    await page.clock.resume();

    // MSC-01: wait on the approach, outside the tracks, as a train passes.
    await setSpawn(page, 'wies', 1170, 1296, -Math.PI / 2, {
      crossing: 'przejazd-gminny',
      seconds: 23.5,
    });
    await freeRide('wies');
    await page.clock.runFor(120);
    await expect(canvas).toHaveAttribute('data-x', '1170');
    await expect(canvas).toHaveAttribute('data-y', '1296');
    await saveCity(storeScenes[6]);
    await page.clock.resume();

    // MAN-14: wait on the right while a rickshaw approaches in the other lane.
    await setSpawn(page, 'lodz', 1705, 742, 0);
    await freeRide('lodz');
    await page.clock.runFor(5200);
    await expect(canvas).toHaveAttribute('data-x', '1705');
    await expect(canvas).toHaveAttribute('data-y', '742');
    await expect(canvas).toHaveAttribute('data-speed', '0');
    await saveCity(storeScenes[7]);
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    await context.close();
  }
}

async function captureFeatureGraphic(
  browser: Browser,
  output: string,
  icon: Buffer,
) {
  const scene = storeScreenshot(storeDevices[0], storeScenes[0]);
  const image = await readFile(join(output, scene.path));
  const [arcade, reading] = await Promise.all([
    readFile('assets/fonts/press-start-2p/PressStart2P-Regular.ttf'),
    readFile('assets/fonts/vt323/VT323-Regular.ttf'),
  ]);
  const { width, height } = storeFeatureGraphic;
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.route('**/*', (route) => route.abort());
    await page.setContent(`
      <style>
        @font-face {
          font-family: '${arcadeFont}';
          src: url(data:font/ttf;base64,${arcade.toString('base64')});
        }
        @font-face {
          font-family: '${readingFont}';
          src: url(data:font/ttf;base64,${reading.toString('base64')});
        }
        body {
          margin: 0;
          display: grid;
          grid-template-columns: 340px 1fr;
          align-items: center;
          height: 100vh;
          overflow: hidden;
          background: ${appBackground};
          color: #ffcd75;
          font-family: '${readingFont}', monospace;
        }
        header {
          padding-inline: 28px;
          text-align: center;
        }
        header img, .game {
          image-rendering: pixelated;
        }
        h1 {
          margin: 0;
          font-family: '${arcadeFont}', monospace;
          font-weight: 400;
          font-size: 32px;
          line-height: 1;
        }
        p {
          margin: 8px 0 0;
          color: #f4f4f4;
          font-size: 32px;
        }
        .game {
          box-sizing: border-box;
          width: 660px;
          border: 4px solid ${appTheme};
        }
      </style>
      <header>
        <img src="data:image/png;base64,${icon.toString('base64')}" width="160" height="160" alt="">
        <h1>${pl.title}</h1>
        <p>${pl.subtitle}</p>
      </header>
      <img class="game" src="data:image/png;base64,${image.toString('base64')}" alt="">
    `);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const buffer = await page.screenshot({ animations: 'disabled' });
    await writeStorePng(output, storeFeatureGraphic, buffer);
  } finally {
    await page.close();
  }
}

async function generate() {
  const temp = await mkdtemp(join(tmpdir(), 'szprycha-store-'));
  try {
    const output = join(temp, 'store');
    Object.assign(process.env, {
      VITE_RANKING_URL: '',
      VITE_PRIVACY_POLICY_URL: '',
      VITE_PROJECT_URL: '',
    });
    const outDir = join(temp, 'dist');
    await build({ mode: 'mobile', build: { outDir, emptyOutDir: false } });
    const server = await preview({
      configFile: false,
      build: { outDir },
      preview: { host: '127.0.0.1', port: 0 },
    });
    try {
      const address = server.httpServer.address();
      if (!address || typeof address === 'string')
        throw new Error('No local HTTP server address');
      const browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      });
      try {
        for (const device of storeDevices)
          await captureDevice(
            browser,
            `http://127.0.0.1:${address.port}`,
            device,
            output,
          );
        const icon = drawAppArt(storeIcon.width, storeIcon.height, 20);
        await writeStorePng(output, storeIcon, icon);
        await captureFeatureGraphic(browser, output, icon);
      } finally {
        await browser.close();
      }
    } finally {
      await server.close();
    }
    await cp(output, resolve('store'), { recursive: true });
    console.log(
      `Generated ${storeDevices.length * storeScenes.length + 2} PNG files in store/`,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await generate();

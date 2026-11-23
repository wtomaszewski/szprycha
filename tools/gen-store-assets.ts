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
const trainingMap = /\/assets\/miasteczko-[^/]+\.tmj$/;

async function trainingSpawn(page: Page, x: number, y: number) {
  await page.unroute(trainingMap);
  await page.route(trainingMap, async (route) => {
    const response = await route.fetch();
    const map: {
      layers: {
        name: string;
        objects?: { name: string; x: number; y: number }[];
      }[];
    } = await response.json();
    const player = map.layers
      .find((layer) => layer.name === 'spawns')
      ?.objects?.find((object) => object.name === 'player');
    if (!player) throw new Error('Missing player spawn in training map');
    Object.assign(player, { x, y });
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
    await trainingSpawn(page, x, y);
    await menu();
    await button(pl.driving.title).click();
    await expect(canvas).toHaveAttribute('data-x', String(x));
  }

  async function save(scene: (typeof storeScenes)[number]) {
    const asset = storeScreenshot(device, scene);
    const buffer = await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
    });
    await writeStorePng(output, asset, buffer);
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
  const font = await readFile('assets/fonts/PixelifySans.ttf');
  const { width, height } = storeFeatureGraphic;
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.route('**/*', (route) => route.abort());
    await page.setContent(`
      <style>
        @font-face {
          font-family: Pixelify;
          src: url(data:font/ttf;base64,${font.toString('base64')});
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
          font-family: Pixelify, sans-serif;
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
          font-size: 56px;
          line-height: 1;
        }
        p {
          margin: 8px 0 0;
          color: #f4f4f4;
          font-size: 28px;
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

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { extname, resolve, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity, cityPin } from './city-picker';
import { readProfile } from './progress-profile';

test.use({ baseURL: 'http://127.0.0.1:4174' });

async function ride(page: Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-x', /\d+/);
  const position = () =>
    canvas.evaluate((el) => ({
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
    }));
  const before = await position();
  await page.keyboard.down('ArrowUp');
  try {
    await expect
      .poll(async () => {
        const { x, y } = await position();
        return Math.hypot(x - before.x, y - before.y);
      })
      .toBeGreaterThan(12);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
}

test('Chromium can install the build and play offline after the first visit', async ({
  page,
  context,
}) => {
  const requests: { origin: string; method: string }[] = [];
  context.on('request', (request) => {
    const { protocol, origin } = new URL(request.url());
    if (protocol === 'http:' || protocol === 'https:')
      requests.push({ origin, method: request.method() });
  });
  const canvas = page.locator('canvas');
  await page.goto('/');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await expect(page.locator('#pwa-splash')).toHaveCount(0);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByText(pl.pwaUpdate, { exact: true })).toBeHidden();

  const cdp = await context.newCDPSession(page);
  const { errors, parsed } = await cdp.send('Page.getAppManifest');
  expect(errors).toEqual([]);
  expect(parsed?.scope).toBe(new URL('/', page.url()).href);
  const { installabilityErrors } = await cdp.send(
    'Page.getInstallabilityErrors',
  );
  // Playwright uses an isolated incognito profile, where installing is disabled.
  expect(
    installabilityErrors.filter(({ errorId }) => errorId !== 'in-incognito'),
  ).toEqual([]);
  await cdp.detach();

  expect(
    await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = await caches.open(
        keys.find((key) => key.startsWith('szprycha-quiz:'))!,
      );
      return (await shell.keys()).map(({ url }) => new URL(url).pathname);
    }),
  ).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\/radio\/|\/(warszawa|wroclaw|krakow)-.*\.tmj$/),
    ]),
  );

  await context.setOffline(true);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page
    .getByRole('button', { name: pl.driving.title, exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-map', 'miasteczko');
  await ride(page);
  expect(requests.length).toBeGreaterThan(0);
  expect(
    requests.filter(
      ({ origin, method }) =>
        origin !== new URL(page.url()).origin || method !== 'GET',
    ),
  ).toEqual([]);
});

test('first loads only the chosen city and opens it offline after reloading', async ({
  page,
  context,
}) => {
  const mapRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('.tmj')) mapRequests.push(path);
  });
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.getByRole('button', { name: pl.cityPicker.freeRide }).click();
  await cityPin(page, 'warszawa').click();
  await expect(page.getByRole('alert')).toHaveText(pl.cityPicker.loadError);
  await expect(canvas).toHaveAttribute('data-scene', 'CityPicker');
  await context.setOffline(false);
  mapRequests.length = 0;
  await cityPin(page, 'warszawa').click();
  await expect(canvas).toHaveAttribute('data-map', 'warszawa');
  expect(mapRequests).toEqual([expect.stringMatching(/\/warszawa-.*\.tmj$/)]);
  await context.setOffline(true);
  await page.reload();
  await chooseCity(page, 'warszawa');
  await expect(canvas).toHaveAttribute('data-map', 'warszawa');
  await ride(page);
  expect(mapRequests).toHaveLength(1);
});

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

async function deployableBuild() {
  const root = resolve('dist');
  let updated = false;
  const nextVersion = '0000000000000074';
  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url!, 'http://localhost');
    if (pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' }).end();
      return;
    }
    const file = pathname === '/gra/' ? 'index.html' : pathname.slice(5);
    const path = resolve(root, file);
    if (!pathname.startsWith('/gra/') || !path.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      let content: string | Buffer = await readFile(path);
      if (updated && file === 'quiz-worker.js')
        content = content
          .toString()
          .replace(/"version":"[0-9a-f]+"/, `"version":"${nextVersion}"`);
      if (updated && file === 'index.html')
        content = content
          .toString()
          .replace('<html ', '<html data-release="next" ');
      response
        .writeHead(200, {
          'Content-Type':
            mimeTypes[extname(path)] ?? 'application/octet-stream',
        })
        .end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/gra/`,
    nextVersion,
    deploy: () => {
      updated = true;
    },
    close: () =>
      new Promise<void>((done) => {
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}

test('a waiting release leaves the current mission intact and retains the local profile', async ({
  page,
  context,
}, info) => {
  test.setTimeout(45_000);
  const build = await deployableBuild();
  try {
    await page.goto(build.url);
    await page.getByRole('button', { name: pl.tutorial.skip }).click();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await chooseCity(page, 'wroclaw', 'campaign');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-mission', 'WRO-T-01');
    await page
      .getByRole('dialog', { name: pl.dialogueUi.title })
      .getByRole('button', { name: pl.dialogueUi.skip })
      .click();
    await page.getByRole('button', { name: pl.missionUi.equip }).click();
    const saved = await readProfile(page);
    expect(saved.selectedCity).toBe('wroclaw');

    const updateNotice = page.getByText(pl.pwaUpdate, { exact: true });
    await expect(updateNotice).toBeHidden();
    build.deploy();
    // Register a revision-specific URL in the same scope to start installation.
    const script = new URL(
      `quiz-worker.js?release=${build.nextVersion}`,
      build.url,
    );
    await page.evaluate(async (scriptUrl) => {
      await navigator.serviceWorker.register(scriptUrl, {
        updateViaCache: 'none',
      });
    }, script.href);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          const waiting = registration?.waiting;
          return waiting && { state: waiting.state, script: waiting.scriptURL };
        }),
      )
      .toEqual({ state: 'installed', script: script.href });
    await expect(updateNotice).toBeVisible();
    await expect(canvas).toHaveAttribute('data-mission', 'WRO-T-01');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-release',
      'next',
    );
    await page.screenshot({ path: info.outputPath('74-pwa-aktualizacja.png') });
    await ride(page);
    await expect(canvas).toHaveAttribute('data-mission', 'WRO-T-01');
    const beforeRestart = await readProfile(page);

    await page.close();
    const restarted = await context.newPage();
    // Observe activation from the same origin, outside the worker's scope.
    await restarted.goto(new URL('/', build.url).href);
    await expect
      .poll(() =>
        restarted.evaluate(async (scope) => {
          const registration =
            await navigator.serviceWorker.getRegistration(scope);
          return {
            state: registration?.active?.state,
            script: registration?.active?.scriptURL,
            caches: (await caches.keys()).filter((key) =>
              key.startsWith('szprycha-quiz:'),
            ),
          };
        }, build.url),
      )
      .toEqual({
        state: 'activated',
        script: script.href,
        caches: [`szprycha-quiz:${build.url}:${build.nextVersion}`],
      });
    await context.setOffline(true);
    await restarted.goto(build.url);
    await expect(restarted.locator('html')).toHaveAttribute(
      'data-release',
      'next',
    );
    await expect(restarted.locator('canvas')).toHaveAttribute(
      'data-scene',
      'MainMenu',
    );
    expect(await readProfile(restarted)).toEqual(beforeRestart);
    await expect(
      restarted.getByText(pl.pwaUpdate, { exact: true }),
    ).toBeHidden();
    await restarted
      .getByRole('button', { name: pl.cityPicker.freeRide })
      .click();
    await expect(cityPin(restarted, 'wroclaw')).toBeFocused();
  } finally {
    await build.close();
  }
});

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';
import { expect, it } from 'vitest';
import { radioCatalog, radioPath, stations } from '../src/audio/radio/catalog';

async function checkPrecache(dist: string) {
  const worker = await readFile(join(dist, 'quiz-worker.js'), 'utf8');
  const header = /^const manifest = (.+);/m.exec(worker);
  expect(header).not.toBeNull();
  const precache: {
    files: string[];
    lazy: Record<string, string>;
    version: string;
  } = JSON.parse(header![1]!);
  const files = await readdir(dist, { recursive: true, withFileTypes: true });
  const published = files
    .filter((file) => file.isFile())
    .map((file) => join(file.parentPath, file.name).slice(dist.length + 1))
    .filter((file) => !['_headers', 'quiz-worker.js'].includes(file))
    .sort();
  expect(precache.version).toMatch(/^[0-9a-f]{16}$/);
  const teacherFiles = published.filter(
    (file) =>
      file === 'nauczyciel.html' || file.startsWith('assets/nauczyciel-'),
  );
  expect(teacherFiles).toEqual(
    expect.arrayContaining([
      'nauczyciel.html',
      expect.stringMatching(/^assets\/nauczyciel-.*\.js$/),
      expect.stringMatching(/^assets\/nauczyciel-.*\.css$/),
    ]),
  );
  const lazy = Object.keys(precache.lazy);
  expect([...precache.files, ...lazy].sort()).toEqual(
    published.filter((file) => !teacherFiles.includes(file)),
  );
  expect(precache.files).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^assets\/miasteczko-.*\.tmj$/),
    ]),
  );
  expect(lazy).toEqual(
    expect.arrayContaining(
      ['warszawa', 'wroclaw', 'krakow'].map((city) =>
        expect.stringMatching(new RegExp(`^assets/${city}-.*\\.tmj$`)),
      ),
    ),
  );
  expect(lazy.filter((file) => /\.(ogg|m4a)$/.test(file))).toEqual(
    published.filter((file) => /\.(ogg|m4a)$/.test(file)),
  );
  const broadcasts = stations.flatMap((station) =>
    (['jingle', ...radioCatalog[station].seeds] as const).map((seed) =>
      radioPath(station, seed),
    ),
  );
  expect(lazy.filter((file) => file.startsWith('assets/radio/'))).toEqual(
    broadcasts.sort(),
  );
  for (const file of lazy) {
    const digest = createHash('sha256')
      .update(await readFile(join(dist, file)))
      .digest('hex');
    expect(precache.lazy[file]).toBe(digest.slice(0, 16));
  }
  const teacherHtml = await readFile(join(dist, 'nauczyciel.html'), 'utf8');
  expect(teacherHtml).not.toContain('app.webmanifest');
  expect(teacherHtml).not.toContain('pwa-splash');
  expect(published).toEqual(
    expect.arrayContaining([
      'index.html',
      'data/content.json',
      'app.webmanifest',
      expect.stringMatching(/^assets\/index-.*\.js$/),
      expect.stringMatching(/^assets\/index-.*\.css$/),
      expect.stringMatching(/^assets\/rider-.*\.png$/),
      expect.stringMatching(/^assets\/PixelifySans-.*\.ttf$/),
      ...['miasteczko', 'warszawa', 'wroclaw', 'krakow'].map((city) =>
        expect.stringMatching(new RegExp(`^assets/${city}-.*\\.tmj$`)),
      ),
    ]),
  );

  const manifest = JSON.parse(
    await readFile(join(dist, 'app.webmanifest'), 'utf8'),
  );
  expect(manifest).toMatchObject({
    name: 'SZPRYCHA: Miejscy Kurierzy',
    short_name: 'SZPRYCHA',
    display: 'standalone',
    orientation: 'landscape',
    lang: 'pl',
    start_url: './',
    scope: './',
  });
  const palette = (await readFile('assets/palette.hex', 'utf8'))
    .trim()
    .split(/\s+/);
  expect(palette).toContain(manifest.theme_color);
  expect(palette).toContain(manifest.background_color);
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  );
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  expect(html).toContain('rel="manifest" href="./app.webmanifest"');
  expect(html).toContain(
    'rel="apple-touch-icon" href="./pwa/apple-touch-icon.png"',
  );
  expect(html).toContain('id="pwa-splash" src="./pwa/splash-1280x720.png"');
  const splashes = Array.from(
    html.matchAll(
      /rel="apple-touch-startup-image" href="\.\/(pwa\/splash-(\d+x\d+)\.png)"/g,
    ),
    ([, src, sizes]) => ({ src, sizes }),
  );
  expect(splashes).toHaveLength(6);
  const images: { src: string; sizes: string }[] = [
    ...manifest.icons,
    ...splashes,
    { src: 'pwa/apple-touch-icon.png', sizes: '180x180' },
    { src: 'pwa/splash-1280x720.png', sizes: '1280x720' },
  ];
  for (const { src, sizes } of images) {
    expect(precache.files).toContain(src);
    const { width, height } = PNG.sync.read(await readFile(join(dist, src)));
    expect(`${width}x${height}`).toBe(sizes);
  }
}

it('writes the noindex header, third-party notices and complete PWA cache to the web build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'szprycha-web-'));
  const dist = join(root, 'dist');

  try {
    await promisify(execFile)('npm', ['run', 'build', '--', '--outDir', dist], {
      timeout: 115000,
    });

    const headers = await readFile(join(dist, '_headers'), 'utf8');
    expect(headers).toMatch(
      /^\/\*\r?\n[ \t]+X-Robots-Tag: noindex[ \t]*\r?$/im,
    );
    const notices = await readFile(join(dist, 'THIRD_PARTY_NOTICES'), 'utf8');
    expect(notices).toContain('idb-keyval@6.3.0 (Apache-2.0)');
    expect(notices).toContain('Copyright 2016, Jake Archibald');
    expect(notices).toContain(
      'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
    );
    expect(notices).toMatch(/eventemitter3@[^ ]+ \(MIT\)/);
    expect(notices).toContain('Copyright (c) 2016, Mapbox');
    const fontLicense = await readFile('assets/fonts/OFL.txt', 'utf8');
    expect(notices).toContain(fontLicense.replace(/\r\n/g, '\n').trimEnd());
    expect(notices).not.toContain('lightningcss');

    const assets = join(dist, 'assets');
    const phaser = (await readdir(assets)).find((file) =>
      /^phaser-.*\.js$/.test(file),
    );
    expect(phaser).toBeDefined();
    const bundle = await readFile(join(assets, phaser!), 'utf8');
    expect(bundle).not.toContain('pathToVertices');
    await checkPrecache(dist);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);

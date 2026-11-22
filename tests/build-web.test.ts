import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('writes the noindex header and third-party notices to the web build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'szprycha-web-'));
  const dist = join(root, 'dist');

  try {
    await promisify(execFile)('npm', ['run', 'build', '--', '--outDir', dist], {
      timeout: 55000,
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

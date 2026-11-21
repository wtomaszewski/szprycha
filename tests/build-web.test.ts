import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('writes a site-wide noindex header to the web build', async () => {
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

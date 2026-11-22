import {
  mkdtemp,
  cp,
  symlink,
  readFile,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildContent, readContent, contentFiles } from '../tools/content';
import { contentSchema } from '../src/content/schemas';

describe('canonical content', () => {
  it('loads the canonical files and mission data', async () => {
    const content = await readContent();
    expect(contentFiles).toContain('wyzwania.yaml');
    expect(content.przepisy.przepisy.length).toBeGreaterThan(0);
    expect(content.znaki.znaki.length).toBeGreaterThanOrEqual(40);
    expect(content.pytania.pytania.length).toBeGreaterThanOrEqual(50);
    expect(content.osiagniecia.osiagniecia.length).toBeGreaterThan(0);
    expect(content.misje.some(({ id }) => id === 'WAW-T-01')).toBe(true);
  });
  it.each(['sign', 'question', 'achievement', 'nested achievement'])(
    'rejects unknown rule in %s',
    async (kind) => {
      const c = await readContent();
      if (kind === 'sign') c.znaki.znaki[0]!.reguly = ['MISSING-01'];
      if (kind === 'question') c.pytania.pytania[0]!.przepisy = ['MISSING-01'];
      if (kind === 'achievement')
        c.osiagniecia.osiagniecia[0]!.warunek = { good: 'MISSING-01', ile: 1 };
      if (kind === 'nested achievement')
        c.osiagniecia.osiagniecia[0]!.warunek = {
          all: [{ all: [{ good: 'MISSING-01', ile: 1 }] }],
        };
      expect(() => contentSchema.parse(c)).toThrow('Unknown rule ID');
    },
  );
  it('requires real practice rules, and unique templates', async () => {
    const c = await readContent();
    const first = c.wyzwania.wyzwania[0]!;
    c.wyzwania.wyzwania.push(first);
    expect(() => contentSchema.parse(c)).toThrow('Duplicate ID');
    c.wyzwania.wyzwania.pop();
    first.good = 'PP-01';
    expect(() => contentSchema.parse(c)).toThrow('Expected a simulated rule');
  });
  it('rejects duplicate rules, invalid answer indexes, bad balance and unknown fields', async () => {
    const c = await readContent();
    c.przepisy.przepisy.push(c.przepisy.przepisy[0]!);
    expect(() => contentSchema.parse(c)).toThrow('Duplicate ID');
    c.przepisy.przepisy.pop();
    c.pytania.pytania[0]!.poprawna = 99;
    expect(() => contentSchema.parse(c)).toThrow('Answer index');
    c.pytania.pytania[0]!.poprawna = 0;
    c.balans.licencja.teoria_prog = 80;
    expect(contentSchema.safeParse(c).success).toBe(false);
    expect(contentSchema.safeParse({ ...c, typo: true }).success).toBe(false);
  });
  it.each([
    {
      file: 'znaki.yaml',
      from: '[MAN-08]',
      to: '[MISSING-01]',
      message: 'Unknown rule ID: MISSING-01',
    },
    {
      file: 'dialogi/warszawa.yaml',
      from: 'dialogi.WAW-T-01.powitanie',
      to: 'dialogi.WAW-T-01.missing',
      message: 'Dialogue: missing translation dialogi.WAW-T-01.missing',
    },
    {
      file: 'misje/warszawa.yaml',
      from: 'limit_s: 90',
      to: 'limit_s: -1',
      message: 'Invalid mission content in warszawa.yaml',
    },
    {
      file: 'misje/warszawa.yaml',
      from: 'poi: tutorial_start',
      to: 'poi: missing_start',
      message: 'Mission WAW-T-01: unknown POI missing_start',
    },
    {
      file: 'misje/warszawa.yaml',
      from: 'misje.WAW-T-01.jazda',
      to: 'misje.WAW-T-01.missing',
      message: 'Mission WAW-T-01: missing translation misje.WAW-T-01.missing',
    },
  ])(
    'build rejects $to even with stale generated JSON',
    async ({ file, from, to, message }) => {
      const root = await mkdtemp(join(tmpdir(), 'szprycha-invalid-'));
      try {
        for (const entry of [
          'content',
          'src',
          'tools',
          'i18n',
          'assets',
          'maps',
          'index.html',
          'LICENSE',
          'package.json',
          'tsconfig.json',
          'vite.config.ts',
        ]) {
          await cp(entry, join(root, entry), { recursive: true });
        }
        await symlink(
          join(process.cwd(), 'node_modules'),
          join(root, 'node_modules'),
          'dir',
        );
        await buildContent(root);
        const source = join(root, 'content', file);
        await writeFile(
          source,
          (await readFile(source, 'utf8')).replace(from, to),
        );
        const result = spawnSync('npm', ['run', 'build'], {
          cwd: root,
          encoding: 'utf8',
          timeout: 25000,
        });
        expect(result.status).not.toBe(0);
        expect(result.stdout + result.stderr).toContain(message);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    30000,
  );
});

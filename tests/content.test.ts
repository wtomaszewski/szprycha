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
  it('loads all five files and validates every rule reference', async () => {
    const content = await readContent();
    expect(contentFiles).toHaveLength(5);
    expect(content.przepisy.przepisy.length).toBeGreaterThan(0);
    expect(content.znaki.znaki.length).toBeGreaterThanOrEqual(40);
    expect(content.pytania.pytania.length).toBeGreaterThanOrEqual(50);
    expect(content.osiagniecia.osiagniecia.length).toBeGreaterThan(0);
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
  it('npm run build fails for invalid content, even with a stale generated JSON', async () => {
    const root = await mkdtemp(join(tmpdir(), 'szprycha-invalid-'));
    try {
      for (const file of [
        'content',
        'src',
        'tools',
        'i18n',
        'assets',
        'index.html',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
      ]) {
        await cp(file, join(root, file), { recursive: true });
      }
      await symlink(
        join(process.cwd(), 'node_modules'),
        join(root, 'node_modules'),
        'dir',
      );
      await buildContent(root);
      const file = join(root, 'content/znaki.yaml');
      await writeFile(
        file,
        (await readFile(file, 'utf8')).replace('[MAN-08]', '[MISSING-01]'),
      );
      const result = spawnSync('npm', ['run', 'build'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 25000,
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain(
        'Unknown rule ID: MISSING-01',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30000);
});

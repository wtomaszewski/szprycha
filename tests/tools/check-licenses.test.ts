import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const checker = fileURLToPath(
  new URL('../../tools/check-licenses.ts', import.meta.url),
);

it.each([
  { license: 'MIT', status: 0 },
  { license: 'GPL-3.0-only', status: 1 },
  { license: undefined, status: 1 },
])(
  'checks nested production packages with license $license',
  ({ license, status }) => {
    const root = mkdtempSync(join(tmpdir(), 'szprycha-licenses-'));
    const manifest = (path: string, data: object) => {
      const file = join(root, path, 'package.json');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ version: '1.0.0', ...data }));
    };

    try {
      manifest('.', {
        name: 'fixture',
        license: 'UNLICENSED',
        dependencies: { runtime: '1.0.0' },
        devDependencies: { builder: '1.0.0' },
      });
      manifest('node_modules/runtime', {
        name: 'runtime',
        license: 'MIT',
        dependencies: { '@test/leaf': '1.0.0' },
        optionalDependencies: { 'platform-specific': '1.0.0' },
      });
      manifest('node_modules/runtime/node_modules/@test/leaf', {
        name: '@test/leaf',
        exports: { '.': './index.js' },
        license,
      });
      manifest('node_modules/@test/leaf', {
        name: '@test/leaf',
        version: '2.0.0',
        license: 'MIT',
      });
      manifest('node_modules/builder', {
        name: 'builder',
        license: 'MPL-2.0',
      });

      const result = spawnSync(
        process.execPath,
        ['--import', import.meta.resolve('tsx'), checker],
        { cwd: root, encoding: 'utf8' },
      );
      expect(result.status, result.stderr).toBe(status);
      expect(result.stdout).toContain(
        `@test/leaf@1.0.0: ${license ?? 'UNKNOWN'}`,
      );
      expect(result.stdout).not.toContain('@test/leaf@2.0.0');
      expect(result.stderr).toContain(
        'WARNING (development): builder@1.0.0: MPL-2.0',
      );
      if (status) {
        expect(result.stderr).toContain(
          `ERROR (production): @test/leaf@1.0.0: ${license ?? 'UNKNOWN'}`,
        );
      } else {
        expect(result.stderr).not.toContain('ERROR (production)');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);

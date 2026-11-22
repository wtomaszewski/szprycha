import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

export function quizOffline(): Plugin {
  return {
    name: 'quiz-offline',
    apply: 'build',
    async writeBundle({ dir }) {
      if (!dir) return;
      const assets = await readdir(join(dir, 'assets'), {
        recursive: true,
        withFileTypes: true,
      });
      const files = [
        'index.html',
        'data/content.json',
        ...assets
          .filter((asset) => asset.isFile())
          .map((asset) =>
            relative(dir, join(asset.parentPath, asset.name))
              .split(sep)
              .join('/'),
          )
          .sort(),
      ];
      const worker = await readFile(
        new URL('./quiz-worker.js', import.meta.url),
        'utf8',
      );
      const revision = createHash('sha256').update(worker);
      for (const file of files)
        revision.update(file).update(await readFile(join(dir, file)));
      const manifest = JSON.stringify({
        files,
        version: revision.digest('hex').slice(0, 16),
      });
      await writeFile(
        join(dir, 'quiz-worker.js'),
        `const manifest = ${manifest};\n${worker}`,
      );
    },
  };
}

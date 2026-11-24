import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const dir = resolve(process.argv[2] ?? 'dist');
const worker = 'quiz-worker.js';
const source = await readFile(join(dir, worker), 'utf8');
const declaration = /^const manifest = (.+);$/m.exec(source);
if (!declaration) throw new Error('Missing service worker manifest');
const manifest: { files: string[]; lazy?: Record<string, string> } = JSON.parse(
  declaration[1]!,
);

const entries = await readdir(dir, { recursive: true, withFileTypes: true });
const sizes = new Map(
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name);
        return [
          relative(dir, path).split(sep).join('/'),
          (await stat(path)).size,
        ] as const;
      }),
  ),
);
const sizeOf = (files: readonly string[]) =>
  files.reduce((bytes, file) => {
    const size = sizes.get(file);
    if (size === undefined) throw new Error(`Missing build file: ${file}`);
    return bytes + size;
  }, 0);
const precache = sizeOf(manifest.files);
const firstDownload = precache + sizeOf([worker]);
const dist = sizeOf([...sizes.keys()]);
const lazy = sizeOf(Object.keys(manifest.lazy ?? {}));
console.log(JSON.stringify({ dist, precache, firstDownload, lazy }, null, 2));
for (const [name, bytes, max] of [
  ['dist', dist, 60_000_000],
  ['firstDownload', firstDownload, 8_000_000],
] as const) {
  if (bytes > max) {
    console.error(`${name}: ${bytes} B > ${max} B`);
    process.exitCode = 1;
  }
}

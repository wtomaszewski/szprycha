import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const worker = 'quiz-worker.js';
const manifest = /^const manifest = (.*);$/m.exec(
  await readFile(join(dist, worker), 'utf8'),
);
if (!manifest) throw new Error('Cannot read the service worker manifest');
const { files, onDemand = [] } = JSON.parse(manifest[1]!) as {
  files: string[];
  onDemand?: string[];
};
const entries = await readdir(dist, { recursive: true, withFileTypes: true });
const bytes = new Map(
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async ({ parentPath, name }) => {
        const path = join(parentPath, name);
        return [path, (await stat(path)).size] as const;
      }),
  ),
);
const sum = (paths: string[]) =>
  paths.reduce((total, path) => {
    const size = bytes.get(join(dist, path.split('?')[0]!));
    if (size === undefined) throw new Error('Missing build file: ' + path);
    return total + size;
  }, 0);
const totals = [
  {
    name: 'dist',
    bytes: [...bytes.values()].reduce((a, b) => a + b, 0),
    limit: 40_000_000,
  },
  { name: 'precache', bytes: sum(files), limit: undefined },
  {
    name: 'first PWA download',
    bytes: sum([...new Set([...files, worker])]),
    limit: 8_000_000,
  },
  { name: 'on demand', bytes: sum(onDemand), limit: undefined },
];
console.table(totals);
if (totals.some(({ bytes, limit }) => limit !== undefined && bytes > limit))
  process.exitCode = 1;

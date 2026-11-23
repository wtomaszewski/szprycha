import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  radioCatalog,
  radioPath,
  stations,
} from '../../src/audio/radio/catalog.ts';

export const radioDirectory = fileURLToPath(
  new URL('../../assets/generated/radio', import.meta.url),
);

export const radioPrograms = stations.flatMap((station) =>
  (['jingle', ...radioCatalog[station].seeds] as const).map((seed) => {
    const path = radioPath(station, seed);
    return { station, seed, path, file: basename(path) };
  }),
);

export async function radioSourceHash() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sourceDirectory = 'src/audio/radio';
  const sources = (
    await readdir(join(root, sourceDirectory), { recursive: true })
  )
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `${sourceDirectory}/${file.replaceAll('\\', '/')}`);
  sources.push(
    'tools/radio/encode.ts',
    'tools/radio/files.ts',
    'tools/radio/generate.ts',
    'tools/radio/synthesize.ts',
  );
  const hash = createHash('sha256');
  for (const file of sources.sort()) {
    const source = await readFile(join(root, file), 'utf8');
    hash
      .update(file)
      .update('\0')
      .update(source.replaceAll('\r\n', '\n'))
      .update('\0');
  }
  return hash.digest('hex');
}

export async function radioFileHashes(directory: string) {
  const files: Record<string, string> = {};
  for (const { file } of radioPrograms) {
    const bytes = await readFile(join(directory, file));
    if (!bytes.length) throw new Error(`Empty radio asset: ${file}`);
    files[file] = createHash('sha256').update(bytes).digest('hex');
  }
  return files;
}

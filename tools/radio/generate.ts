import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { compose, stationJingle } from '../../src/audio/radio/compose.ts';
import { encodeTrack } from './encode.ts';
import {
  radioDirectory,
  radioFileHashes,
  radioPrograms,
  radioSourceHash,
} from './files.ts';
import { synthesizeScore } from './synthesize.ts';

const sourceHash = await radioSourceHash();
const parent = dirname(radioDirectory);
await mkdir(parent, { recursive: true });
const staging = await mkdtemp(join(parent, '.radio-'));
try {
  for (const { station, seed, file } of radioPrograms) {
    const score =
      seed === 'jingle' ? stationJingle(station) : compose(station, seed);
    await encodeTrack(
      synthesizeScore(score, seed === 'jingle' ? 0 : seed),
      join(staging, file),
    );
  }
  if ((await radioSourceHash()) !== sourceHash)
    throw new Error(
      'Radio sources changed during rendering. Run radio:generate again.',
    );

  const manifest = { sourceHash, files: await radioFileHashes(staging) };
  await writeFile(
    join(staging, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await rm(radioDirectory, { recursive: true, force: true });
  await rename(staging, radioDirectory);
  console.log(`Generated ${radioPrograms.length} radio assets.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}

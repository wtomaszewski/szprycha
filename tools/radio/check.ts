import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  radioDirectory,
  radioFileHashes,
  radioPrograms,
  radioSourceHash,
} from './files.ts';

try {
  const manifest = JSON.parse(
    await readFile(join(radioDirectory, 'manifest.json'), 'utf8'),
  );
  if (manifest?.sourceHash !== (await radioSourceHash()))
    throw new Error('Radio source hash differs from the manifest.');
  const files = await radioFileHashes(radioDirectory);
  if (!isDeepStrictEqual(manifest.files, files)) {
    const changed = new Set([
      ...Object.keys(files),
      ...Object.keys(manifest.files ?? {}),
    ]);
    const mismatches = [...changed].filter(
      (file) => files[file] !== manifest.files?.[file],
    );
    throw new Error(
      `Radio asset hashes differ from the manifest: ${mismatches.join(', ')}`,
    );
  }
  console.log(`Verified ${radioPrograms.length} radio assets.`);
} catch (error) {
  console.error(error);
  console.error(
    'Run npm run radio:generate and commit the updated radio assets and manifest.',
  );
  process.exitCode = 1;
}

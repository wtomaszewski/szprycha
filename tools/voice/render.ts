import { mkdir, mkdtemp, open, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAdapter, type VoiceAdapter } from './adapters.ts';
import { checkEncoder, encode } from './encode.ts';
import { readLines } from './lines.ts';
import {
  audioDirectory,
  formats,
  hash,
  manifestPath,
  readAudio,
  readManifest,
  writeManifest,
  type Manifest,
} from './manifest.ts';

export async function renderVoice(
  root: string,
  options: {
    lines: Manifest['lines'];
    adapter?: VoiceAdapter;
    encode: typeof encode;
    beforeRender?: () => Promise<void>;
    onRender?: (id: string) => void;
  },
) {
  const audio = audioDirectory(root);
  await mkdir(audio, { recursive: true });
  const lockPath = join(audio, '..', '.render.lock');
  const lock = await open(lockPath, 'wx').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
      throw new Error(
        'Inny proces voice:render używa assets/voice/.render.lock.',
      );
    },
  );
  try {
    const manifest = await readManifest(root);
    manifest.lines = options.lines;
    for (const id of Object.keys(manifest.recorded))
      if (!Object.hasOwn(manifest.lines, id)) delete manifest.recorded[id];

    let rendered = 0;
    const { adapter } = options;
    if (adapter) {
      const work = await mkdtemp(join(audio, '..', '.render-'));
      try {
        for (const [id, line] of Object.entries(manifest.lines)) {
          const existing = manifest.recorded[id];
          const { provider, voiceId, model } = adapter.profile;
          if (
            existing?.hash === line.hash &&
            existing.provider === provider &&
            existing.voiceId === voiceId &&
            existing.model === model
          ) {
            const files = await Promise.all(
              formats.map(async (ext) => {
                const data = await readAudio(join(audio, `${id}.${ext}`));
                return data?.length && hash(data) === existing.files[ext];
              }),
            );
            if (files.every(Boolean)) continue;
          }

          if (!rendered) await options.beforeRender?.();
          options.onRender?.(id);
          try {
            const bytes = await options.encode(
              await adapter.synthesize(line.text),
              work,
            );
            const files = { ogg: hash(bytes.ogg), m4a: hash(bytes.m4a) };
            for (const ext of formats)
              await writeFile(join(work, `clip.${ext}`), bytes[ext]);
            for (const ext of formats)
              await rename(
                join(work, `clip.${ext}`),
                join(audio, `${id}.${ext}`),
              );
            manifest.recorded[id] = {
              hash: line.hash,
              ...adapter.profile,
              files,
            };
            await writeManifest(root, manifest);
          } catch (error) {
            throw new Error(
              `${id}: ${error instanceof Error ? error.message : 'błąd renderowania'}`,
              { cause: error },
            );
          }
          rendered++;
        }
      } finally {
        await rm(work, { recursive: true, force: true });
      }
    }
    await writeManifest(root, manifest);
    return { lines: Object.keys(manifest.lines).length, rendered };
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  async function main() {
    const args = process.argv.slice(2);
    const manifestOnly = args.length === 1 && args[0] === '--manifest-only';
    if (args.length && !manifestOnly)
      throw new Error('Użycie: npm run voice:render [-- --manifest-only]');
    const root = process.cwd();
    const { lines, rendered } = await renderVoice(root, {
      adapter: manifestOnly ? undefined : createAdapter(process.env),
      lines: await readLines(root),
      encode,
      beforeRender: checkEncoder,
      onRender: (id) => console.log(`Renderuję ${id}`),
    });
    console.log(
      `Lektor: ${lines} kwestii, wyrenderowano ${rendered}. Manifest: ${manifestPath(root)}`,
    );
  }
  void main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Błąd renderowania lektora.',
    );
    process.exitCode = 1;
  });
}

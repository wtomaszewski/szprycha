import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import {
  radioCatalog,
  radioPath,
  stations,
} from '../../src/audio/radio/catalog.ts';
import { compose, stationJingle } from '../../src/audio/radio/compose.ts';
import { encodeTrack } from './encode.ts';
import { synthesizeScore } from './synthesize.ts';

const programs = stations.flatMap((station) =>
  (['jingle', ...radioCatalog[station].seeds] as const).map((seed) => ({
    station,
    seed,
    path: radioPath(station, seed),
  })),
);
type Program = (typeof programs)[number];

// Content-addressed cache shared by dev, web, mobile and the audition export.
async function assetDirectory() {
  const inputs = await Promise.all(
    ['catalog', 'styles', 'compose']
      .map((file) =>
        readFile(new URL(`../../src/audio/radio/${file}.ts`, import.meta.url)),
      )
      .concat(
        ['synthesize', 'encode'].map((file) =>
          readFile(new URL(`./${file}.ts`, import.meta.url)),
        ),
      ),
  );
  const hash = createHash('sha256');
  for (const bytes of inputs) hash.update(bytes).update('\0');
  return resolve('node_modules/.cache/radio', hash.digest('hex').slice(0, 20));
}

let directory: Promise<string> | undefined;
const pending = new Map<string, Promise<Buffer>>();

export async function radioAsset({ station, seed, path }: Program) {
  const cached = resolve(await (directory ??= assetDirectory()), path);
  const existing = pending.get(cached);
  if (existing) return existing;
  const render = async () => {
    try {
      return await readFile(cached);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    await mkdir(dirname(cached), { recursive: true });
    const temporary = `${cached}.${randomUUID()}`;
    try {
      const score =
        seed === 'jingle' ? stationJingle(station) : compose(station, seed);
      await encodeTrack(
        synthesizeScore(score, seed === 'jingle' ? 0 : seed),
        temporary,
      );
      await rename(temporary, cached);
      return await readFile(cached);
    } finally {
      await rm(temporary, { force: true });
    }
  };
  const result = render().finally(() => pending.delete(cached));
  pending.set(cached, result);
  return result;
}

export function radioAssets(): Plugin {
  return {
    name: 'szprycha-radio',
    async generateBundle() {
      for (const program of programs)
        this.emitFile({
          type: 'asset',
          fileName: program.path,
          source: await radioAsset(program),
        });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (
          request.method !== 'GET' ||
          !request.url?.startsWith('/assets/radio/')
        )
          return next();
        const path = request.url.split('?', 1)[0];
        const program = programs.find((item) => '/' + item.path === path);
        if (!program) return next();
        try {
          const source = await radioAsset(program);
          response.setHeader('Content-Type', 'audio/mpeg');
          response.end(source);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

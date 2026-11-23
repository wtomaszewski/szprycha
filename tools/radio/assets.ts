import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { radioDirectory, radioPrograms } from './files.ts';

export function radioAssets(): Plugin {
  return {
    name: 'szprycha-radio',
    async generateBundle() {
      for (const program of radioPrograms)
        this.emitFile({
          type: 'asset',
          fileName: program.path,
          source: await readFile(join(radioDirectory, program.file)),
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
        const program = radioPrograms.find((item) => '/' + item.path === path);
        if (!program) return next();
        try {
          const source = await readFile(join(radioDirectory, program.file));
          response.setHeader('Content-Type', 'audio/mpeg');
          response.end(source);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

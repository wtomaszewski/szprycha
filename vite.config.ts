import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { buildContent } from './tools/content.ts';
import { validateMaps } from './tools/maps.ts';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'validated-game-content',
      async buildStart() {
        const content = await buildContent();
        await validateMaps(content.balans.silnik.kafel_m);
      },
      configureServer(server) {
        const watched = [resolve('content'), resolve('maps')];
        server.watcher.add(watched);
        server.watcher.on('all', (event, file) => {
          if (
            ['add', 'change', 'unlink'].includes(event) &&
            watched.some((dir) => file.startsWith(dir + '/'))
          ) {
            void server.restart();
          }
        });
      },
    },
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules\/phaser/ }],
        },
      },
    },
  },
});

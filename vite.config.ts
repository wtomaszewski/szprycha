import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { buildContent } from './tools/content.ts';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'validated-game-content',
      async buildStart() {
        await buildContent();
      },
      configureServer(server) {
        server.watcher.add(resolve('content'));
        server.watcher.on('all', (event, file) => {
          if (
            ['add', 'change', 'unlink'].includes(event) &&
            file.startsWith(resolve('content') + '/')
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

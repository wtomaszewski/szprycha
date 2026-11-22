import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildContent } from './tools/content.ts';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      manifest: false,
      injectRegister: 'script-defer',
      workbox: {
        globPatterns: [
          'index.html',
          'assets/*.{js,css,ttf}',
          'data/content.json',
        ],
      },
    }),
    {
      name: 'validated-game-content',
      async config(_config, { isPreview }) {
        if (!isPreview) await buildContent();
      },
      configureServer(server) {
        const watched = [resolve('content'), resolve('maps'), resolve('i18n')];
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

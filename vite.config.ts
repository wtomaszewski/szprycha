import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { buildThirdPartyNotices } from './tools/check-licenses.ts';
import { buildContent } from './tools/content.ts';
import { offlineApp } from './tools/offline.ts';

const noticesModule = 'virtual:third-party-notices';
const noticesId = '\0' + noticesModule;
let notices: string;

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    // This upstream distribution omits Matter.js and its bundled SVG helper.
    alias: [
      { find: /^phaser$/, replacement: 'phaser/dist/phaser-arcade-physics.js' },
    ],
  },
  plugins: [
    {
      name: 'third-party-notices',
      buildStart() {
        notices = buildThirdPartyNotices(process.cwd());
        if (mode === 'mobile')
          notices += '\n' + readFileSync('assets/licenses/mobile.txt', 'utf8');
      },
      resolveId(id) {
        if (id === noticesModule) return noticesId;
      },
      load(id) {
        if (id === noticesId)
          return `export default ${JSON.stringify(notices)};`;
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD_PARTY_NOTICES',
          source: notices,
        });
      },
    },
    {
      name: 'validated-game-content',
      async buildStart() {
        await buildContent();
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
    offlineApp(mode === 'mobile'),
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
}));

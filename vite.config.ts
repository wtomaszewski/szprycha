import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { buildRankingRules } from './tools/ranking-rules.ts';
import { rankingUrl } from './src/platform/parentZoneConfig.ts';
import { rankingVersions } from './src/rankings/versions.ts';
import { buildThirdPartyNotices } from './tools/check-licenses.ts';
import { buildOrderRoutes } from './tools/procedural-orders.ts';
import { buildContent } from './tools/content.ts';
import { offlineApp } from './tools/offline.ts';

const rankingModule = 'virtual:ranking-versions';
const noticesModule = 'virtual:third-party-notices';
const routesModule = 'virtual:procedural-routes';
const routesId = '\0' + routesModule;
const noticesId = '\0' + noticesModule;
let notices: string;

export default defineConfig(({ mode }) => {
  const url = rankingUrl(loadEnv(mode, process.cwd()).VITE_RANKING_URL);
  let gameContent: Awaited<ReturnType<typeof buildContent>>;
  return {
    base: './',
    resolve: {
      // This upstream distribution omits Matter.js and its bundled SVG helper.
      alias: [
        {
          find: /^phaser$/,
          replacement: 'phaser/dist/phaser-arcade-physics.js',
        },
      ],
    },
    plugins: [
      {
        name: 'third-party-notices',
        buildStart() {
          notices = buildThirdPartyNotices(process.cwd());
          if (mode === 'mobile')
            notices +=
              '\n' + readFileSync('assets/licenses/mobile.txt', 'utf8');
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
        name: 'ranking-versions',
        resolveId(id) {
          if (id === rankingModule) return '\0' + id;
        },
        async load(id) {
          if (id !== '\0' + rankingModule) return;
          const versions = url
            ? rankingVersions.parse(await buildRankingRules(process.cwd()))
            : undefined;
          return `export default ${JSON.stringify(versions)};`;
        },
      },
      {
        name: 'validated-game-content',
        async buildStart() {
          gameContent = await buildContent();
        },
        resolveId(id) {
          if (id === routesModule) return routesId;
        },
        async load(id) {
          if (id === routesId)
            return `export default ${JSON.stringify(await buildOrderRoutes(gameContent))};`;
        },
        configureServer(server) {
          const watched = [
            resolve('content'),
            resolve('maps'),
            resolve('i18n'),
          ];
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
      offlineApp(mode === 'mobile', url ? new URL(url).origin : undefined),
    ],
    build: {
      rolldownOptions: {
        input: {
          index: resolve('index.html'),
          ...(mode === 'mobile'
            ? {}
            : { nauczyciel: resolve('nauczyciel.html') }),
        },
        output: {
          codeSplitting: {
            groups: [{ name: 'phaser', test: /node_modules\/phaser/ }],
          },
        },
      },
    },
  };
});

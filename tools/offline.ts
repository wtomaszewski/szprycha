import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import pl from '../i18n/pl.json' with { type: 'json' };
import {
  appBackground,
  appIcons,
  appTheme,
  appleSplashes,
  appleTouchIcon,
  generateAppIcons,
  webSplash,
} from './app-icons.ts';

// Keep the M7b registration URL so installed copies update in place.
const workerFile = 'quiz-worker.js';
const manifestFile = 'app.webmanifest';

function loadOnDemand(file: string) {
  return (
    file.startsWith('assets/radio/') ||
    /^assets\/[^/]+\.(ogg|m4a)$/.test(file) ||
    /^assets\/(warszawa|wroclaw|krakow|gdansk)-[^/]+\.tmj$/.test(file)
  );
}

const localOrigin = "'self' capacitor://localhost";
function mobileContentPolicy(rankingOrigin?: string) {
  const connect = rankingOrigin
    ? localOrigin + ' ' + rankingOrigin
    : localOrigin;
  return [
    `default-src ${localOrigin}`,
    `connect-src ${connect}`,
    `style-src ${localOrigin} 'unsafe-inline'`,
    `img-src ${localOrigin} data: blob:`,
    `media-src ${localOrigin} data: blob:`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "worker-src 'none'",
  ].join('; ');
}

export function offlineApp(mobile = false, rankingOrigin?: string): Plugin {
  return {
    name: 'offline-app',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html, ctx) =>
        ctx.path.endsWith('/nauczyciel.html')
          ? html
          : {
              html: html.replace(
                '<body>',
                `<body>\n    <img id="pwa-splash" src="./${webSplash}" alt="" />`,
              ),
              tags: [
                ...(mobile
                  ? [
                      {
                        tag: 'meta',
                        attrs: {
                          'http-equiv': 'Content-Security-Policy',
                          content: mobileContentPolicy(rankingOrigin),
                        },
                        injectTo: 'head-prepend' as const,
                      },
                    ]
                  : []),
                {
                  tag: 'link',
                  attrs: { rel: 'manifest', href: `./${manifestFile}` },
                },
                {
                  tag: 'link',
                  attrs: { rel: 'icon', href: `./${appIcons[0]!.src}` },
                },
                {
                  tag: 'link',
                  attrs: {
                    rel: 'apple-touch-icon',
                    href: `./${appleTouchIcon}`,
                  },
                },
                ...appleSplashes.map(({ src, media }) => ({
                  tag: 'link',
                  attrs: {
                    rel: 'apple-touch-startup-image',
                    href: `./${src}`,
                    media,
                  },
                })),
              ],
            },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: manifestFile,
        source: JSON.stringify({
          id: './',
          name: `${pl.title}: ${pl.subtitle}`,
          short_name: pl.title,
          lang: 'pl',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'landscape',
          theme_color: appTheme,
          background_color: appBackground,
          icons: appIcons,
        }),
      });
      for (const asset of generateAppIcons())
        this.emitFile({ type: 'asset', ...asset });
    },
    async writeBundle({ dir }) {
      if (!dir) return;
      const entries = await readdir(dir, {
        recursive: true,
        withFileTypes: true,
      });
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
          relative(dir, join(entry.parentPath, entry.name))
            .split(sep)
            .join('/'),
        )
        .filter(
          (file) =>
            file !== workerFile &&
            file !== '_headers' &&
            file !== 'nauczyciel.html' &&
            !file.startsWith('assets/nauczyciel-'),
        )
        .sort();
      const worker = await readFile(
        new URL('./offline-worker.js', import.meta.url),
        'utf8',
      );
      const revision = createHash('sha256').update(worker);
      const lazy: Record<string, string> = {};
      for (const file of files) {
        const digest = createHash('sha256')
          .update(await readFile(join(dir, file)))
          .digest();
        revision.update(file).update('\0').update(digest);
        if (loadOnDemand(file))
          lazy[file] = digest.toString('hex').slice(0, 16);
      }
      const manifest = JSON.stringify({
        files: files.filter((file) => !Object.hasOwn(lazy, file)),
        lazy,
        version: revision.digest('hex').slice(0, 16),
      });
      await writeFile(
        join(dir, workerFile),
        `const manifest = ${manifest};\n${worker}`,
      );
    },
  };
}

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import {
  radioCatalog,
  radioPath,
  stations,
} from '../../src/audio/radio/catalog.ts';
import { compose } from '../../src/audio/radio/compose.ts';
import { radioAssets } from './assets.ts';
import { ffmpeg } from './encode.ts';
import { sampleRate } from './synthesize.ts';

const directory = resolve(process.argv[2] ?? 'test-results/radio-previews');
await mkdir(directory, { recursive: true });
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.cache/radio-preview-vite',
  optimizeDeps: { noDiscovery: true },
  server: { host: '127.0.0.1', port: 0 },
  plugins: [radioAssets()],
});
try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string')
    throw new Error('Radio preview server did not start');
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const page = await browser.newPage();
    await page.route(origin + '/', (route) =>
      route.fulfill({ body: '<!doctype html>', contentType: 'text/html' }),
    );
    await page.goto(origin);
    const manifest = [];
    for (const station of stations) {
      const seed = radioCatalog[station].seeds[0];
      const score = compose(station, seed);
      const chorus = score.sections.find(
        (section) => section.name === 'chorus',
      )!;
      const offset = (chorus.bar * 4 * 60) / score.bpm;
      const pcm = await page.evaluate(
        async ({ station, jingle, track, offset, sampleRate }) => {
          const { createRadioMix } = (await import(
            '/src/audio/radio/mix.ts' as string
          )) as typeof import('../../src/audio/radio/mix.ts');
          const context = new OfflineAudioContext(
            2,
            15 * sampleRate,
            sampleRate,
          );
          const mix = createRadioMix(context, context.destination);
          mix.setStation(station);
          const [ident, music] = await Promise.all(
            [jingle, track].map(async (path) => {
              const response = await fetch(path);
              if (!response.ok) throw new Error(`Cannot load ${path}`);
              return context.decodeAudioData(await response.arrayBuffer());
            }),
          );
          const opening = context.createBufferSource();
          opening.buffer = ident!;
          opening.connect(mix.input);
          opening.start();
          const excerpt = context.createBufferSource();
          const gain = context.createGain();
          const start = ident!.duration + 0.16;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(1, start + 0.04);
          gain.gain.setValueAtTime(1, 13.8);
          gain.gain.linearRampToValueAtTime(0, 14.6);
          excerpt.buffer = music!;
          excerpt.connect(gain).connect(mix.input);
          excerpt.start(start, offset);
          const master = await context.startRendering();
          const left = master.getChannelData(0);
          const right = master.getChannelData(1);
          const interleaved = new Float32Array(master.length * 2);
          for (let i = 0; i < master.length; i++) {
            interleaved[2 * i] = left[i]!;
            interleaved[2 * i + 1] = right[i]!;
          }
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () => resolve(String(reader.result).split(',')[1]!);
            reader.readAsDataURL(new Blob([interleaved.buffer]));
          });
        },
        {
          station,
          jingle: radioPath(station, 'jingle'),
          track: radioPath(station, seed),
          offset,
          sampleRate,
        },
      );

      const file = `${station}-${seed}.ogg`;
      await ffmpeg(
        [
          '-y',
          '-loglevel',
          'error',
          '-f',
          'f32le',
          '-ar',
          String(sampleRate),
          '-ac',
          '2',
          '-i',
          'pipe:0',
          '-c:a',
          'libopus',
          '-b:a',
          '64k',
          resolve(directory, file),
        ],
        Buffer.from(pcm, 'base64'),
      );
      manifest.push({ station, seed, file, seconds: 15 });
      console.log(file);
    }
    await writeFile(
      resolve(directory, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    );
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}

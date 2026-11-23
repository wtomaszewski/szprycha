import { expect, test, type Page } from '@playwright/test';
import questions from '../../content/pytania.json' with { type: 'json' };
import { chooseCity } from './city-picker';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { readProfile } from './progress-profile';
import { expectQuestionSign } from './question-dialog';

type MapView = { x: number; y: number; heading: number; night?: true };

async function startAt(page: Page, view: MapView) {
  await page.route(/\/wroclaw(?:-[^/]+)?\.tmj(?:\?|$)/, async (route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    const response = await route.fetch();
    const tiled = await response.json();
    const player = tiled.layers
      .find(({ name }: { name: string }) => name === 'spawns')
      .objects.find(({ name }: { name: string }) => name === 'player');
    player.x = view.x;
    player.y = view.y;
    player.properties.find(
      ({ name }: { name: string }) => name === 'heading',
    ).value = view.heading;
    if (view.night)
      tiled.properties.find(
        ({ name }: { name: string }) => name === 'dusk_at_s',
      ).value = 1;
    await route.fulfill({ response, json: tiled });
  });
}

async function openWroclaw(page: Page) {
  await page.goto('/');
  await chooseCity(page, 'wroclaw');
  const canvas = page.locator('canvas[data-map="wroclaw"]');
  await expect(canvas).toHaveAttribute('aria-label', pl.driving.wroclawTitle);
  return canvas;
}

test('opens Wrocław from the map of Poland and saves collected gnomes', async ({
  page,
}) => {
  // Start one short walk away from Dzwoneczek (3024, 2016).
  const spawn = { x: 3000, y: 2016, heading: 0 };
  await startAt(page, spawn);
  const canvas = await openWroclaw(page);
  await expect(canvas).toHaveAttribute('data-x', String(spawn.x));
  const collection = page.getByRole('status', { name: pl.driving.gnomes });
  await expect(collection).toHaveText(`${pl.driving.gnomes} 0/100`);
  await page.keyboard.press('KeyX');
  await expect(canvas).toHaveAttribute('data-walking', 'true');
  const quiz = page.getByRole('dialog', { name: pl.driving.gnomeQuestion });
  await expect(quiz).toBeHidden();
  try {
    await page.keyboard.down('ArrowUp');
    await expect(quiz).toBeVisible();
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(collection).toHaveText(`${pl.driving.gnomes} 0/100`);
  const question = questions.pytania[0]!;
  await expect(quiz).toContainText(question.pytanie);
  await expect(quiz.getByRole('img')).toHaveCount(0);
  await quiz
    .getByRole('button', {
      name: question.odpowiedzi[question.poprawna],
      exact: true,
    })
    .click();
  await quiz.getByRole('button', { name: pl.progression.continue }).click();
  await expect(collection).toHaveText(`${pl.driving.gnomes} 1/100`);
  await expect
    .poll(async () => (await readProfile(page)).gnomes)
    .toEqual(['dzwoneczek']);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.menu, exact: true })
    .click();
  await expect(page.locator('canvas[data-scene="MainMenu"]')).toBeVisible();
  await openWroclaw(page);
  await expect(collection).toHaveText(`${pl.driving.gnomes} 1/100`);
});

function silentRecording() {
  const sampleRate = 8000;
  const pcmBytes = 2 * (sampleRate / 10);
  const wav = Buffer.alloc(44 + pcmBytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); // PCM format chunk size
  wav.writeUInt16LE(1, 20); // PCM encoding
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); // bytes per sample
  wav.writeUInt16LE(16, 34); // bits per sample
  wav.write('data', 36);
  wav.writeUInt32LE(pcmBytes, 40);
  return wav;
}

for (const view of ['desktop', 'mobile'] as const) {
  test.describe(view, () => {
    if (view === 'mobile')
      test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

    test('shows Q028 with A-17 at a gnome before the narrator speaks', async ({
      page,
    }, info) => {
      const question = questions.pytania.find(({ id }) => id === 'Q028')!;
      const recordingPath = '/e2e-voice/pytania.Q028.pytanie.wav';
      // Supply a single clip independently of the developer's installed recordings.
      await page.route('**/src/audio/recordings.ts', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `export function recordingUrls({ id, text }) {
            return id === 'pytania.Q028.pytanie' && text === ${JSON.stringify(question.pytanie)}
              ? [${JSON.stringify(recordingPath)}]
              : [];
          }`,
        }),
      );
      let recordingRequested = false;
      await page.route(`**${recordingPath}`, (route) => {
        recordingRequested = true;
        return route.fulfill({
          contentType: 'audio/wav',
          body: silentRecording(),
        });
      });
      await page.addInitScript((recordingPath) => {
        const recordingBytes = new WeakSet<ArrayBuffer>();
        const fetchResource = window.fetch;
        window.fetch = async (input, init) => {
          const response = await fetchResource(input, init);
          if (new URL(response.url).pathname === recordingPath) {
            const readBytes = response.arrayBuffer.bind(response);
            response.arrayBuffer = async () => {
              const data = await readBytes();
              recordingBytes.add(data);
              return data;
            };
          }
          return response;
        };
        const recordings = new WeakSet<AudioBuffer>();
        const decode = AudioContext.prototype.decodeAudioData;
        AudioContext.prototype.decodeAudioData = async function (data) {
          const isRecording = recordingBytes.has(data);
          const buffer = await decode.call(this, data);
          if (isRecording) recordings.add(buffer);
          return buffer;
        };
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (
          when,
          offset,
          duration,
        ) {
          start.call(this, when, offset, duration);
          if (!this.buffer || !recordings.has(this.buffer)) return;
          const image = document.querySelector<HTMLImageElement>(
            '.control-question[open] .question-signs img[src$="/A-17.png"]',
          );
          const content = image?.closest('.question-prompt');
          document.documentElement.dataset.questionNarration =
            image?.naturalWidth === 64 &&
            content &&
            getComputedStyle(content).opacity === '1'
              ? 'with-image'
              : 'without-image';
        };
      }, recordingPath);
      // Start inside the interaction radius of the 28th gnome, which uses Q028.
      await startAt(page, { x: 3572, y: 2340, heading: 0 });
      let releaseImage!: () => void;
      const imageGate = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      await page.route('**/A-17.png', async (route) => {
        await imageGate;
        await route.continue();
      });
      const canvas = await openWroclaw(page);
      await expect(canvas).toHaveAttribute('data-x', '3572');

      const quiz = page.getByRole('dialog', { name: pl.driving.gnomeQuestion });
      const narration = page.locator('html[data-question-narration]');
      try {
        await page.keyboard.press('KeyX');
        await expect(quiz).toBeVisible();
        await expect(quiz.locator('.question-prompt')).toHaveCSS(
          'opacity',
          '0',
        );
        await expect(narration).toHaveCount(0);
        expect(recordingRequested).toBe(false);
      } finally {
        releaseImage();
      }
      await expectQuestionSign(quiz, 'A-17');
      await expect(quiz.locator('#control-question-prompt')).toHaveText(
        question.pytanie,
      );
      await expect(narration).toHaveAttribute(
        'data-question-narration',
        'with-image',
      );
      const path = info.outputPath(`92-${view}-krasnal-q028.png`);
      await page.screenshot({ path, animations: 'disabled' });
      await info.attach('Q028 — A-17', { path, contentType: 'image/png' });
    });
  });
}

const views = [
  { name: 'rynek', x: 2992, y: 2016, heading: 0 },
  { name: 'ostrow', x: 2736, y: 1352, heading: 0, night: true },
  { name: 'hala', x: 4808, y: 532, heading: 0 },
  { name: 'zoo', x: 4938, y: 2464, heading: 0 },
  { name: 'poludnie', x: 3518, y: 2868, heading: 0 },
  { name: 'sky-tower', x: 2550, y: 3140, heading: Math.PI },
  { name: 'zachod', x: 688, y: 722, heading: Math.PI },
  { name: 'bulwary', x: 2624, y: 1536, heading: -Math.PI / 2 },
] as const;

for (const view of views)
  test(`renders Wrocław — ${view.name}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await startAt(page, view);
    const canvas = await openWroclaw(page);
    await expect(canvas).toHaveAttribute('data-x', String(view.x));
    await expect(canvas).toHaveAttribute('data-y', String(view.y));
    if ('night' in view) {
      await page.keyboard.press('KeyL');
      await expect(canvas).toHaveAttribute('data-lighting', 'night');
      await expect(
        page.getByRole('img', { name: pl.rideHud.lightsOn }),
      ).toBeVisible();
    }
    const screenshot = info.outputPath(`m6c-${view.name}.png`);
    await page.screenshot({ path: screenshot });
    await info.attach(view.name, {
      path: screenshot,
      contentType: 'image/png',
    });
    expect(errors).toEqual([]);
  });

import { expect, test, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };
import { chooseCity } from './city-picker';

type AudioLog = {
  contexts: number;
  effects: number;
  notes: number;
  levels: number[];
  lines: { text: string; lang: string; voice: string; volume: number }[];
};

declare global {
  interface Window {
    audioLog: AudioLog;
  }
}

async function observeAudio(page: Page, speech: 'absent' | 'local' | 'remote') {
  await page.addInitScript((available) => {
    const log: AudioLog = {
      contexts: 0,
      effects: 0,
      notes: 0,
      levels: [],
      lines: [],
    };
    window.audioLog = log;
    window.AudioContext = class extends AudioContext {
      constructor() {
        super();
        log.contexts++;
      }
    };
    const effectStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
      log.effects++;
      effectStart.call(this, when, offset, duration);
    };
    const noteStart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when) {
      log.notes++;
      noteStart.call(this, when);
    };
    const gainTarget = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, time, constant) {
      log.levels.push(value);
      return gainTarget.call(this, value, time, constant);
    };
    if (available === 'absent') {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: undefined,
      });
    } else {
      const system = new EventTarget();
      const voice = { lang: 'pl-PL', localService: available === 'local' };
      Object.assign(system, {
        getVoices: () => [voice],
        cancel: () => {},
        speak: (line: SpeechSynthesisUtterance) => {
          log.lines.push({
            text: line.text,
            lang: line.lang,
            voice: line.voice!.lang,
            volume: line.volume,
          });
          queueMicrotask(() =>
            line.onend?.call(line, {} as SpeechSynthesisEvent),
          );
        },
      });
      Object.defineProperty(window, 'speechSynthesis', { value: system });
      class Utterance {
        constructor(readonly text: string) {}
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: Utterance,
      });
    }
  }, speech);
}

const log = (page: Page) => page.evaluate(() => window.audioLog);
const settings = (page: Page) =>
  page.getByRole('group', { name: pl.audio.settings });
const openSettings = (page: Page) =>
  page.getByRole('button', { name: pl.settings.title, exact: true }).click();

test('unlocks audio with a gesture, saves channel levels and station, and rides muted without Web Speech', async ({
  page,
}) => {
  await observeAudio(page, 'absent');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  expect(await log(page)).toMatchObject({ contexts: 0, effects: 0, notes: 0 });
  await openSettings(page);
  const music = settings(page).getByRole('slider', {
    name: pl.audio.music,
    exact: true,
  });
  const effects = settings(page).getByRole('slider', {
    name: pl.audio.effects,
    exact: true,
  });
  const voice = settings(page).getByRole('slider', {
    name: pl.audio.voice,
    exact: true,
  });
  const mute = settings(page).getByRole('checkbox', { name: pl.audio.muted });
  await expect(music).toHaveValue('60');
  await expect(
    settings(page).getByRole('checkbox', { name: pl.audio.readAloud }),
  ).toBeChecked();
  await music.fill('34');
  await effects.fill('45');
  await voice.fill('82');
  await settings(page).getByLabel(pl.audio.bell).selectOption('1');
  await page.getByRole('button', { name: pl.m5c.close, exact: true }).click();
  await chooseCity(page, 'warszawa');
  await expect.poll(async () => (await log(page)).notes).toBeGreaterThan(0);
  const previousEffects = (await log(page)).effects;
  await page.keyboard.down('f');
  await expect
    .poll(async () => (await log(page)).effects)
    .toBeGreaterThan(previousEffects);
  const afterBell = (await log(page)).effects;
  await page.keyboard.up('f');
  expect(afterBell).toBe(previousEffects + 1);
  expect((await log(page)).contexts).toBe(1);

  const radio = page.getByRole('button', {
    name: new RegExp(pl.audio.changeStation),
  });
  await expect(radio).toHaveAccessibleName(new RegExp(pl.audio.stations.hits));
  await radio.click();
  await expect(radio).toHaveAccessibleName(
    new RegExp(pl.audio.stations.boulevards),
  );
  await radio.click();
  await expect(radio).toHaveAccessibleName(new RegExp(pl.audio.stations.talk));
  await expect(page.locator('.radio-caption')).toHaveText(
    pl.audio.tipText.stop,
  );

  await page.keyboard.press('Escape');
  await page.getByText(pl.audio.settings, { exact: true }).first().click();
  await mute.check();
  await page.getByRole('button', { name: pl.driving.resume }).click();
  const mutedAudio = await log(page);
  const canvas = page.locator('canvas');
  const x = await canvas.getAttribute('data-x');
  const y = await canvas.getAttribute('data-y');
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => [
      await canvas.getAttribute('data-x'),
      await canvas.getAttribute('data-y'),
    ])
    .not.toEqual([x, y]);
  await page.keyboard.press('f');
  await page.keyboard.up('ArrowUp');
  expect(await log(page)).toMatchObject({
    notes: mutedAudio.notes,
    effects: mutedAudio.effects,
    lines: [],
  });

  await page.reload();
  await openSettings(page);
  await expect(music).toHaveValue('34');
  await expect(effects).toHaveValue('45');
  await expect(voice).toHaveValue('82');
  await expect(mute).toBeChecked();
  await expect(settings(page).getByLabel(pl.audio.bell)).toHaveValue('1');
  await expect(settings(page).getByLabel(pl.audio.station)).toHaveValue('talk');
  expect(errors).toEqual([]);
});

test('ducks radio during a dialogue and reads with the Polish system voice at the saved level', async ({
  page,
}) => {
  await observeAudio(page, 'local');
  await page.goto('/');
  await openSettings(page);
  await settings(page).getByRole('slider', { name: pl.audio.voice }).fill('40');
  await page.getByRole('button', { name: pl.m5c.close, exact: true }).click();
  await chooseCity(page, 'warszawa', 'campaign');
  const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
  await expect(dialogue).toBeVisible();
  await expect
    .poll(async () => (await log(page)).lines.length)
    .toBeGreaterThan(0);
  expect((await log(page)).lines[0]).toMatchObject({
    lang: 'pl-PL',
    voice: 'pl-PL',
    volume: 0.4,
  });
  await expect.poll(async () => (await log(page)).levels).toContain(0.6 * 0.26);
  await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect.poll(async () => (await log(page)).levels.at(-1)).toBe(0.6);

  const radio = page.getByRole('button', {
    name: new RegExp(pl.audio.changeStation),
  });
  await radio.click();
  await radio.click();
  await expect(page.locator('.radio-caption')).toHaveText(
    pl.audio.tipText.stop,
  );
  await expect
    .poll(async () => (await log(page)).lines.at(-1))
    .toEqual({
      text: pl.audio.tipText.stop,
      lang: 'pl-PL',
      voice: 'pl-PL',
      volume: 0.4,
    });
});

test('displays a dialogue with only a remote Polish voice available', async ({
  page,
}) => {
  await observeAudio(page, 'remote');
  await page.goto('/');
  await chooseCity(page, 'warszawa', 'campaign');
  const dialogue = page.getByRole('dialog', { name: pl.dialogueUi.title });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: pl.dialogueUi.next }).click();
  expect((await log(page)).lines).toEqual([]);
  await dialogue.getByRole('button', { name: pl.dialogueUi.skip }).click();
  await expect(dialogue).not.toBeVisible();
});

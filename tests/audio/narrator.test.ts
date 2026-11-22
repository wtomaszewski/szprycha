import { afterEach, expect, it, vi } from 'vitest';
import { Narrator } from '../../src/audio/Narrator';

const localVoice = { lang: 'pl-PL', localService: true };
const remoteVoice = { lang: 'pl-PL', localService: false };

function webSpeech(voices: (typeof localVoice)[]) {
  const web = Object.assign(new EventTarget(), {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(readonly text: string) {}
    },
  );
  return web as typeof web & SpeechSynthesis;
}

afterEach(() => vi.unstubAllGlobals());

it('prefers native speech even when the Web Speech voice list changes', async () => {
  const web = webSpeech([localVoice]);
  let finish!: () => void;
  const speaking = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const native = {
    speak: vi.fn(() => speaking),
    stop: vi.fn(async () => {}),
  };
  const narrator = new Narrator(web, new AbortController().signal, native);
  narrator.setVolume(0.4);
  narrator.read('lesson', 'Zatrzymaj się.');
  web.dispatchEvent(new Event('voiceschanged'));
  narrator.read('radio', 'Pora na radio.');

  expect(native.speak).toHaveBeenCalledExactlyOnceWith({
    text: 'Zatrzymaj się.',
    volume: 0.4,
  });
  expect(web.speak).not.toHaveBeenCalled();
  finish();
  await speaking;
  expect(web.speak).not.toHaveBeenCalled();
});

it('falls back to a local Polish Web Speech voice if native speech fails', async () => {
  const web = webSpeech([remoteVoice, localVoice]);
  const native = {
    speak: vi.fn(async () => {
      throw new Error('No installed voice');
    }),
    stop: vi.fn(async () => {}),
  };
  const narrator = new Narrator(web, new AbortController().signal, native);
  narrator.read('dialogue', 'Cześć!');
  await vi.waitFor(() =>
    expect(web.speak).toHaveBeenCalledWith(
      expect.objectContaining({
        voice: localVoice,
        text: 'Cześć!',
        lang: 'pl-PL',
      }),
    ),
  );
});

it('never starts a remote voice or falls back after the cue has been cancelled', async () => {
  const web = webSpeech([remoteVoice]);
  let fail!: (err: Error) => void;
  const first = new Promise<void>((_resolve, reject) => {
    fail = reject;
  });
  const native = {
    speak: vi.fn(() => first),
    stop: vi.fn(async () => {}),
  };
  const narrator = new Narrator(web, new AbortController().signal, native);
  narrator.read('dialogue', 'Cześć!');
  narrator.stop('dialogue');
  fail(new Error('Cancelled'));
  await first.catch(() => {});
  expect(native.stop).toHaveBeenCalledOnce();
  expect(web.getVoices).not.toHaveBeenCalled();

  narrator.read('lesson', 'Zatrzymaj się.');
  await vi.waitFor(() => expect(web.getVoices).toHaveBeenCalled());
  expect(web.speak).not.toHaveBeenCalled();
});

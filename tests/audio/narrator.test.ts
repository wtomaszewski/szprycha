import { afterEach, expect, it, vi } from 'vitest';
import { Narrator } from '../../src/audio/Narrator';

function player() {
  const gain = { gain: { value: 1 }, connect: vi.fn() };
  const source = {
    buffer: undefined as AudioBuffer | undefined,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };
  const buffer = {} as AudioBuffer;
  const onPlaying = vi.fn();
  const context = {
    createGain: () => gain,
    createBufferSource: vi.fn(() => source),
    decodeAudioData: vi.fn<(bytes: ArrayBuffer) => Promise<AudioBuffer>>(
      async () => buffer,
    ),
    destination: {},
  };
  const files: Record<string, string[]> = {
    line: ['./voice/line.ogg'],
    both: ['./voice/line.ogg', './voice/line.m4a'],
    missing: ['./voice/missing.ogg'],
    feedback: ['./voice/feedback.ogg'],
    radio: ['./voice/radio.ogg'],
    lesson: ['./voice/lesson.ogg'],
  };
  const narrator = new Narrator(
    context as unknown as AudioContext,
    onPlaying,
    ({ id }) => files[id] ?? [],
  );
  return { narrator, context, gain, source, buffer, onPlaying };
}

const bytes = new Uint8Array([1, 2, 3]);
const line = (id: string) => ({ id, text: 'Przykładowa kwestia.' });
afterEach(() => vi.unstubAllGlobals());

it('decodes and plays a local file at the selected volume and releases ducking when it ends', async () => {
  const fetcher = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(bytes),
  );
  vi.stubGlobal('fetch', fetcher);
  const { narrator, context, gain, source, buffer, onPlaying } = player();
  narrator.setVolume(0.4);
  narrator.read('dialogue', line('line'));
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce());

  expect(fetcher).toHaveBeenCalledWith('./voice/line.ogg', {
    signal: expect.any(AbortSignal),
  });
  expect(context.decodeAudioData).toHaveBeenCalledWith(bytes.buffer);
  expect(source.buffer).toBe(buffer);
  expect(source.connect).toHaveBeenCalledWith(gain);
  expect(gain.gain.value).toBe(0.4);
  expect(onPlaying.mock.calls).toEqual([[true]]);
  source.onended?.();
  expect(source.disconnect).toHaveBeenCalledOnce();
  expect(onPlaying.mock.calls).toEqual([[true], [false]]);
});

it('falls back to AAC when Opus decoding fails', async () => {
  const fetcher = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(bytes),
  );
  vi.stubGlobal('fetch', fetcher);
  const { narrator, context, source } = player();
  context.decodeAudioData.mockRejectedValueOnce(new Error('Unsupported Opus'));
  narrator.read('dialogue', line('both'));
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    './voice/line.ogg',
    './voice/line.m4a',
  ]);
});

it('stays silent for an unlisted or unavailable file without accessing system speech', async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
  const system = { speak: vi.fn(), getVoices: vi.fn() };
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('speechSynthesis', system);
  const { narrator, context, onPlaying } = player();

  narrator.read('lesson', line('unlisted'));
  expect(fetcher).not.toHaveBeenCalled();
  narrator.read('lesson', line('missing'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(fetcher).toHaveBeenCalledOnce();
  expect(context.createBufferSource).not.toHaveBeenCalled();
  expect(onPlaying).not.toHaveBeenCalled();
  expect(system.speak).not.toHaveBeenCalled();
  expect(system.getVoices).not.toHaveBeenCalled();
});

it('keeps the higher priority line and cancels an obsolete load on preemption', async () => {
  let finish!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const fetcher = vi
    .fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => new Response(bytes),
    )
    .mockReturnValueOnce(pending);
  vi.stubGlobal('fetch', fetcher);
  const { narrator, source, onPlaying } = player();
  narrator.read('feedback', line('feedback'));
  narrator.read('radio', line('radio'));
  expect(fetcher).toHaveBeenCalledOnce();
  narrator.read('lesson', line('lesson'));
  expect(fetcher.mock.calls[0]?.[1].signal?.aborted).toBe(true);
  finish(new Response(bytes));
  await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce());
  narrator.stop('feedback');
  expect(source.stop).not.toHaveBeenCalled();
  narrator.setVolume(0);
  expect(source.stop).toHaveBeenCalledOnce();
  expect(onPlaying.mock.calls).toEqual([[true], [false]]);
});

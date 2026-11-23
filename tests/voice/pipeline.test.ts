import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import pl from '../../i18n/pl.json';
import { readContent } from '../../tools/content';
import { createAdapter } from '../../tools/voice/adapters';
import { checkVoice } from '../../tools/voice/check';
import { collectLines } from '../../tools/voice/lines';
import { audioDirectory, hash, readManifest } from '../../tools/voice/manifest';
import { renderVoice } from '../../tools/voice/render';

it('extracts fixed lines by content keys and changes only the hash when a line is edited', async () => {
  const content = await readContent();
  const lines = collectLines(content, pl);
  const { id, pytanie, wyjasnienie } = content.pytania.pytania[0]!;
  const questionId = `pytania.${id}.pytanie`;
  expect(lines[questionId]).toEqual({ text: pytanie, hash: hash(pytanie) });
  expect(lines[`pytania.${id}.wyjasnienie`]?.text).toBe(wyjasnienie);
  expect(lines['audio.tipText.stop']?.text).toBe(pl.audio.tipText.stop);
  expect(lines['exam.rideIntro']?.text).toBe(pl.exam.rideIntro);
  expect(lines['missionResults.gloryVoice']?.text).toBe(
    pl.missionResults.gloryVoice,
  );
  expect(lines['przepisy.KASK-01.quiz']?.text).toBeTruthy();
  expect(lines['przepisy.KASK-01.feedback']?.text).toBeTruthy();
  expect(Object.keys(lines)).toEqual(Object.keys(lines).sort());
  expect(
    Object.values(lines).some(({ text }) => text.includes('{points}')),
  ).toBe(false);

  content.pytania.pytania[0]!.pytanie = `${pytanie} Zmiana.`;
  content.pytania.pytania.reverse();
  const edited = collectLines(content, pl);
  expect(Object.keys(edited)).toEqual(Object.keys(lines));
  expect(edited[questionId]?.hash).not.toBe(lines[questionId]?.hash);
  expect(edited['audio.tipText.stop']).toEqual(lines['audio.tipText.stop']);
});

it('sends ElevenLabs JSON and Azure escaped Polish SSML through mock HTTP', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const http = vi.fn<(url: URL, init: RequestInit) => Promise<Response>>(
    async () => new Response(bytes),
  );
  const elevenlabs = createAdapter(
    {
      VOICE_PROVIDER: 'elevenlabs',
      VOICE_ID: 'libraryVoice123',
      ELEVENLABS_API_KEY: 'test-key',
    },
    http,
  );
  expect(await elevenlabs.synthesize('Zażółć gęślą jaźń.')).toEqual(bytes);
  const [elevenUrl, elevenInit] = http.mock.calls[0]!;
  expect(elevenUrl.href).toBe(
    'https://api.elevenlabs.io/v1/text-to-speech/libraryVoice123?output_format=mp3_44100_128',
  );
  expect(new Headers(elevenInit.headers).get('xi-api-key')).toBe('test-key');
  expect(elevenInit).toMatchObject({
    method: 'POST',
    redirect: 'error',
    body: JSON.stringify({
      text: 'Zażółć gęślą jaźń.',
      model_id: 'eleven_multilingual_v2',
    }),
  });

  const azure = createAdapter(
    {
      VOICE_PROVIDER: 'azure',
      VOICE_ID: 'pl-PL-ZofiaNeural',
      AZURE_SPEECH_REGION: 'westeurope',
      AZURE_SPEECH_KEY: 'test-key',
    },
    http,
  );
  expect(await azure.synthesize('Kask & rower < 10')).toEqual(bytes);
  const [azureUrl, azureInit] = http.mock.calls[1]!;
  expect(azureUrl.href).toBe(
    'https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1',
  );
  const headers = new Headers(azureInit.headers);
  expect(headers.get('Ocp-Apim-Subscription-Key')).toBe('test-key');
  expect(headers.get('X-Microsoft-OutputFormat')).toBe(
    'riff-48khz-16bit-mono-pcm',
  );
  expect(azureInit.body).toContain(
    'xml:lang="pl-PL"><voice name="pl-PL-ZofiaNeural">Kask &amp; rower &lt; 10</voice>',
  );

  http.mockResolvedValueOnce(new Response('test-key', { status: 401 }));
  await expect(azure.synthesize('Cześć.')).rejects.toThrow(
    /^azure: API TTS zwróciło HTTP 401$/,
  );
  http.mockRejectedValueOnce(new Error('test-key'));
  await expect(elevenlabs.synthesize('Cześć.')).rejects.toThrow(
    /^elevenlabs: błąd połączenia z API TTS$/,
  );
  expect(() =>
    createAdapter({ VOICE_PROVIDER: 'elevenlabs', VOICE_ID: 'voice' }, http),
  ).toThrow(/ELEVENLABS_API_KEY/);
});

it('renders incrementally, preserving completed clips after failure and rebuilding changed or missing clips', async () => {
  const root = await mkdtemp(join(tmpdir(), 'szprycha-voice-'));
  try {
    const tracks = { ogg: new Uint8Array([1]), m4a: new Uint8Array([2]) };
    const adapter = {
      profile: { provider: 'azure' as const, voiceId: 'pl-PL-TestingNeural' },
      synthesize: vi.fn<(text: string) => Promise<Uint8Array>>(
        async () => new Uint8Array([3]),
      ),
    };
    const encode = vi.fn(async () => tracks);
    const beforeRender = vi.fn(async () => {});
    const lines = {
      'dialogue.first': {
        text: 'Pierwsza kwestia.',
        hash: hash('Pierwsza kwestia.'),
      },
      'dialogue.next': {
        text: 'Następna kwestia.',
        hash: hash('Następna kwestia.'),
      },
    };
    const options = { adapter, encode, lines, beforeRender };
    adapter.synthesize
      .mockResolvedValueOnce(new Uint8Array([3]))
      .mockRejectedValueOnce(new Error('HTTP 503'));
    await expect(renderVoice(root, options)).rejects.toThrow(/dialogue.next/);
    expect(
      (await readManifest(root)).recorded['dialogue.first']?.files,
    ).toEqual({
      ogg: hash(tracks.ogg),
      m4a: hash(tracks.m4a),
    });

    adapter.synthesize.mockClear();
    expect((await renderVoice(root, options)).rendered).toBe(1);
    expect(adapter.synthesize).toHaveBeenCalledExactlyOnceWith(
      lines['dialogue.next'].text,
    );
    beforeRender.mockClear();
    expect((await renderVoice(root, options)).rendered).toBe(0);
    expect(beforeRender).not.toHaveBeenCalled();

    lines['dialogue.first'] = {
      text: 'Zmieniona kwestia.',
      hash: hash('Zmieniona kwestia.'),
    };
    await rm(join(audioDirectory(root), 'dialogue.next.m4a'));
    expect((await renderVoice(root, options)).rendered).toBe(2);
    expect((await readManifest(root)).recorded['dialogue.first']?.hash).toBe(
      lines['dialogue.first'].hash,
    );

    expect((await checkVoice(root, lines)).issues.size).toBe(0);
    const edited = {
      ...lines,
      'dialogue.next': { text: 'Nowy tekst.', hash: hash('Nowy tekst.') },
    };
    await writeFile(
      join(audioDirectory(root), 'dialogue.first.ogg'),
      'corrupted',
    );
    const { issues, mib } = await checkVoice(root, edited);
    expect(issues.get('Manifest do odświeżenia')).toEqual(['dialogue.next']);
    expect(issues.get('Nieaktualne nagrania')).toEqual(['dialogue.next']);
    expect(issues.get('Pliki z niezgodnym lub brakującym hashem')).toEqual([
      'dialogue.first.ogg',
    ]);
    expect(mib).toBeGreaterThan(0);
    expect((await renderVoice(root, options)).rendered).toBe(1);

    await rm(join(audioDirectory(root), 'dialogue.first.m4a'));
    expect(
      (await checkVoice(root, lines)).issues.get('Brakujące lub puste pliki'),
    ).toEqual(['dialogue.first.m4a']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

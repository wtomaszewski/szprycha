import type { Recording } from './manifest.ts';

export type VoiceProfile = Pick<Recording, 'provider' | 'voiceId' | 'model'>;
export type VoiceAdapter = {
  profile: VoiceProfile;
  synthesize(text: string): Promise<Uint8Array>;
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  );

type FetchVoice = (url: URL, init: RequestInit) => Promise<Response>;

async function request(
  profile: VoiceProfile,
  fetcher: FetchVoice,
  url: URL,
  init: RequestInit,
) {
  const { provider } = profile;
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error(`${provider}: błąd połączenia z API TTS`);
  }
  if (!response.ok)
    throw new Error(`${provider}: API TTS zwróciło HTTP ${response.status}`);
  try {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length) return bytes;
  } catch {
    throw new Error(`${provider}: błąd pobierania audio`);
  }
  throw new Error(`${provider}: pusta odpowiedź audio`);
}

export function createAdapter(
  env: NodeJS.ProcessEnv,
  fetcher: FetchVoice = fetch,
): VoiceAdapter {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Ustaw zmienną środowiskową ${name}.`);
    return value;
  };
  const provider = required('VOICE_PROVIDER');
  if (provider !== 'elevenlabs' && provider !== 'azure')
    throw new Error('VOICE_PROVIDER musi mieć wartość elevenlabs albo azure.');
  const voiceId = required('VOICE_ID');

  if (provider === 'elevenlabs') {
    const key = required('ELEVENLABS_API_KEY');
    if (!/^[a-z0-9_-]+$/i.test(voiceId))
      throw new Error('Niepoprawny VOICE_ID.');
    const model = env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';
    const profile = { provider, voiceId, model } as const;
    const url = new URL(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    );
    url.searchParams.set('output_format', 'mp3_44100_128');
    return {
      profile,
      synthesize: (text) =>
        request(profile, fetcher, url, {
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({ text, model_id: model }),
        }),
    };
  }

  const key = required('AZURE_SPEECH_KEY');
  const region = required('AZURE_SPEECH_REGION');
  if (!/^[a-z0-9-]+$/.test(region))
    throw new Error('Niepoprawny AZURE_SPEECH_REGION.');
  if (!/^pl-PL-[a-z0-9-]+$/i.test(voiceId))
    throw new Error('VOICE_ID musi wskazywać polski głos Azure.');
  const profile = { provider, voiceId } as const;
  const url = new URL(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
  );
  return {
    profile,
    synthesize: (text) =>
      request(profile, fetcher, url, {
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm',
        },
        body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pl-PL"><voice name="${escapeXml(voiceId)}">${escapeXml(text)}</voice></speak>`,
      }),
  };
}

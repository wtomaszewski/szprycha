import { cacheAfterInstall } from '../platform/pwa';
import { recordingUrls } from './recordings';
import type { VoiceLine } from './voiceLines';

export type Reading = 'radio' | 'feedback' | 'lesson' | 'dialogue' | 'results';
const priority: Record<Reading, number> = {
  radio: 0,
  feedback: 1,
  lesson: 2,
  dialogue: 2,
  results: 2,
};

type Playback = {
  owner: Reading;
  abort: AbortController;
  source?: AudioBufferSourceNode;
};

export class Narrator {
  private request?: Playback;
  private readonly gain: GainNode;

  constructor(
    private readonly context: AudioContext,
    private readonly onPlaying: (playing: boolean) => void,
    private readonly findRecording = recordingUrls,
  ) {
    this.gain = context.createGain();
    this.gain.connect(context.destination);
  }

  setVolume(volume: number) {
    this.gain.gain.value = volume;
    if (!volume) this.stop();
  }

  read(owner: Reading, line: VoiceLine) {
    if (!this.gain.gain.value) return;
    if (this.request && priority[owner] < priority[this.request.owner]) return;
    this.stop();
    const urls = this.findRecording(line);
    if (!urls.length) return;
    const request = { owner, abort: new AbortController() };
    this.request = request;
    void this.start(request, urls);
  }

  stop(owner?: Reading) {
    const request = this.request;
    if (!request || (owner && request.owner !== owner)) return;
    this.request = undefined;
    request.abort.abort();
    if (request.source) {
      request.source.onended = null;
      request.source.stop();
      request.source.disconnect();
      this.onPlaying(false);
    }
  }

  private async start(request: Playback, urls: readonly string[]) {
    for (const url of urls) {
      if (this.request !== request) return;
      try {
        const uncontrolled = !navigator.serviceWorker?.controller;
        const response = await fetch(url, { signal: request.abort.signal });
        if (this.request !== request) return;
        if (!response.ok) continue;
        const buffer = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (this.request !== request) return;
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gain);
        source.onended = () => {
          if (this.request !== request) return;
          this.request = undefined;
          source.disconnect();
          this.onPlaying(false);
        };
        try {
          source.start();
        } catch {
          source.disconnect();
          continue;
        }
        if (uncontrolled) cacheAfterInstall([url]);
        request.source = source;
        this.onPlaying(true);
        return;
      } catch {
        // Safari can fall back to AAC if Opus could not be decoded.
      }
    }
    if (this.request === request) this.request = undefined;
  }
}

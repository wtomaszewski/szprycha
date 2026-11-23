import { radioCatalog, radioPath, type Station } from './radio/catalog';
import { cacheAfterInstall } from '../platform/pwa';
import { createRadioMix } from './radio/mix';

type Broadcast = {
  abort: AbortController;
  gain: GainNode;
  source?: AudioBufferSourceNode;
  tip?: number;
  preload?: number;
};

export class Radio {
  private readonly mix;
  private readonly nextTrack = new Map<Station, number>();
  private broadcast?: Broadcast;
  private readonly warmed = new Set<Station>();

  constructor(
    private readonly context: AudioContext,
    music: GainNode,
  ) {
    this.mix = createRadioMix(context, music);
  }

  tune(station: Station, onTip: () => void) {
    this.stop();
    this.mix.setStation(station);
    const gain = this.context.createGain();
    gain.connect(this.mix.input);
    const broadcast: Broadcast = { abort: new AbortController(), gain };
    this.broadcast = broadcast;
    void this.playStation(broadcast, station, onTip);
  }

  stop() {
    const broadcast = this.broadcast;
    if (!broadcast) return;
    this.broadcast = undefined;
    broadcast.abort.abort();
    window.clearTimeout(broadcast.tip);
    window.clearTimeout(broadcast.preload);
    if (!broadcast.source) {
      broadcast.gain.disconnect();
      return;
    }

    const now = this.context.currentTime;
    const fade = this.context.state === 'running' ? 0.025 : 0;
    broadcast.gain.gain.setValueAtTime(1, now);
    broadcast.gain.gain.linearRampToValueAtTime(0, now + fade);
    broadcast.source.stop(now + fade);
  }

  private async playStation(
    broadcast: Broadcast,
    station: Station,
    onTip: () => void,
  ) {
    const { signal } = broadcast.abort;
    const seeds = radioCatalog[station].seeds;
    let index = this.nextTrack.get(station) ?? 0;
    let next = this.load(station, seeds[index]!, signal);
    let jingle = await this.load(station, 'jingle', signal);
    if (jingle && !signal.aborted)
      await this.playJingle(broadcast, station, jingle, onTip);
    let failures = 0;

    while (!signal.aborted && failures < seeds.length) {
      const track = await next;
      if (signal.aborted) return;
      index = (index + 1) % seeds.length;
      this.nextTrack.set(station, index);
      const nextSeed = seeds[index]!;
      if (!track) {
        failures++;
        if (failures < seeds.length)
          next = this.load(station, nextSeed, signal);
        continue;
      }

      failures = 0;
      if (navigator.onLine && !this.warmed.has(station)) {
        this.warmed.add(station);
        // Let the ident and first track finish downloading before warming the playlist.
        cacheAfterInstall(
          (['jingle', ...seeds] as const).map((seed) =>
            radioPath(station, seed),
          ),
        );
      }
      // Defer the next decode so tuning starts with only the ident and current track.
      let preload: Promise<AudioBuffer | undefined> | undefined;
      broadcast.preload = window.setTimeout(
        () => {
          preload = this.load(station, nextSeed, signal);
        },
        Math.max(0, track.duration - 4) * 1000,
      );
      await this.play(broadcast, track);
      window.clearTimeout(broadcast.preload);
      if (signal.aborted) return;
      next = preload ?? this.load(station, nextSeed, signal);

      if (station === 'talk') {
        jingle ??= await this.load(station, 'jingle', signal);
        if (jingle && !signal.aborted)
          await this.playJingle(broadcast, station, jingle, onTip);
      }
    }
    if (!signal.aborted) this.stop();
  }

  private async load(
    station: Station,
    seed: number | 'jingle',
    signal: AbortSignal,
  ) {
    try {
      const response = await fetch(radioPath(station, seed), { signal });
      if (!response.ok) return undefined;
      const data = await response.arrayBuffer();
      if (!signal.aborted) return await this.context.decodeAudioData(data);
    } catch {
      // A retune aborts both fetches. A missing track is skipped.
    }
  }

  private async playJingle(
    broadcast: Broadcast,
    station: Station,
    jingle: AudioBuffer,
    onTip: () => void,
  ) {
    const done = this.play(broadcast, jingle);
    if (station === 'talk') broadcast.tip = window.setTimeout(onTip, 1150);
    await done;
    window.clearTimeout(broadcast.tip);
  }

  private play(broadcast: Broadcast, buffer: AudioBuffer) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(broadcast.gain);
    broadcast.source = source;
    return new Promise<void>((resolve) => {
      source.onended = () => {
        broadcast.source = undefined;
        source.disconnect();
        if (broadcast.abort.signal.aborted) broadcast.gain.disconnect();
        resolve();
      };
      source.start();
    });
  }
}

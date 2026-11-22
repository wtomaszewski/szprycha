import { bicycleBells, sampleRate, synthesize, type Effect } from './effects';
import { Narrator, type Reading } from './Narrator';
import { localizedVoiceLine, type VoiceLine } from './voiceLines';
import { Radio } from './Radio';
import {
  channelLevel,
  defaultAudio,
  type AudioSettings,
  type Station,
} from './settings';
import { ui } from '../core/presentation';

class GameAudio {
  private settings: Readonly<AudioSettings> = defaultAudio;
  private readonly lifetime = new AbortController();
  private context?: AudioContext;
  private effects?: GainNode;
  private music?: GainNode;
  private narrator?: Narrator;
  private radio?: Radio;
  private station?: Station;
  private activated = false;
  private riding = false;
  private ducked = false;
  private reading = false;
  private tipIndex = 0;
  private tipTimer?: number;
  private caption?: (text: string) => void;
  private readonly buffers = new Map<Effect, AudioBuffer>();
  private readonly playing = new Set<AudioBufferSourceNode>();
  private siren?: {
    source: AudioBufferSourceNode;
    gain: GainNode;
    level: number;
  };

  listen() {
    const { signal } = this.lifetime;
    const activate = (event: Event) => {
      if (!event.isTrusted) return;
      if (
        event instanceof KeyboardEvent &&
        (event.repeat ||
          ['Alt', 'Control', 'Meta', 'Shift', 'Escape'].includes(event.key))
      )
        return;
      if (
        event instanceof PointerEvent &&
        (event.type === 'pointerdown') !== (event.pointerType === 'mouse')
      )
        return;
      this.activate();
    };
    for (const event of ['pointerdown', 'pointerup', 'keydown', 'click'])
      document.addEventListener(event, activate, { capture: true, signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.stopEffects();
          this.narrator?.stop();
        }
        this.syncRadio();
      },
      { signal },
    );
  }

  configure(settings: Readonly<AudioSettings>) {
    this.settings = settings;
    this.narrator?.setVolume(channelLevel(settings, 'voice'));
    this.updateMusic();
    if (this.effects)
      this.effects.gain.value = channelLevel(settings, 'effects');
    if (!channelLevel(settings, 'effects')) this.stopEffects();
    this.syncRadio();
  }

  setActivity(riding: boolean, ducked = false) {
    if (this.riding === riding && this.ducked === ducked) return;
    this.riding = riding;
    this.ducked = ducked;
    if (ducked) this.endTip();
    this.updateMusic();
    this.syncRadio();
  }

  setCaption(show?: (text: string) => void) {
    this.endTip();
    this.caption = show;
  }

  leave() {
    this.setActivity(false);
    this.setCaption();
    this.stopEffects();
    this.narrator?.stop();
  }

  destroy() {
    this.leave();
    this.lifetime.abort();
    if (this.context) void this.context.close().catch(() => undefined);
  }

  ringBell() {
    this.play(bicycleBells[this.settings.bell]);
  }

  get effectsAudible() {
    return (
      this.context?.state === 'running' &&
      !document.hidden &&
      channelLevel(this.settings, 'effects') > 0
    );
  }

  play(effect: Exclude<Effect, 'siren'>, volume = 1, delay = 0) {
    if (!this.effectsAudible) return;
    const source = this.source(effect);
    const gain = this.context!.createGain();
    gain.gain.value = volume * 0.38;
    source.connect(gain).connect(this.effects!);
    this.startEffect(source, gain, delay);
  }

  updateSiren(volume: number) {
    if (!this.effectsAudible || volume <= 0) {
      if (this.siren) this.siren.source.stop();
      this.siren = undefined;
      return;
    }
    const level = volume * 0.115;
    if (!this.siren) {
      const source = this.source('siren');
      const gain = this.context!.createGain();
      source.loop = true;
      source.connect(gain).connect(this.effects!);
      gain.gain.value = 0;
      this.startEffect(source, gain);
      this.siren = { source, gain, level: 0 };
    }
    if (Math.abs(level - this.siren.level) < 0.002) return;
    this.siren.level = level;
    this.siren.gain.gain.setTargetAtTime(
      level,
      this.context!.currentTime,
      0.075,
    );
  }

  read(owner: Reading, line: VoiceLine) {
    if (this.activated && !document.hidden) this.narrator?.read(owner, line);
  }

  stopReading(owner: Reading) {
    this.narrator?.stop(owner);
  }

  private activate() {
    if (!this.activated) {
      this.activated = true;
      if (typeof AudioContext === 'undefined') return;
      try {
        const context = (this.context = new AudioContext());
        this.music = context.createGain();
        this.effects = context.createGain();
        this.music.connect(context.destination);
        this.effects.connect(context.destination);
        this.radio = new Radio(context, this.music);
        this.narrator = new Narrator(context, (playing) => {
          this.reading = playing;
          this.updateMusic();
        });
        context.addEventListener('statechange', () => this.syncRadio(), {
          signal: this.lifetime.signal,
        });
        this.configure(this.settings);
      } catch {
        return;
      }
    }
    if (this.context && this.context.state !== 'running')
      void this.context.resume().catch(() => undefined);
  }

  private updateMusic() {
    if (!this.music) return;
    const gain = this.music.gain;
    const now = this.context!.currentTime;
    const target = channelLevel(
      this.settings,
      'music',
      this.ducked || this.reading,
    );
    gain.cancelScheduledValues(now);
    if (target) gain.setTargetAtTime(target, now, 0.08);
    else gain.setValueAtTime(0, now);
  }

  private syncRadio() {
    const station =
      this.riding &&
      !document.hidden &&
      this.context?.state === 'running' &&
      channelLevel(this.settings, 'music') > 0
        ? this.settings.station
        : undefined;
    if (station === this.station) return;
    this.station = station;
    this.endTip();
    if (station) this.radio!.tune(station, () => this.tip());
    else this.radio?.stop();
  }

  private tip() {
    if (this.ducked) return;
    const tips = ui.audio.tips;
    const { text } = tips[this.tipIndex++ % tips.length]!;
    const line = localizedVoiceLine(text);
    this.caption?.(line.text);
    this.read('radio', line);
    this.tipTimer = window.setTimeout(() => this.endTip(), 6500);
  }

  private endTip() {
    window.clearTimeout(this.tipTimer);
    this.tipTimer = undefined;
    this.caption?.('');
    this.stopReading('radio');
  }

  private source(effect: Effect) {
    const context = this.context!;
    let buffer = this.buffers.get(effect);
    if (!buffer) {
      const samples = synthesize(effect, 68);
      buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      this.buffers.set(effect, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  private startEffect(
    source: AudioBufferSourceNode,
    gain: GainNode,
    delay = 0,
  ) {
    this.playing.add(source);
    source.onended = () => {
      this.playing.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(this.context!.currentTime + delay);
  }

  private stopEffects() {
    this.siren = undefined;
    for (const source of this.playing) source.stop();
    this.playing.clear();
  }
}

export const audio = new GameAudio();

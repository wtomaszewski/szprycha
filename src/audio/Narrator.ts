export interface NativeSpeech {
  speak(options: { text: string; volume: number }): Promise<void>;
  stop(): Promise<void>;
}

export type Reading = 'radio' | 'feedback' | 'lesson' | 'dialogue' | 'results';
const priority: Record<Reading, number> = {
  radio: 0,
  feedback: 1,
  lesson: 2,
  dialogue: 2,
  results: 2,
};

export function polishVoice(voices: readonly SpeechSynthesisVoice[]) {
  return (
    voices.find(
      ({ localService, lang }) => localService && /^pl-pl$/i.test(lang),
    ) ??
    voices.find(
      ({ localService, lang }) => localService && /^pl(?:-|$)/i.test(lang),
    )
  );
}

export class Narrator {
  private request?: { owner: Reading; text: string };
  private utterance?: SpeechSynthesisUtterance;
  private nativeAttempt = false;
  private volume = 1;

  constructor(
    private readonly synthesis: SpeechSynthesis | undefined,
    signal: AbortSignal,
    private readonly native?: NativeSpeech,
  ) {
    synthesis?.addEventListener('voiceschanged', () => this.startWeb(), {
      signal,
    });
  }

  setVolume(volume: number) {
    if (volume === this.volume) return;
    this.volume = volume;
    // Web Speech takes the volume at the start of an utterance.
    if (!volume || this.utterance || this.nativeAttempt) this.stop();
    else this.startWeb();
  }

  read(owner: Reading, text: string) {
    if (!this.volume || !text.trim()) return;
    if (this.request && priority[owner] < priority[this.request.owner]) return;
    this.stop();
    this.request = { owner, text };
    if (this.native) void this.startNative(this.native, this.request);
    else this.startWeb();
  }

  stop(owner?: Reading) {
    if (!this.request || (owner && this.request.owner !== owner)) return;
    this.request = undefined;
    if (this.nativeAttempt) {
      this.nativeAttempt = false;
      void this.native?.stop().catch(() => {});
    }
    if (this.utterance) {
      this.utterance = undefined;
      this.synthesis?.cancel();
    }
  }

  private async startNative(
    native: NativeSpeech,
    request: NonNullable<Narrator['request']>,
  ) {
    this.nativeAttempt = true;
    try {
      await native.speak({ text: request.text, volume: this.volume });
      if (this.request === request) this.request = undefined;
    } catch {
      if (this.request === request) {
        this.nativeAttempt = false;
        this.startWeb();
      }
    } finally {
      if (!this.request || this.request === request) this.nativeAttempt = false;
    }
  }

  private startWeb() {
    if (!this.request || this.utterance || this.nativeAttempt || !this.volume)
      return;
    if (!this.synthesis) {
      this.request = undefined;
      return;
    }
    const voice = polishVoice(this.synthesis.getVoices());
    if (!voice) {
      // The initial list may be empty while the browser loads system voices.
      // The short-lived cues should only start while the text is current.
      if (priority[this.request.owner] < priority.lesson)
        this.request = undefined;
      return;
    }
    const line = new SpeechSynthesisUtterance(this.request.text);
    line.lang = 'pl-PL';
    line.voice = voice;
    line.volume = this.volume;
    this.utterance = line;
    line.onend = line.onerror = () => {
      if (this.utterance !== line) return;
      this.utterance = undefined;
      this.request = undefined;
    };
    this.synthesis.speak(line);
  }
}

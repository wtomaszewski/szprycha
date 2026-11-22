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
  private volume = 1;

  constructor(
    private readonly synthesis: SpeechSynthesis,
    signal: AbortSignal,
  ) {
    synthesis.addEventListener('voiceschanged', () => this.start(), { signal });
  }

  setVolume(volume: number) {
    if (volume === this.volume) return;
    this.volume = volume;
    // Web Speech takes the volume at the start of an utterance.
    if (!volume || this.utterance) this.stop();
    else this.start();
  }

  read(owner: Reading, text: string) {
    if (!this.volume || !text.trim()) return;
    if (this.request && priority[owner] < priority[this.request.owner]) return;
    this.stop();
    this.request = { owner, text };
    this.start();
  }

  stop(owner?: Reading) {
    if (!this.request || (owner && this.request.owner !== owner)) return;
    this.request = undefined;
    if (!this.utterance) return;
    this.utterance = undefined;
    this.synthesis.cancel();
  }

  private start() {
    if (!this.request || this.utterance || !this.volume) return;
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

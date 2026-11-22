import { scores, sequence, type TimedNote } from './score';
import type { Station } from './settings';

export class Radio {
  private readonly output: GainNode;
  private readonly playing = new Set<OscillatorNode>();
  private timer?: number;

  constructor(
    private readonly context: AudioContext,
    music: GainNode,
  ) {
    this.output = context.createGain();
    this.output.connect(music);
  }

  tune(station: Station, onTip: () => void) {
    this.stop();
    const { notes, duration } = sequence(scores[station]);
    const tipAt = (2 * 60) / scores[station].bpm;
    let start = this.context.currentTime + 0.045;
    let loop = 0;
    let next = 0;
    let tipPlayed = false;
    const tick = () => {
      const now = this.context.currentTime;
      if (now >= start + duration) {
        const elapsedLoops = Math.floor((now - start) / duration);
        start += elapsedLoops * duration;
        loop += elapsedLoops;
        next = 0;
        tipPlayed = false;
      }
      for (; next < notes.length; next++) {
        const note = notes[next]!;
        const at = start + note.start;
        if (at > now + 0.15) break;
        // A delayed JS timer must not replay a backlog of notes at once.
        if (at >= now - 0.04) this.play(note, Math.max(now, at));
      }
      if (
        station === 'talk' &&
        loop % 3 === 0 &&
        !tipPlayed &&
        now >= start + tipAt
      ) {
        tipPlayed = true;
        if (now < start + tipAt + 0.4) onTip();
      }
    };
    tick();
    this.timer = window.setInterval(tick, 45);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = undefined;
    const now = this.context.currentTime;
    for (const tone of this.playing) {
      tone.stop(now);
      tone.disconnect();
    }
    this.playing.clear();
  }

  private play(note: TimedNote, at: number) {
    const tone = this.context.createOscillator();
    const envelope = this.context.createGain();
    tone.type = note.wave;
    tone.frequency.value = note.hz;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(note.level, at + 0.009);
    envelope.gain.exponentialRampToValueAtTime(0.0002, at + note.duration);
    tone.connect(envelope).connect(this.output);
    this.playing.add(tone);
    tone.onended = () => {
      this.playing.delete(tone);
      tone.disconnect();
      envelope.disconnect();
    };
    tone.start(at);
    tone.stop(at + note.duration);
  }
}

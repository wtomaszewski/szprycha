import { localizedVoiceLine } from '../audio/voiceLines';
import { audio } from '../audio/GameAudio';
import type { ProgressStore } from '../core/progressStore';
import { setAudio } from './AudioControls';
import {
  portraitEmotions,
  type DialogueLine,
  type Dialogues,
} from '../content/dialogues';
import { translate, ui } from '../core/presentation';
import type { DailyClient } from '../gameplay/procedural/clients';
import { clientPortraitDesign } from '../render/dailyClientArt';
import { PixelTile } from '../render/PixelTile';
import { drawPortrait, portraitSize } from '../render/portraitArt';

type DisplayedLine = DialogueLine & {
  values?: Readonly<Record<string, string>>;
};

const portraits = import.meta.glob<string>(
  '../../assets/generated/portraits/*.png',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const holdMs = 550;

export class DialogueWindow {
  private readonly panel = document.createElement('dialog');
  private readonly portrait = document.createElement('span');
  private readonly generatedPortrait = document.createElement('canvas');
  private readonly speaker = document.createElement('strong');
  private readonly text = document.createElement('p');
  private readonly nextButton = document.createElement('button');
  private readonly voiceButton = document.createElement('button');
  private readonly scrollButton = document.createElement('button');
  private readonly names: Map<string, string>;
  private readonly resize = new ResizeObserver(() => this.updateScrollButton());
  private lines: readonly DisplayedLine[] = [];
  private client?: DailyClient;
  private index = 0;
  private done?: () => void;
  private hold?: number;
  private pointerHeld = false;
  private keyHeld = false;
  private padHeld = false;

  constructor(
    parent: HTMLElement,
    content: Dialogues,
    private readonly progress: ProgressStore,
  ) {
    this.names = new Map(
      content.postacie.map(({ id, nazwa }) => [id, translate(nazwa)]),
    );
    this.panel.className = 'game-dialog dialogue-window';
    this.panel.setAttribute('aria-label', ui.dialogueUi.title);
    const line = document.createElement('div');
    line.className = 'dialogue-line';
    line.setAttribute('aria-live', 'polite');
    line.setAttribute('aria-atomic', 'true');
    const speech = document.createElement('div');
    speech.className = 'dialogue-speech';
    this.portrait.className = 'dialogue-portrait';
    this.portrait.setAttribute('aria-hidden', 'true');
    this.generatedPortrait.width = this.generatedPortrait.height = portraitSize;
    this.text.className = 'dialogue-text';
    speech.append(this.speaker, this.text);
    line.append(this.portrait, speech);

    const actions = document.createElement('div');
    actions.className = 'dialogue-actions';
    const skip = document.createElement('button');
    this.nextButton.type =
      skip.type =
      this.voiceButton.type =
      this.scrollButton.type =
        'button';
    this.nextButton.textContent = ui.dialogueUi.next;
    this.nextButton.title = ui.dialogueUi.controls;
    skip.textContent = ui.dialogueUi.skip;
    this.voiceButton.textContent = ui.dialogueUi.voice;
    this.scrollButton.textContent = ui.dialogueUi.readMore;
    this.scrollButton.addEventListener('click', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.text;
      this.text.scrollTop =
        scrollTop >= scrollHeight - clientHeight ? 0 : scrollTop + clientHeight;
    });
    this.nextButton.addEventListener('click', () => this.advance());
    skip.addEventListener('click', () => this.finish());
    this.voiceButton.addEventListener('click', () => {
      setAudio(
        this.progress,
        'readAloud',
        !this.progress.profile.audio.readAloud,
      );
      this.speak();
    });
    actions.append(this.voiceButton, this.scrollButton, skip, this.nextButton);
    this.panel.append(line, actions);
    this.panel.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.finish();
    });

    this.nextButton.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      this.pointerHeld = true;
      this.nextButton.setPointerCapture(event.pointerId);
      this.startHold();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.nextButton.addEventListener(event, () => {
        if (!this.pointerHeld) return;
        this.pointerHeld = false;
        this.clearHold();
      });
    this.panel.addEventListener('keydown', (event) => {
      if (event.target !== this.nextButton) return;
      if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        event.preventDefault();
        this.text.scrollTop += event.code === 'ArrowDown' ? 24 : -24;
      }
      if (event.code !== 'Enter' && event.code !== 'Space') return;
      event.preventDefault();
      if (!event.repeat && !this.keyHeld) {
        this.keyHeld = true;
        this.startHold();
      }
    });
    this.panel.addEventListener('keyup', (event) => {
      if ((event.code !== 'Enter' && event.code !== 'Space') || !this.keyHeld)
        return;
      event.preventDefault();
      this.keyHeld = false;
      this.clearHold();
      this.advance();
    });
    this.nextButton.addEventListener('blur', () => {
      if (!this.keyHeld) return;
      this.keyHeld = false;
      this.clearHold();
    });
    this.resize.observe(this.text);
    this.panel.addEventListener('close', () => this.clearHold());
    parent.append(this.panel);
  }

  get open() {
    return this.panel.open;
  }

  show(
    lines: readonly DisplayedLine[],
    done: () => void,
    client?: DailyClient,
  ) {
    if (!lines.length) {
      done();
      return;
    }
    this.lines = lines;
    this.client = client;
    this.index = 0;
    this.done = done;
    this.panel.showModal();
    audio.stopReading('feedback');
    this.nextButton.focus();
    this.render();
  }

  gamepad(pressed: boolean, justPressed: boolean) {
    if (justPressed) {
      this.padHeld = true;
      this.startHold();
    } else if (this.padHeld && !pressed) {
      this.padHeld = false;
      this.clearHold();
      this.advance();
    }
  }

  scroll(direction: number) {
    this.text.scrollTop += direction * this.text.clientHeight;
  }

  skip() {
    this.finish();
  }

  destroy() {
    this.resize.disconnect();
    this.clearHold();
    audio.stopReading('dialogue');
    this.panel.close();
  }

  private startHold() {
    this.clearHold();
    this.hold = window.setTimeout(() => this.finish(), holdMs);
  }

  private clearHold() {
    window.clearTimeout(this.hold);
    this.hold = undefined;
  }

  private advance() {
    if (!this.open) return;
    this.index++;
    if (this.index === this.lines.length) this.finish();
    else this.render();
  }

  private finish() {
    if (!this.open) return;
    this.clearHold();
    this.pointerHeld = this.keyHeld = this.padHeld = false;
    audio.stopReading('dialogue');
    this.panel.close();
    const done = this.done;
    this.done = undefined;
    done?.();
  }

  private render() {
    const { postac, emocja, tekst, values } = this.lines[this.index]!;
    const client = this.client?.id === postac ? this.client : undefined;
    this.portrait.dataset.emotion = emocja;
    if (client) {
      const context = this.generatedPortrait.getContext('2d')!;
      const frame = context.createImageData(portraitSize, portraitSize);
      drawPortrait(new PixelTile(frame), emocja, clientPortraitDesign(client));
      context.putImageData(frame, 0, 0);
      this.portrait.style.backgroundImage = `url("${this.generatedPortrait.toDataURL()}")`;
      this.portrait.style.backgroundPositionX = '0px';
      this.speaker.textContent = client.name;
    } else {
      const image = portraits[`../../assets/generated/portraits/${postac}.png`];
      this.portrait.style.backgroundImage = `url("${image}")`;
      this.portrait.style.backgroundPositionX = `${-portraitSize * portraitEmotions.indexOf(emocja)}px`;
      this.speaker.textContent = this.names.get(postac) ?? '';
    }
    this.text.textContent = translate(tekst, values);
    this.text.scrollTop = 0;
    this.updateScrollButton();
    this.speak();
  }

  private updateScrollButton() {
    this.scrollButton.hidden = this.text.scrollHeight <= this.text.clientHeight;
  }

  private speak() {
    this.voiceButton.setAttribute(
      'aria-pressed',
      String(this.progress.profile.audio.readAloud),
    );
    const { tekst, lektor, values } = this.lines[this.index]!;
    audio.read('dialogue', localizedVoiceLine(lektor ?? tekst, values));
  }
}

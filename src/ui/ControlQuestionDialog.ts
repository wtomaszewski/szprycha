import { audio } from '../audio/GameAudio';
import { localizedVoiceLine, questionVoiceLine } from '../audio/voiceLines';
import olaPortrait from '../../assets/generated/portraits/sierzant_ola.png?url';
import { ui } from '../core/presentation';
import type { ControlQuestion } from '../progression/RoadAttention';
import { questionPrompt } from './SignIllustration';

export class ControlQuestionDialog {
  private readonly panel = document.createElement('dialog');
  private readonly prompt = document.createElement('p');
  private readonly question = document.createElement('div');
  private readonly answers = document.createElement('div');
  private readonly feedback = document.createElement('p');
  private readonly resume = document.createElement('button');
  private readonly intro = document.createElement('p');
  private buttons: HTMLButtonElement[] = [];

  constructor(
    parent: HTMLElement,
    private readonly answer: (
      index: number,
    ) => { correct: boolean; points: number } | undefined,
    private readonly onResume: () => void,
  ) {
    this.panel.className = 'game-dialog control-question';
    this.panel.setAttribute('aria-label', ui.progression.questionTitle);
    this.panel.setAttribute('aria-describedby', 'control-question-prompt');
    this.panel.addEventListener('cancel', (event) => event.preventDefault());

    const line = document.createElement('div');
    line.className = 'dialogue-line';
    const portrait = document.createElement('span');
    portrait.className = 'dialogue-portrait';
    portrait.style.backgroundImage = `url("${olaPortrait}")`;
    portrait.setAttribute('aria-hidden', 'true');
    const speech = document.createElement('div');
    speech.className = 'dialogue-speech';
    const speaker = document.createElement('strong');
    speaker.textContent = ui.dialogi.postacie.sierzant_ola;
    this.intro.textContent = ui.progression.olaIntro;
    this.prompt.id = 'control-question-prompt';
    this.prompt.className = 'control-question-prompt';
    this.prompt.tabIndex = -1;
    this.prompt.setAttribute('autofocus', '');
    this.panel.addEventListener('keydown', (event) => {
      if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return;
      event.preventDefault();
      if (!event.repeat && this.resume.hidden)
        this.focusAnswer(event.code === 'ArrowUp' ? -1 : 1);
    });
    speech.append(speaker, this.intro, this.question);
    line.append(portrait, speech);

    this.answers.className = 'control-question-answers';
    this.feedback.setAttribute('role', 'status');
    this.resume.type = 'button';
    this.resume.textContent = ui.progression.continue;
    this.resume.addEventListener('click', () => {
      this.close();
      this.onResume();
    });
    this.panel.append(line, this.answers, this.feedback, this.resume);
    parent.append(this.panel);
  }

  get open() {
    return this.panel.open;
  }

  show(
    question: Pick<
      ControlQuestion,
      'pytanie' | 'odpowiedzi' | 'wyjasnienie' | 'obrazek'
    > &
      (
        { id: string } | { voiceKeys: { pytanie: string; wyjasnienie: string } }
      ),
    choice?: (index: number) => { correct: boolean } | undefined,
    label = choice ? ui.missionUi.choice : ui.progression.questionTitle,
  ) {
    const voiceLine = (field: 'pytanie' | 'wyjasnienie') =>
      'voiceKeys' in question
        ? localizedVoiceLine(question.voiceKeys[field])
        : questionVoiceLine(question, field);
    this.panel.setAttribute('aria-label', label);
    this.intro.hidden = Boolean(choice);
    this.prompt.textContent = question.pytanie;
    const { element, illustrationReady } = questionPrompt(
      this.prompt,
      question.obrazek,
    );
    this.question.replaceChildren(element);
    this.answers.hidden = false;
    this.feedback.textContent = '';
    this.feedback.hidden = true;
    this.resume.hidden = true;
    this.buttons = question.odpowiedzi.map((text, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.addEventListener('click', () => {
        const result = choice ? choice(index) : this.answer(index);
        if (!result) return;
        this.answers.hidden = true;
        this.feedback.hidden = false;
        this.feedback.textContent =
          result.correct && 'points' in result
            ? `${ui.progression.wiseHead} +${result.points}`
            : question.wyjasnienie;
        audio.read(
          'lesson',
          result.correct && 'points' in result
            ? localizedVoiceLine('progression.wiseHead')
            : voiceLine('wyjasnienie'),
        );
        this.resume.hidden = false;
        this.resume.focus();
      });
      return button;
    });
    this.answers.replaceChildren(...this.buttons);
    this.panel.showModal();
    this.panel.scrollTop = 0;
    if (!illustrationReady) {
      audio.read('lesson', voiceLine('pytanie'));
    } else {
      void illustrationReady.then((ready) => {
        if (!ready) return;
        // Allow the visible question to paint before starting the narrator.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (this.open && element.isConnected && !this.answers.hidden)
              audio.read('lesson', voiceLine('pytanie'));
          }),
        );
      });
    }
  }

  gamepad(justPressed: (button: number) => boolean) {
    if (justPressed(0)) {
      const active = document.activeElement;
      if (active === this.resume && !this.resume.hidden) this.resume.click();
      else this.buttons.find((button) => button === active)?.click();
    } else if (this.resume.hidden) {
      if (justPressed(12)) this.focusAnswer(-1);
      else if (justPressed(13)) this.focusAnswer(1);
    }
  }

  private focusAnswer(direction: number) {
    const index = this.buttons.findIndex(
      (button) => button === document.activeElement,
    );
    const next =
      index === -1
        ? direction > 0
          ? 0
          : this.buttons.length - 1
        : Math.max(0, Math.min(index + direction, this.buttons.length - 1));
    this.buttons[next]?.focus();
  }

  close() {
    audio.stopReading('lesson');
    this.panel.close();
  }
}

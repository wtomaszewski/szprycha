import olaPortrait from '../../assets/generated/portraits/sierzant_ola.png?url';
import { ui } from '../core/presentation';
import type { ControlQuestion } from '../progression/RoadAttention';

export class ControlQuestionDialog {
  private readonly panel = document.createElement('dialog');
  private readonly prompt = document.createElement('p');
  private readonly answers = document.createElement('div');
  private readonly feedback = document.createElement('p');
  private readonly resume = document.createElement('button');
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
    const intro = document.createElement('p');
    intro.textContent = ui.progression.olaIntro;
    this.prompt.id = 'control-question-prompt';
    this.prompt.className = 'control-question-prompt';
    speech.append(speaker, intro, this.prompt);
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

  show(question: ControlQuestion) {
    this.prompt.textContent = question.pytanie;
    this.answers.hidden = false;
    this.feedback.textContent = '';
    this.feedback.hidden = true;
    this.resume.hidden = true;
    this.buttons = question.odpowiedzi.map((text, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.addEventListener('click', () => {
        const result = this.answer(index);
        if (!result) return;
        this.answers.hidden = true;
        this.feedback.hidden = false;
        this.feedback.textContent = result.correct
          ? `${ui.progression.wiseHead} +${result.points}`
          : question.wyjasnienie;
        this.resume.hidden = false;
        this.resume.focus();
      });
      return button;
    });
    this.answers.replaceChildren(...this.buttons);
    this.panel.showModal();
    this.buttons[0]?.focus();
  }

  gamepad(justPressed: (button: number) => boolean) {
    const choices = this.resume.hidden ? this.buttons : [this.resume];
    const index = choices.findIndex(
      (button) => button === document.activeElement,
    );
    if (justPressed(0)) choices[Math.max(0, index)]?.click();
    else if (justPressed(12)) choices[Math.max(0, index - 1)]?.focus();
    else if (justPressed(13))
      choices[Math.min(index + 1, choices.length - 1)]?.focus();
  }

  close() {
    this.panel.close();
  }
}

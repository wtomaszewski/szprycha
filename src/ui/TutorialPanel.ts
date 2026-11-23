import ola from '../../assets/generated/portraits/sierzant_ola.png?url';
import { ui } from '../core/presentation';
import {
  tutorialCanContinue,
  tutorialSteps,
  type TutorialStep,
} from '../gameplay/Tutorial';
import type { Scheme } from '../gameplay/bicycle';
import type { InputDevice } from './DrivingControls';

export type TutorialFeedback =
  'signalFirst' | 'turnNow' | 'missedLine' | 'retry' | 'resumeBrake';

export class TutorialPanel {
  readonly root = document.createElement('section');
  readonly next = document.createElement('button');
  private readonly skip = document.createElement('button');
  private readonly message = document.createElement('p');
  private readonly hint = document.createElement('p');
  private readonly progress = document.createElement('span');

  constructor(parent: HTMLElement, advance: () => void, skip: () => void) {
    this.root.className = 'tutorial-panel';
    this.root.setAttribute('aria-label', ui.tutorial.title);

    const portrait = document.createElement('span');
    portrait.className = 'dialogue-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    portrait.style.backgroundImage = `url("${ola}")`;

    const speech = document.createElement('div');
    const header = document.createElement('div');
    header.className = 'tutorial-heading';
    const coach = document.createElement('strong');
    coach.textContent = ui.dialogi.postacie.sierzant_ola;
    header.append(coach, this.progress);
    this.progress.setAttribute('aria-label', ui.tutorial.progress);

    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-atomic', 'true');
    live.append(this.message, this.hint);
    this.hint.className = 'tutorial-hint';

    const actions = document.createElement('div');
    actions.className = 'tutorial-actions';
    this.next.type = this.skip.type = 'button';
    this.next.addEventListener('click', advance);
    this.skip.textContent = ui.tutorial.skip;
    this.skip.addEventListener('click', skip);
    actions.append(this.next, this.skip);
    speech.append(header, live, actions);
    this.root.append(portrait, speech);
    parent.append(this.root);
  }

  show(
    step: TutorialStep,
    device: InputDevice,
    scheme: Scheme,
    feedback?: TutorialFeedback,
  ) {
    const entry = ui.tutorial.steps[step];
    const message = feedback ? ui.tutorial.feedback[feedback] : entry.text;
    if (this.message.textContent !== message)
      this.message.textContent = message;
    const hint =
      step === 'stop'
        ? ui.tutorial.stopControls[scheme][device]
        : ui.tutorial.steps[step][device];
    if (this.hint.textContent !== hint) this.hint.textContent = hint;
    if (this.root.dataset.step !== step) {
      this.root.dataset.step = step;
      this.progress.textContent = `${tutorialSteps.indexOf(step) + 1} / ${tutorialSteps.length}`;
      this.next.hidden = !tutorialCanContinue(step);
      this.next.textContent =
        step === 'finish' ? ui.tutorial.campaign : ui.tutorial.next;
      this.skip.textContent =
        step === 'finish' ? ui.driving.menu : ui.tutorial.skip;
    }
  }
}

export function tutorialHelp(
  pending: boolean,
  resume: () => void,
  replay: () => void,
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = ui.tutorial.help;
  button.setAttribute('aria-haspopup', 'dialog');

  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog tutorial-help';
  const title = document.createElement('h2');
  title.id = 'tutorial-help-title';
  title.textContent = ui.tutorial.help;
  dialog.setAttribute('aria-labelledby', title.id);
  const actions = document.createElement('div');
  const add = (text: string, action: () => void) => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.textContent = text;
    choice.addEventListener('click', action);
    actions.append(choice);
  };
  if (pending) add(ui.tutorial.resume, resume);
  add(ui.tutorial.replay, replay);
  add(ui.m5c.close, () => dialog.close());
  dialog.append(title, actions);
  button.addEventListener('click', () => dialog.showModal());
  return { button, dialog };
}

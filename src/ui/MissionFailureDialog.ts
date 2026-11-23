import { ui } from '../core/presentation';

export class MissionFailureDialog {
  private readonly dialog = document.createElement('dialog');
  private readonly title = document.createElement('h2');
  private readonly reason = document.createElement('p');
  private readonly tip = document.createElement('p');
  private readonly retry = document.createElement('button');
  private readonly exit = document.createElement('button');

  constructor(parent: HTMLElement, retry: () => void, exit: () => void) {
    const speaker = document.createElement('strong');
    speaker.textContent = ui.dialogi.postacie.sierzant_ola;
    const actions = document.createElement('div');
    actions.className = 'mission-failure-actions';
    for (const [button, label, action] of [
      [this.retry, ui.missionFailure.retry, retry],
      [this.exit, ui.missionFailure.exit, exit],
    ] as const) {
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      actions.append(button);
    }
    this.dialog.className = 'game-dialog mission-failure';
    this.title.id = 'mission-failure-title';
    this.title.className = 'mission-failure-stamp';
    this.title.tabIndex = -1;
    this.title.setAttribute('autofocus', '');
    this.reason.id = 'mission-failure-reason';
    this.tip.id = 'mission-failure-tip';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.dialog.setAttribute(
      'aria-describedby',
      `${this.reason.id} ${this.tip.id}`,
    );
    this.dialog.addEventListener('cancel', (event) => event.preventDefault());
    this.dialog.append(this.title, this.reason, speaker, this.tip, actions);
    parent.append(this.dialog);
  }

  get open() {
    return this.dialog.open;
  }

  show(reason: string, tip: string, gentle: boolean, reduced: boolean) {
    this.title.textContent = gentle
      ? ui.missionUi.failed
      : ui.missionFailure.title;
    this.reason.textContent = reason;
    this.tip.textContent = tip;
    this.dialog.toggleAttribute('data-gentle', gentle);
    this.dialog.toggleAttribute('data-reduced-effects', reduced);
    this.dialog.showModal();
  }

  gamepad(justPressed: (button: number) => boolean) {
    if (justPressed(0)) this.retry.click();
    else if (justPressed(1)) this.exit.click();
  }

  close() {
    this.dialog.close();
  }
}

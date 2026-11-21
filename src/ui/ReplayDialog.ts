import { ui } from '../core/presentation';

export class ReplayDialog {
  private readonly dialog = document.createElement('dialog');
  private readonly text = document.createElement('p');
  private readonly replay = document.createElement('button');
  private readonly retry = document.createElement('button');
  private readonly proceed = document.createElement('button');

  constructor(
    parent: HTMLElement,
    play: () => void,
    checkpoint: () => void,
    resume: () => void,
  ) {
    const title = document.createElement('h2');
    title.textContent = ui.replay.title;
    const speaker = document.createElement('strong');
    speaker.textContent = ui.dialogi.postacie.sierzant_ola;
    const actions = document.createElement('div');
    actions.className = 'replay-actions';
    for (const [button, text, action] of [
      [this.replay, ui.replay.play, play],
      [this.retry, ui.replay.retry, checkpoint],
      [this.proceed, ui.replay.resume, resume],
    ] as const) {
      button.type = 'button';
      button.textContent = text;
      button.addEventListener('click', action);
      actions.append(button);
    }
    this.dialog.className = 'game-dialog replay-dialog';
    this.dialog.setAttribute('aria-label', ui.replay.title);
    this.dialog.setAttribute('aria-describedby', 'replay-feedback');
    this.text.id = 'replay-feedback';
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!this.proceed.hidden) this.proceed.click();
    });
    this.dialog.append(title, speaker, this.text, actions);
    parent.append(this.dialog);
  }

  show(text: string, minor: boolean, canReplay: boolean, exhausted: boolean) {
    this.text.textContent = text;
    this.replay.hidden = !canReplay;
    this.retry.textContent = exhausted ? ui.missionUi.result : ui.replay.retry;
    this.proceed.hidden = !minor;
    this.setPlaying(false);
    this.dialog.showModal();
    (canReplay ? this.replay : this.retry).focus();
  }

  setPlaying(playing: boolean) {
    this.dialog.classList.toggle('replay-playing', playing);
    this.replay.setAttribute('aria-pressed', String(playing));
    this.replay.textContent = playing ? ui.replay.stop : ui.replay.play;
  }

  gamepad(pressed: (button: number) => boolean) {
    if (pressed(0)) (this.replay.hidden ? this.retry : this.replay).click();
    else if (pressed(1))
      (this.proceed.hidden ? this.retry : this.proceed).click();
    else if (pressed(2)) this.retry.click();
  }

  close() {
    this.dialog.close();
  }
}

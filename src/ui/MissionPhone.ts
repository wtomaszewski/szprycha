import type { MissionDefinition } from '../content/missions';
import { translate, ui } from '../core/presentation';

export class MissionPhone {
  readonly button = document.createElement('button');
  private readonly panel = document.createElement('dialog');
  private readonly closeButton = document.createElement('button');
  private readonly list = document.createElement('ul');
  private starts: HTMLButtonElement[] = [];

  constructor(
    parent: HTMLElement,
    toggle: () => void,
    private readonly start: (id: string) => void,
  ) {
    const enter = document.createElement('span');
    enter.className = 'phone-icon';
    enter.setAttribute('aria-hidden', 'true');
    this.button.type = 'button';
    this.button.className = 'phone-trigger';
    this.button.setAttribute('aria-label', ui.phone.open);
    this.button.setAttribute('aria-keyshortcuts', 'Tab M');
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.setAttribute('aria-controls', 'mission-phone');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.append(enter, ui.phone.title);
    this.button.addEventListener('click', toggle);

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'mission-phone-title';
    title.textContent = ui.phone.title;
    this.closeButton.type = 'button';
    this.closeButton.textContent = ui.phone.close;
    this.closeButton.addEventListener('click', () => this.close());
    header.append(title, this.closeButton);

    const heading = document.createElement('h3');
    heading.textContent = ui.phone.orders;
    this.panel.id = 'mission-phone';
    this.panel.className = 'game-dialog mission-phone';
    this.panel.setAttribute('aria-labelledby', title.id);
    this.panel.append(header, heading, this.list);
    this.panel.addEventListener('keydown', (event) => {
      if (event.code === 'KeyM') {
        event.preventDefault();
        if (!event.repeat) this.close();
      }
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        this.focusOrder(event.code === 'ArrowUp' ? -1 : 1);
      }
    });
    this.panel.addEventListener('close', () => {
      if (this.open) return;
      this.button.setAttribute('aria-expanded', 'false');
      if (document.activeElement === document.body && this.button.isConnected)
        this.button.focus();
    });
    parent.append(this.button, this.panel);
  }

  get open() {
    return this.panel.open;
  }

  show(orders: readonly MissionDefinition[], active: boolean) {
    this.starts = [];
    this.list.replaceChildren();
    for (const order of orders) {
      const item = document.createElement('li');
      const title = document.createElement('h4');
      title.textContent = translate(order.tytul);
      item.append(title);
      if (order.opis) {
        const description = document.createElement('p');
        description.textContent = translate(order.opis);
        item.append(description);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = ui.phone.start;
      button.setAttribute(
        'aria-label',
        `${ui.phone.start} · ${title.textContent}`,
      );
      button.disabled = active;
      button.addEventListener('click', () => this.start(order.id));
      item.append(button);
      this.list.append(item);
      if (!active) this.starts.push(button);
    }
    if (orders.length === 0 || active) {
      const message = document.createElement('li');
      message.textContent =
        orders.length === 0 ? ui.phone.empty : ui.phone.active;
      this.list.prepend(message);
    }
    this.panel.showModal();
    this.button.setAttribute('aria-expanded', 'true');
    (this.starts[0] ?? this.closeButton).focus();
  }

  focusOrder(direction: number) {
    if (!this.starts.length) return;
    const focused = this.starts.findIndex(
      (button) => button === document.activeElement,
    );
    const next =
      focused < 0
        ? 0
        : (focused + direction + this.starts.length) % this.starts.length;
    this.starts[next]?.focus();
  }

  activate() {
    const focused = document.activeElement;
    if (focused === this.closeButton) this.close();
    else this.starts.find((button) => button === focused)?.click();
  }

  close() {
    this.panel.close();
  }
}

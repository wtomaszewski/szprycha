import type { MissionDefinition } from '../content/missions';
import type { DailyOrder } from '../gameplay/procedural/orders';
import { translate, ui } from '../core/presentation';

type PhoneMode = 'available' | 'active' | 'tutorial';
export type PhoneStory = { order?: DailyOrder; finished?: boolean };

export class MissionPhone {
  readonly button = document.createElement('button');
  private readonly panel = document.createElement('dialog');
  private readonly closeButton = document.createElement('button');
  private readonly storyHeading = document.createElement('h3');
  private readonly storyList = document.createElement('ul');
  private readonly dailyHeading = document.createElement('h3');
  private readonly dailyList = document.createElement('ul');
  private readonly collection = document.createElement('p');
  private readonly list = document.createElement('ul');
  private starts: HTMLButtonElement[] = [];

  constructor(
    parent: HTMLElement,
    quickActions: HTMLElement,
    toggle: () => void,
    private readonly start: (id: string) => void,
  ) {
    const enter = document.createElement('span');
    enter.className = 'phone-icon';
    enter.setAttribute('aria-hidden', 'true');
    this.button.type = 'button';
    this.button.className = 'phone-trigger';
    this.button.setAttribute('aria-label', ui.phone.open);
    this.button.setAttribute('aria-keyshortcuts', 'M');
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.setAttribute('aria-controls', 'mission-phone');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.append(enter);
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
    this.storyHeading.textContent = ui.procedural.stories.heading;
    this.storyHeading.id = 'story-orders-title';
    this.storyList.setAttribute('aria-labelledby', this.storyHeading.id);
    this.dailyHeading.textContent = ui.procedural.heading;
    this.dailyHeading.id = 'daily-orders-title';
    this.dailyList.setAttribute('aria-labelledby', this.dailyHeading.id);
    this.panel.append(
      header,
      this.collection,
      this.storyHeading,
      this.storyList,
      this.dailyHeading,
      this.dailyList,
      heading,
      this.list,
    );
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
    quickActions.append(this.button);
    parent.append(this.panel);
  }

  get open() {
    return this.panel.open;
  }

  show(
    orders: readonly MissionDefinition[],
    mode: PhoneMode,
    daily: readonly DailyOrder[] = [],
    story?: PhoneStory,
    collection?: string,
  ) {
    this.collection.hidden = !collection;
    this.collection.textContent = collection ?? '';
    this.starts = [];
    this.list.replaceChildren();
    this.storyList.replaceChildren();
    this.storyHeading.hidden = this.storyList.hidden = !story;
    if (story?.order)
      this.addOrder(this.storyList, story.order.definition, mode, story.order);
    else if (story) {
      const message = document.createElement('li');
      message.textContent = story.finished
        ? ui.procedural.stories.allFinished
        : ui.procedural.stories.locked;
      this.storyList.append(message);
    }
    this.dailyList.replaceChildren();
    this.dailyHeading.hidden = this.dailyList.hidden = daily.length === 0;
    for (const order of daily)
      this.addOrder(this.dailyList, order.definition, mode, order);
    for (const order of orders) this.addOrder(this.list, order, mode);
    if (orders.length === 0 || mode !== 'available') {
      const message = document.createElement('li');
      message.textContent =
        mode === 'tutorial'
          ? ui.tutorial.phonePreview
          : orders.length === 0
            ? ui.phone.empty
            : ui.phone.active;
      this.list.prepend(message);
    }
    // A keyboard or gamepad shortcut has no focused trigger of its own.
    if (!document.querySelector('dialog:modal')) this.button.focus();
    this.panel.showModal();
    this.button.setAttribute('aria-expanded', 'true');
    (this.starts[0] ?? this.closeButton).focus();
  }

  private addOrder(
    list: HTMLUListElement,
    order: MissionDefinition,
    mode: PhoneMode,
    daily?: DailyOrder,
  ) {
    const item = document.createElement('li');
    const title = document.createElement('h4');
    title.textContent = translate(order.tytul, daily?.text);
    if (daily?.story) {
      const { template, step, total } = daily.story;
      const thread = document.createElement('p');
      thread.className = 'story-order-progress';
      thread.textContent = translate('procedural.stories.progress', {
        title: `procedural.stories.templates.${template}.title`,
        current: String(step + 1),
        total: String(total),
      });
      item.append(thread);
    }
    item.append(title);
    if (daily) {
      const { name, age, occupation, trait } = daily.client;
      const client = document.createElement('p');
      client.textContent = translate('procedural.clientProfile', {
        name,
        age: String(age),
        occupation,
        trait,
      });
      item.append(client);
    }
    if (order.opis) {
      const description = document.createElement('p');
      description.textContent = translate(order.opis, daily?.text);
      item.append(description);
    }
    list.append(item);
    if (mode === 'tutorial') return;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = ui.phone.start;
    button.setAttribute(
      'aria-label',
      `${ui.phone.start} · ${title.textContent}`,
    );
    button.disabled = mode === 'active';
    button.addEventListener('click', () => this.start(order.id));
    item.append(button);
    if (mode === 'available') this.starts.push(button);
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

  close() {
    this.panel.close();
  }
}

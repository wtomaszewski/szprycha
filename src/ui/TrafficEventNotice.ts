import { PhoneRing } from '../audio/PhoneRing';
import { ui } from '../core/presentation';
import type { TrafficEvents } from '../gameplay/TrafficEvents';

export class TrafficEventNotice {
  private readonly root = document.createElement('section');
  private readonly text = document.createElement('p');
  private readonly action = document.createElement('button');
  private displayed?: string;
  private readonly ring = new PhoneRing();
  private lastRing?: TrafficEvents['notice'];

  constructor(parent: HTMLElement, respond: () => void) {
    this.root.className = 'traffic-event';
    this.text.setAttribute('role', 'status');
    this.action.type = 'button';
    this.action.addEventListener('click', respond);
    this.root.append(this.text, this.action);
    this.root.hidden = true;
    parent.append(this.root);
  }

  destroy() {
    this.ring.destroy();
  }

  update(notice: TrafficEvents['notice'], answeredSafely: boolean) {
    const id = notice?.id;
    if (id === 'telefon_dzwoni' && notice !== this.lastRing) {
      this.lastRing = notice;
      if (!notice?.answered) this.ring.play();
    }
    const text =
      id === 'telefon_dzwoni' && notice?.answered
        ? answeredSafely
          ? ui.trafficEvents.accepted
          : ui.trafficEvents.phonePutAway
        : id === 'kolega_podwozka' && notice?.answered
          ? ui.trafficEvents.declined
          : id === 'polecenie_oli' && notice?.officerCleared
            ? ui.trafficEvents.olaRusza
            : id && ui.trafficEvents[id];
    if (this.displayed !== text) {
      this.text.textContent = text ?? '';
      this.displayed = text;
    }
    if (this.root.hidden === Boolean(notice)) this.root.hidden = !notice;
    const phone = id === 'telefon_dzwoni';
    const offer = id === 'kolega_podwozka';
    const hidden = !notice || notice.answered || (!phone && !offer);
    if (this.action.hidden !== hidden) this.action.hidden = hidden;
    if (!hidden) {
      const label = phone ? ui.trafficEvents.answer : ui.trafficEvents.decline;
      if (this.action.textContent !== label) this.action.textContent = label;
    }
  }
}

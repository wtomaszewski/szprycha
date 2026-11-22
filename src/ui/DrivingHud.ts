import { ui } from '../core/presentation';

export class DrivingHud {
  readonly timerSlot = document.createElement('div');
  private readonly score = document.createElement('div');
  private readonly radio = document.createElement('p');
  private readonly points = document.createElement('output');
  private readonly combo = document.createElement('output');
  private readonly attention = document.createElement('output');
  private readonly attentionValue = document.createElement('span');
  private readonly whistles: HTMLSpanElement[];
  private lastPoints?: number;
  private lastMultiplier?: number;
  private lastRecord?: number;
  private previousAttention = -1;
  private radioUntil = 0;

  private readonly equipment = document.createElement('span');
  private readonly lights = document.createElement('span');
  private readonly time = document.createElement('span');
  private readonly weather = document.createElement('span');
  constructor(
    parent: HTMLElement,
    details: HTMLElement,
    private readonly progressDetails: HTMLElement,
    private readonly maxAttention: number,
    private wasGlowing: boolean,
  ) {
    this.whistles = Array.from({ length: maxAttention }, () =>
      document.createElement('span'),
    );
    const left = document.createElement('div');
    left.className = 'ride-hud-left';
    const score = this.score;
    score.className = 'ride-hud-panel ride-score';
    score.classList.toggle('glowing', this.wasGlowing);
    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = ui.progression.points;
    this.points.setAttribute('aria-label', ui.progression.points);
    this.combo.setAttribute('aria-label', ui.progression.series);
    this.combo.title = ui.progression.series;
    score.append(pointsLabel, this.points, this.combo);

    const conditions = document.createElement('div');
    conditions.className = 'ride-hud-panel ride-status';
    details.classList.add('ride-hud-panel');
    for (const [element, icon] of [
      [this.equipment, 'helmet'],
      [this.lights, 'lights'],
      [this.time, 'day'],
      [this.weather, 'rain'],
    ] as const) {
      element.className = 'ride-status-icon';
      element.dataset.icon = icon;
      element.setAttribute('role', 'img');
      conditions.append(element);
    }
    left.append(score, conditions, details);

    const right = document.createElement('div');
    right.className = 'ride-hud-right';
    const alert = document.createElement('div');
    alert.className = 'ride-hud-panel ride-attention';
    const attentionLabel = document.createElement('span');
    attentionLabel.textContent = ui.progression.attention;
    this.attention.setAttribute('aria-label', ui.progression.attention);
    this.attention.setAttribute('aria-live', 'off');
    for (const whistle of this.whistles) {
      whistle.className = 'ride-whistle';
      whistle.setAttribute('aria-hidden', 'true');
      this.attention.append(whistle);
    }
    this.attention.append(this.attentionValue);
    alert.append(attentionLabel, this.attention);
    right.append(alert, this.timerSlot);
    for (const output of [this.points, this.combo])
      output.setAttribute('aria-live', 'off');
    this.radio.className = 'progression-radio';
    this.radio.setAttribute('role', 'status');
    this.radio.hidden = true;
    parent.prepend(left, right);
    parent.append(this.radio);
  }

  updateProgression(
    points: number,
    multiplier: number,
    record: number,
    glowing: boolean,
    attention: number,
    at: number,
  ) {
    if (points !== this.lastPoints) {
      this.points.textContent = String(points);
      this.lastPoints = points;
    }
    if (multiplier !== this.lastMultiplier) {
      this.combo.textContent = `×${multiplier}`;
      this.lastMultiplier = multiplier;
    }
    if (record !== this.lastRecord) {
      this.progressDetails.textContent = `${ui.progression.record} ${record}`;
      this.lastRecord = record;
    }
    if (attention !== this.previousAttention) {
      this.previousAttention = attention;
      this.attentionValue.textContent = `${attention}/${this.maxAttention}`;
      this.whistles.forEach((whistle, index) => {
        whistle.classList.toggle('active', index < attention);
      });
    }
    if (glowing !== this.wasGlowing) {
      this.score.classList.toggle('glowing', glowing);
      if (glowing) {
        this.radio.hidden = false;
        this.radio.textContent = ui.progression.dj;
        this.radioUntil = at + 3500;
      }
      this.wasGlowing = glowing;
    }
    if (!this.radio.hidden && (!glowing || at >= this.radioUntil))
      this.radio.hidden = true;
  }

  updateConditions(
    helmet: boolean,
    lights: boolean,
    night: boolean,
    rain: boolean,
  ) {
    this.setIcon(
      this.equipment,
      ui.rideHud[helmet ? 'helmetOn' : 'helmetOff'],
      helmet,
    );
    this.setIcon(
      this.lights,
      ui.rideHud[lights ? 'lightsOn' : 'lightsOff'],
      lights,
    );
    this.setIcon(this.time, ui.rideHud[night ? 'night' : 'day'], true);
    const icon = night ? 'night' : 'day';
    if (this.time.dataset.icon !== icon) this.time.dataset.icon = icon;
    if (this.weather.hidden === rain) this.weather.hidden = !rain;
    this.setIcon(this.weather, ui.rideHud.rain, true);
  }

  private setIcon(element: HTMLElement, label: string, active: boolean) {
    if (element.title === label) return;
    element.title = label;
    element.setAttribute('aria-label', label);
    element.classList.toggle('active', active);
  }
}

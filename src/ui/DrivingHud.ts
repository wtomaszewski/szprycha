import { ui } from '../core/presentation';

export interface DrivingHudStats {
  points: number;
  combo: number;
  attention: number;
}

export class DrivingHud {
  readonly timerSlot = document.createElement('div');
  private readonly points = document.createElement('output');
  private readonly combo = document.createElement('output');
  private readonly attention = document.createElement('output');
  private readonly attentionValue = document.createElement('span');
  private readonly whistles = Array.from({ length: 3 }, () =>
    document.createElement('span'),
  );
  private readonly equipment = document.createElement('span');
  private readonly lights = document.createElement('span');
  private readonly time = document.createElement('span');
  private readonly weather = document.createElement('span');
  private previousAttention = -1;

  constructor(parent: HTMLElement, details: HTMLElement) {
    const left = document.createElement('div');
    left.className = 'ride-hud-left';
    const score = document.createElement('div');
    score.className = 'ride-hud-panel ride-score';
    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = ui.rideHud.points;
    this.points.setAttribute('aria-label', ui.rideHud.points);
    this.combo.setAttribute('aria-label', ui.rideHud.combo);
    this.combo.title = ui.rideHud.combo;
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
    attentionLabel.textContent = ui.rideHud.attention;
    this.attention.setAttribute('aria-live', 'off');
    for (const whistle of this.whistles) {
      whistle.className = 'ride-whistle';
      whistle.setAttribute('aria-hidden', 'true');
      this.attention.append(whistle);
    }
    this.attentionValue.setAttribute('aria-hidden', 'true');
    this.attention.append(this.attentionValue);
    alert.append(attentionLabel, this.attention);
    right.append(alert, this.timerSlot);
    for (const output of [this.points, this.combo])
      output.setAttribute('aria-live', 'off');
    parent.prepend(left, right);
  }

  updateStats({ points, combo, attention }: DrivingHudStats) {
    const score = String(points);
    const multiplier = `×${combo}`;
    if (this.points.textContent !== score) this.points.textContent = score;
    if (this.combo.textContent !== multiplier)
      this.combo.textContent = multiplier;
    if (attention === this.previousAttention) return;
    this.previousAttention = attention;
    const tally = `${attention}/${this.whistles.length}`;
    this.attentionValue.textContent = tally;
    this.attention.setAttribute(
      'aria-label',
      `${ui.rideHud.attention} ${tally}`,
    );
    this.whistles.forEach((whistle, index) => {
      whistle.classList.toggle('active', index < attention);
    });
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

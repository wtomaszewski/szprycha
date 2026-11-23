import { ui } from '../core/presentation';

export class GoalArrow {
  readonly root = document.createElement('div');
  private readonly navigationSize = { width: 0, height: 0 };
  private readonly resize = new ResizeObserver(([entry]) => {
    if (entry) {
      const { width, height } = entry.contentRect;
      Object.assign(this.navigationSize, { width, height });
    }
  });
  private readonly arrow = document.createElement('div');
  private readonly bearing = document.createElement('span');
  private readonly distance = document.createElement('span');
  private displayedDistance?: number;
  private displayedDirection?: string;

  constructor(parent: HTMLElement) {
    this.root.className = 'mission-navigation';
    this.arrow.className = 'mission-arrow';
    this.arrow.setAttribute('role', 'img');
    this.bearing.className = 'mission-bearing';
    this.distance.className = 'mission-distance';
    this.arrow.append(this.bearing, this.distance);
    this.root.append(this.arrow);
    this.resize.observe(this.root);

    parent.append(this.root);
  }

  destroy() {
    this.resize.disconnect();
    this.root.remove();
  }

  draw(dx: number, dy: number) {
    const { width, height } = this.navigationSize;
    if (width === 0 || height === 0) return;
    const magnitude = Math.max(Math.abs(dx) / width, Math.abs(dy) / height);
    const x = magnitude === 0 ? width : (width + dx / magnitude) / 2;
    const y = magnitude === 0 ? height / 2 : (height + dy / magnitude) / 2;
    this.arrow.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    const angle = Math.atan2(dy, dx);
    this.bearing.style.transform = `rotate(${angle}rad)`;
    const meters = Math.round(Math.hypot(dx, dy));
    const distanceChanged = this.displayedDistance !== meters;
    if (distanceChanged) {
      this.displayedDistance = meters;
      const distance = `${meters} ${ui.missionUi.distanceUnit}`;
      this.distance.textContent = distance;
    }
    const directions = ui.missionUi.compass;
    const sector =
      (Math.round(angle / (Math.PI / 4)) + directions.length) %
      directions.length;
    const direction = meters === 0 ? ui.missionUi.atGoal : directions[sector]!;
    if (distanceChanged || this.displayedDirection !== direction) {
      this.displayedDirection = direction;
      this.arrow.setAttribute(
        'aria-label',
        `${ui.missionUi.direction} · ${direction} · ${this.distance.textContent}`,
      );
    }
  }
}

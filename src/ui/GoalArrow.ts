import { translate, ui } from '../core/presentation';

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
  private readonly announcement?: HTMLElement;
  private announcedAt = -Infinity;

  constructor(
    parent: HTMLElement,
    private readonly campaign = false,
  ) {
    this.root.className = 'mission-navigation';
    this.arrow.className = 'mission-arrow';
    this.arrow.setAttribute('role', 'img');
    this.bearing.className = 'mission-bearing';
    this.distance.className = 'mission-distance';
    this.arrow.append(this.bearing, this.distance);
    this.root.append(this.arrow);
    if (campaign) {
      this.announcement = document.createElement('p');
      this.announcement.className = 'campaign-navigation-status';
      this.announcement.setAttribute('role', 'status');
      this.root.append(this.announcement);
    }
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
      const label = this.campaign
        ? translate('campaignRide.direction', {
            direction,
            meters: String(meters),
          })
        : `${ui.missionUi.direction} · ${direction} · ${this.distance.textContent}`;
      this.arrow.setAttribute('aria-label', label);
    }
    if (this.announcement) {
      const now = performance.now();
      if (now - this.announcedAt >= 4000) {
        const label = this.arrow.getAttribute('aria-label');
        if (label !== this.announcement.textContent) {
          this.announcedAt = now;
          this.announcement.textContent = label;
        }
      }
    }
  }
}

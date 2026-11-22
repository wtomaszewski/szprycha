import { ui } from '../core/presentation';

export class ProgressionHud {
  private readonly score = document.createElement('output');
  private readonly attention = document.createElement('output');
  private readonly whistles = document.createElement('span');
  private readonly attentionCount = document.createElement('span');
  private readonly radio = document.createElement('p');
  private lastPoints?: number;
  private lastMultiplier?: number;
  private lastRecord?: number;
  private lastLevel?: number;
  private wasGlowing: boolean;
  private radioUntil = 0;

  constructor(
    parent: HTMLElement,
    private readonly maxAttention: number,
    glowing: boolean,
  ) {
    this.wasGlowing = glowing;
    this.score.className = 'progression-score';
    this.score.setAttribute('aria-live', 'off');
    this.attention.className = 'progression-attention';
    this.attention.setAttribute('aria-label', ui.progression.attention);
    this.whistles.className = 'progression-whistles';
    this.whistles.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < maxAttention; i++)
      this.whistles.append(document.createElement('span'));
    this.attention.append(
      ui.progression.attention,
      this.whistles,
      this.attentionCount,
    );
    this.radio.className = 'progression-radio';
    this.radio.setAttribute('role', 'status');
    this.radio.hidden = true;
    parent.append(this.score, this.attention, this.radio);
  }

  update(
    points: number,
    multiplier: number,
    record: number,
    glowing: boolean,
    level: number,
    at: number,
  ) {
    if (
      points !== this.lastPoints ||
      multiplier !== this.lastMultiplier ||
      record !== this.lastRecord
    ) {
      this.score.textContent = `${ui.progression.points} ${points} · ${ui.progression.series} ×${multiplier} · ${ui.progression.record} ${record}`;
      this.score.classList.toggle('glowing', glowing);
      this.lastPoints = points;
      this.lastMultiplier = multiplier;
      this.lastRecord = record;
    }
    if (level !== this.lastLevel) {
      this.attentionCount.textContent = `${level}/${this.maxAttention}`;
      for (let i = 0; i < this.whistles.children.length; i++)
        this.whistles.children[i]!.classList.toggle('active', i < level);
      this.lastLevel = level;
    }
    if (glowing && !this.wasGlowing) {
      this.radio.hidden = false;
      this.radio.textContent = ui.progression.dj;
      this.radioUntil = at + 3500;
    }
    if (!this.radio.hidden && (!glowing || at >= this.radioUntil))
      this.radio.hidden = true;
    this.wasGlowing = glowing;
  }
}

import { missionClock, translate, ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';
import type { MissionResult } from '../gameplay/MissionSystem';

import { accessibilityPreferences } from './RidePreferences';

const labels = ui.missionResults;
type RuleSummary = {
  name: string;
  habit?: string;
  mastery: number;
  change: number;
};

function textElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function scoreRow(list: HTMLDListElement, label: string, value: string) {
  const row = document.createElement('div');
  row.append(textElement('dt', `${label} `), textElement('dd', value));
  list.append(row);
}

const bonus = (value: number) => (value ? `+${value}` : '0');
const delta = (value: number) => (value < 0 ? `−${-value}` : bonus(value));

export class MissionResults {
  private readonly dialog = document.createElement('dialog');
  private readonly region = document.createElement('section');
  private readonly heading = document.createElement('h2');
  private readonly body = document.createElement('div');
  private readonly skip = textElement('button', labels.skip);
  private readonly retry = textElement('button', ui.missionUi.retry);
  private readonly map = textElement('button', labels.map);
  private readonly preferences = document.createElement('details');
  private readonly confetti = document.createElement('div');

  constructor(
    parent: HTMLElement,
    private readonly store: ProgressStore,
    private readonly skipAnimation: () => void,
    retry: () => void,
    openPhone: () => void,
    map: () => void,
  ) {
    this.dialog.className = 'game-dialog mission-results';
    this.dialog.setAttribute('aria-labelledby', 'mission-result-heading');
    this.region.setAttribute('aria-label', ui.missionUi.result);
    this.body.className = 'result-body';
    this.heading.id = 'mission-result-heading';
    this.heading.tabIndex = -1;

    const actions = document.createElement('footer');
    const phone = textElement('button', ui.phone.title);
    phone.setAttribute('aria-keyshortcuts', 'M');
    phone.setAttribute('aria-haspopup', 'dialog');
    phone.setAttribute('aria-controls', 'mission-phone');
    for (const [button, action] of [
      [this.skip, skipAnimation],
      [this.retry, retry],
      [phone, openPhone],
      [this.map, map],
    ] as const) {
      button.type = 'button';
      button.addEventListener('click', action);
    }
    actions.append(this.retry, phone, this.map);
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!this.skip.hidden) skipAnimation();
    });

    this.confetti.className = 'mission-confetti';
    this.confetti.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 17; index++) {
      const piece = document.createElement('i');
      piece.style.setProperty('--confetti-x', `${index * 6}%`);
      piece.style.setProperty('--confetti-y', `${(index * 13) % 16}px`);
      piece.style.setProperty('--confetti-drift', `${(8 - index) * 4}px`);
      piece.style.setProperty('--confetti-angle', `${(index * 29) % 90}deg`);
      this.confetti.append(piece);
    }
    this.region.append(
      this.heading,
      this.skip,
      this.body,
      this.preferences,
      actions,
    );
    this.dialog.append(this.confetti, this.region);
    parent.append(this.dialog);
  }

  get open() {
    return this.dialog.open;
  }

  show(
    result: MissionResult,
    title: string,
    tokens: number,
    wallet: number,
    rules: readonly RuleSummary[],
    habit: string | undefined,
    tip: string,
    reduced: boolean,
  ) {
    this.preferences.open = false;
    this.preferences.replaceChildren(
      textElement('summary', ui.settings.accessibility),
      ...accessibilityPreferences(this.store, this.skipAnimation),
    );
    const mission = ui.missionUi;
    const completed = result.status === 'completed';
    const hasReplay = Boolean(habit);
    this.dialog.toggleAttribute('data-glory', hasReplay);
    this.skip.hidden = reduced || !completed;
    this.confetti.hidden = reduced || !completed;
    this.heading.textContent = completed ? mission.completed : mission.failed;

    const missionName = textElement('p', translate(title));
    missionName.className = 'result-mission-name';
    const highlights = document.createElement('dl');
    highlights.className = 'result-highlights';
    scoreRow(highlights, mission.yourPoints, String(result.points));
    scoreRow(
      highlights,
      ui.progression.stars,
      `${result.stars} ${'★'.repeat(result.stars)}`.trim(),
    );
    scoreRow(highlights, ui.progression.tokens, `+${tokens}`);

    const gloryTitle = textElement('h3', labels.glory);
    const glory = document.createElement('div');
    glory.className = 'result-glory';
    glory.append(gloryTitle, textElement('p', habit ?? labels.noGlory));

    const scores = document.createElement('dl');
    scores.className = 'result-scores';
    scoreRow(scores, labels.completion, bonus(result.completionPoints));
    scoreRow(
      scores,
      `${mission.goodHabits} ${result.goodHabits}`,
      bonus(result.habitPoints),
    );
    if (result.penaltyPoints)
      scoreRow(scores, mission.penalties, delta(-result.penaltyPoints));
    scoreRow(scores, labels.timeBonus, bonus(result.timeBonus));
    scoreRow(
      scores,
      mission.timer,
      missionClock(Math.floor(result.elapsedSeconds)),
    );
    if (result.questionPoints)
      scoreRow(scores, ui.progression.wiseHead, bonus(result.questionPoints));
    if (result.smoothBonus !== undefined)
      scoreRow(scores, mission.smoothBonus, bonus(result.smoothBonus));
    if (result.opponentScore !== undefined)
      scoreRow(scores, mission.turboPoints, String(result.opponentScore));
    if (result.photos) scoreRow(scores, mission.photos, String(result.photos));
    if (result.shocks !== undefined)
      scoreRow(scores, mission.shocks, `${Math.round(result.shocks * 100)}%`);
    scoreRow(
      scores,
      ui.progression.missionSeries,
      String(result.longestSeries),
    );
    scoreRow(scores, ui.progression.wallet, String(wallet));

    const mastery = document.createElement('ul');
    for (const { name, mastery: value, change, habit } of rules) {
      const item = document.createElement('li');
      const score = change ? `${value}% (${delta(change)})` : `${value}%`;
      item.append(textElement('strong', `${name} · ${score}`));
      if (habit) item.append(textElement('span', habit));
      mastery.append(item);
    }

    const overview = document.createElement('section');
    overview.append(missionName, highlights, glory);
    const breakdown = document.createElement('section');
    breakdown.append(textElement('h3', labels.score), scores);
    this.body.replaceChildren(overview, breakdown);
    const outcomeText =
      result.status === 'failed'
        ? result.reason === 'czas_minal'
          ? mission.timeExpired
          : result.reason === 'dowolny_blad'
            ? mission.failedClean
            : result.reason === 'wynik_wyscigu'
              ? mission.raceScoreRequired
              : mission.threeMajor
        : result.illegalShortcut
          ? mission.noShortcutBonus
          : !result.timeBonusEligible
            ? mission.noTimeBonus
            : '';
    if (outcomeText) overview.append(textElement('p', outcomeText));
    if (result.illegalShortcut)
      overview.append(textElement('p', mission.illegalShortcut));
    if (tip)
      overview.append(
        textElement('h3', labels.remember),
        textElement('p', tip),
      );
    breakdown.append(
      textElement('h3', labels.mastery),
      mastery.childElementCount
        ? mastery
        : textElement('p', labels.masteryEmpty),
    );

    this.dialog.showModal();
    this.heading.focus();
  }

  stopAnimation() {
    this.confetti.hidden = true;
    if (document.activeElement === this.skip) this.heading.focus();
    this.skip.hidden = true;
  }

  gamepad(pressed: (button: number) => boolean) {
    if (pressed(1) && !this.skip.hidden) this.skip.click();
    else if (pressed(0)) this.map.click();
    else if (pressed(2)) this.retry.click();
  }

  close() {
    this.dialog.close();
  }
}

import { moduleId, type GameContent } from '../content/schemas';
import { playerNickname, translate, ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { masteryBadge } from '../progression/mastery';

const number = new Intl.NumberFormat('pl-PL');

export function skillMapButton(
  progress: MissionProgress,
  content: GameContent,
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog skill-map';
  dialog.setAttribute('aria-labelledby', 'skill-map-title');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-skills';
  button.textContent = ui.skillMap.title;
  button.addEventListener('click', () => {
    const title = document.createElement('h2');
    title.id = 'skill-map-title';
    title.textContent = ui.skillMap.title;

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = ui.skillMap.close;
    close.autofocus = true;
    close.addEventListener('click', () => dialog.close());
    const header = document.createElement('header');
    header.append(title, close);

    const { nicknameSeed } = progress.store.profile;
    const nick = document.createElement('strong');
    nick.textContent = playerNickname(nicknameSeed);
    const reputation = document.createElement('p');
    const rank = progress.rank(content);
    reputation.textContent = `${ui.skillMap.rank} ${rank ? translate(`skillMap.ranks.${rank.id}`) : '—'} · ${ui.skillMap.xp} ${number.format(progress.xp)}`;

    const modules = document.createElement('ul');
    for (const module of moduleId.options) {
      const value = progress.moduleMastery(module, content);
      const badge = masteryBadge(value, content.balans.mastery);
      const row = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = ui.skillMap.modules[module];
      const level = document.createElement('span');
      level.className = `skill-badge ${badge}`;
      level.textContent = `${number.format(Math.floor(value * 10) / 10)}% · ${ui.skillMap.badges[badge]}`;
      const meter = document.createElement('meter');
      meter.max = 100;
      meter.value = value;
      meter.setAttribute('aria-label', ui.skillMap.modules[module]);
      row.append(name, level, meter);
      modules.append(row);
    }

    const scoresHeading = document.createElement('h3');
    scoresHeading.textContent = ui.skillMap.bestScores;
    const scores = document.createElement('dl');
    for (const mission of content.misje) {
      const score = progress.bestScore(mission.id);
      if (score === undefined) continue;
      const label = document.createElement('dt');
      label.textContent = translate(mission.tytul);
      const value = document.createElement('dd');
      value.textContent = number.format(score);
      scores.append(label, value);
    }
    const empty = document.createElement('p');
    empty.textContent = ui.skillMap.noScores;
    const streak = document.createElement('p');
    streak.textContent = `${ui.progression.record} ${number.format(progress.longestSeries)}`;
    const notice = document.createElement('p');
    notice.textContent = progressNotice(progress);
    notice.hidden = !notice.textContent;
    dialog.replaceChildren(
      header,
      nick,
      reputation,
      notice,
      modules,
      scoresHeading,
      scores.childElementCount ? scores : empty,
      streak,
    );
    dialog.showModal();
  });
  return { button, dialog };
}

export function progressNotice({ store }: MissionProgress) {
  return [
    store.reset && ui.skillMap.reset,
    store.sessionOnly && ui.skillMap.sessionOnly,
  ]
    .filter(Boolean)
    .join(' ');
}

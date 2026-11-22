import { Capacitor } from '@capacitor/core';
import { generateNickname } from '../content/nicknames';
import type { GameContent } from '../content/schemas';
import { ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { parentZoneConfig } from '../platform/parentZoneConfig';
import { ageBands } from '../rules/types';

const labels = ui.parentZone;
const config = parentZoneConfig({
  VITE_RANKING_URL: import.meta.env.VITE_RANKING_URL,
  VITE_PRIVACY_POLICY_URL: import.meta.env.VITE_PRIVACY_POLICY_URL,
  VITE_PROJECT_URL: import.meta.env.VITE_PROJECT_URL,
});

function button(text: string) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  return element;
}

export function parentZone(
  progress: MissionProgress,
  balance: GameContent['balans']['zdrowe_granie'],
) {
  const open = button(labels.title);
  open.setAttribute('aria-haspopup', 'dialog');
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog parent-zone';
  dialog.setAttribute('aria-labelledby', 'parent-zone-title');

  const title = document.createElement('h2');
  title.id = 'parent-zone-title';
  title.tabIndex = -1;
  const close = button(ui.m5c.close);
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  const header = document.createElement('header');
  header.append(title, close);
  const body = document.createElement('div');
  dialog.append(header, body);

  function showSettings() {
    title.textContent = labels.title;
    body.replaceChildren(...settings(progress, balance));
    dialog.scrollTop = 0;
    title.focus();
  }

  open.addEventListener('click', () => {
    title.textContent = labels.gateTitle;
    body.replaceChildren(gate(showSettings));
    dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) body.replaceChildren();
  });
  return { button: open, dialog };
}

function gate(unlock: () => void) {
  let answer = '';
  let solution = 0;

  const form = document.createElement('form');
  form.className = 'parent-gate';
  const instruction = document.createElement('p');
  instruction.textContent = labels.gateInstruction;
  const question = document.createElement('p');
  question.className = 'parent-gate-question';
  question.setAttribute('aria-live', 'polite');
  const feedback = document.createElement('p');
  feedback.className = 'parent-gate-feedback';
  feedback.setAttribute('role', 'status');
  const response = document.createElement('output');
  response.setAttribute('aria-label', labels.answer);
  const task = document.createElement('div');
  task.className = 'parent-gate-task';
  task.append(question, response);
  const reset = button(labels.clear);
  const confirm = button(labels.confirm);
  confirm.type = 'submit';

  function displayAnswer() {
    response.value = answer || '?';
    confirm.disabled = reset.disabled = answer.length === 0;
  }

  function newQuestion() {
    const first = 13 + Math.floor(Math.random() * 17);
    const second = 6 + Math.floor(Math.random() * 4);
    solution = first * second;
    answer = '';
    question.textContent = `${first} × ${second} =`;
    displayAnswer();
  }

  const keypad = document.createElement('div');
  keypad.className = 'parent-gate-keypad';
  for (const digit of '1234567890') {
    const key = button(digit);
    key.addEventListener('click', () => {
      if (answer.length >= 3) return;
      feedback.textContent = '';
      answer += digit;
      displayAnswer();
    });
    keypad.append(key);
  }
  reset.addEventListener('click', () => {
    answer = '';
    displayAnswer();
    keypad.querySelector('button')?.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!answer) return;
    if (answer === String(solution)) {
      unlock();
      return;
    }
    feedback.textContent = labels.tryAgain;
    newQuestion();
    keypad.querySelector('button')?.focus();
  });

  const actions = document.createElement('div');
  actions.className = 'parent-gate-actions';
  actions.append(reset, confirm);
  form.append(instruction, task, keypad, actions, feedback);
  newQuestion();
  return form;
}

function settings(
  progress: MissionProgress,
  balance: GameContent['balans']['zdrowe_granie'],
) {
  const { store } = progress;
  const nickname = document.createElement('output');
  nickname.setAttribute('aria-label', labels.nickname);
  nickname.value = store.profile.nickname;
  const reroll = button(labels.reroll);
  reroll.addEventListener('click', () => {
    const next = generateNickname(store.profile.nickname);
    store.change((profile) => {
      profile.nickname = next;
    });
    nickname.value = next;
  });
  const identity = document.createElement('div');
  identity.className = 'parent-zone-profile';
  const nicknameLabel = document.createElement('span');
  nicknameLabel.textContent = labels.nickname;
  nicknameLabel.append(nickname);
  identity.append(nicknameLabel, reroll);

  const age = document.createElement('select');
  age.add(new Option(labels.ageUnset, ''));
  for (const band of ageBands) age.add(new Option(labels.ages[band], band));
  age.value = store.profile.ageBand ?? '';
  age.setAttribute('aria-describedby', 'parent-age-help');
  age.addEventListener('change', () => {
    const value = ageBands.find((band) => band === age.value);
    store.change((profile) => {
      profile.ageBand = value;
    });
  });
  const ageLabel = document.createElement('label');
  ageLabel.className = 'parent-zone-setting';
  ageLabel.append(labels.age, age);
  const ageHelp = document.createElement('small');
  ageHelp.id = 'parent-age-help';
  ageHelp.textContent = labels.ageHelp;

  const breakTime = document.createElement('select');
  breakTime.add(new Option(labels.breakOff, ''));
  for (const minutes of balance.opcje_min)
    breakTime.add(new Option(`${minutes} ${ui.m5c.minutes}`, String(minutes)));
  const savedBreak = progress.breakMinutes(balance);
  breakTime.value = savedBreak === null ? '' : String(savedBreak);
  breakTime.addEventListener('change', () =>
    progress.setBreakMinutes(
      breakTime.value ? Number(breakTime.value) : null,
      balance,
    ),
  );
  const breakLabel = document.createElement('label');
  breakLabel.className = 'parent-zone-setting';
  breakLabel.append(labels.breakReminder, breakTime);

  const preferences = document.createElement('div');
  preferences.className = 'parent-zone-preferences';
  preferences.append(ageLabel, ageHelp, breakLabel);
  const parts = [identity, preferences];

  if (config.rankingAvailable) {
    const online = document.createElement('div');
    online.className = 'parent-zone-preferences';
    const label = document.createElement('label');
    label.className = 'parent-zone-toggle';
    const rankings = document.createElement('input');
    rankings.type = 'checkbox';
    rankings.checked = store.profile.onlineRankings;
    rankings.setAttribute('aria-describedby', 'parent-rankings-help');
    rankings.addEventListener('change', () => {
      const enabled = rankings.checked;
      store.change((profile) => {
        profile.onlineRankings = enabled;
      });
    });
    label.append(rankings, labels.rankings);
    const help = document.createElement('small');
    help.id = 'parent-rankings-help';
    help.textContent = labels.rankingsHelp;
    const remove = button(labels.removeProfile);
    remove.disabled = true;
    online.append(label, help, remove);
    parts.push(online);
  }

  const links = document.createElement('div');
  links.className = 'parent-zone-links';
  for (const [name, url] of [
    [labels.privacy, config.privacyUrl],
    [labels.project, config.projectUrl],
  ] as const) {
    if (!url) continue;
    const link = document.createElement('a');
    link.textContent = name;
    link.href = url;
    link.target = Capacitor.isNativePlatform() ? '_self' : '_blank';
    link.rel = 'noopener noreferrer';
    links.append(link);
  }
  if (links.childElementCount) parts.push(links);
  return parts;
}

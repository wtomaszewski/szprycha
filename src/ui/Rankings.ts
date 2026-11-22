import { ui } from '../core/presentation';
import type { MissionDefinition } from '../content/missions';
import { missionCity, type MissionCity } from '../content/missions';
import {
  rankingLeague,
  type RankingLeague,
  type RankingQuery,
} from '../content/rankings';
import { placTime } from '../gameplay/plac/placRecords';
import type { RankingClient } from '../rankings/RankingClient';
import {
  helmetColors,
  riderDirections,
  riderPoses,
  type HelmetColor,
} from '../render/spriteFrames';

const copy = ui.rankings;
const boards = [
  'mission',
  'weekly-xp',
  'safety',
  'plac',
  'cities',
  'class',
] as const;
type Board = (typeof boards)[number];
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 });
const date = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'short',
  timeZone: 'UTC',
});

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') =>
  Object.assign(document.createElement(tag), { textContent: text });
const button = (text: string) =>
  Object.assign(node('button', text), { type: 'button' });
const formatDate = (value: string) => date.format(new Date(value));
const km = (meters: number) => number.format(meters / 1000) + ' km';

function labelled(text: string, select: HTMLSelectElement) {
  const label = node('label', text);
  label.append(select);
  return label;
}

function avatar(color: HelmetColor) {
  const frame = helmetColors.indexOf(color) * riderPoses * riderDirections;
  const columns = 2 * riderDirections;
  const image = node('span');
  image.className = 'ranking-avatar';
  image.setAttribute('aria-hidden', 'true');
  image.style.backgroundPosition = `${-(frame % columns) * 24}px ${-Math.floor(frame / columns) * 24}px`;
  return image;
}

export function rankingsPanel(
  client: RankingClient | undefined,
  missions: readonly MissionDefinition[],
  initialCity: MissionCity,
) {
  const open = button(copy.title);
  open.setAttribute('aria-haspopup', 'dialog');
  const dialog = node('dialog');
  dialog.className = 'game-dialog rankings';
  dialog.setAttribute('aria-labelledby', 'rankings-title');
  const title = node('h2', copy.title);
  title.id = 'rankings-title';
  const close = button(ui.m5c.close);
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  const header = node('header');
  header.append(title, close);

  const tabs = node('div');
  tabs.className = 'rankings-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', copy.title);
  const panel = node('section');
  panel.id = 'rankings-board';
  panel.setAttribute('role', 'tabpanel');
  const filters = node('div');
  filters.className = 'rankings-filters';
  const rules = node('p');
  const period = node('p');
  period.className = 'rankings-period';
  const status = node('p');
  status.setAttribute('role', 'status');
  const self = node('div');
  self.className = 'rankings-self';
  const table = node('table');
  const heading = node('tr');
  const nameHeading = node('th');
  const valueHeading = node('th');
  heading.append(node('th', copy.place), nameHeading, valueHeading);
  for (const cell of heading.cells) cell.scope = 'col';
  table.createTHead().append(heading);
  const rows = table.createTBody();
  const retry = button(copy.retry);
  panel.append(filters, rules, period, status, retry, self, table);
  dialog.append(header, tabs, panel);

  const city = node('select');
  for (const id of missionCity.options)
    city.add(new Option(ui.cityPicker[id], id));
  city.value = initialCity;
  const mission = node('select');
  const league = node('select');
  for (const id of rankingLeague.options)
    league.add(new Option(copy.leagues[id], id));
  const leagueNote = node('small');
  let chosenLeague = false;
  let board: Board = 'mission';
  let request: AbortController | undefined;
  const tabButtons = boards.map((id) => {
    const tab = button(copy.boards[id]);
    tab.id = 'rankings-tab-' + id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.addEventListener('click', () => select(id));
    tabs.append(tab);
    return tab;
  });

  tabs.addEventListener('keydown', (event) => {
    const index = boards.indexOf(board);
    const next = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: boards.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const i = (next + boards.length) % boards.length;
    select(boards[i]!);
    tabButtons[i]!.focus();
  });

  function setMissions() {
    mission.replaceChildren();
    for (const { id, tytul, miasto } of missions)
      if (miasto === city.value && client?.versions.missions[id])
        mission.add(new Option(tytul, id));
  }

  function select(id: Board) {
    board = id;
    for (const [index, tab] of tabButtons.entries()) {
      const active = boards[index] === id;
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute('aria-selected', String(active));
      if (active) panel.setAttribute('aria-labelledby', tab.id);
    }
    filters.replaceChildren();
    if (id === 'mission') {
      filters.append(
        labelled(copy.city, city),
        labelled(copy.mission, mission),
      );
    } else if (id === 'weekly-xp') {
      filters.append(labelled(copy.league, league), leagueNote);
    }
    filters.hidden = !filters.childElementCount;
    rules.textContent =
      id === 'cities'
        ? copy.event
        : id === 'mission'
          ? copy.missionRules
          : id === 'plac'
            ? copy.placRules
            : id === 'weekly-xp'
              ? copy.promotion
              : '';
    rules.hidden = !rules.textContent;
    tabButtons[boards.indexOf(id)]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
    void load();
  }

  function addRow(
    position: number,
    name: string,
    value: string,
    color?: HelmetColor,
    own?: boolean,
  ) {
    const row = rows.insertRow();
    row.toggleAttribute('data-own', Boolean(own));
    row.insertCell().textContent = String(position);
    const who = row.insertCell();
    if (color) who.append(avatar(color));
    who.append(name);
    row.insertCell().textContent = value;
  }

  async function load() {
    request?.abort();
    const { signal } = (request = new AbortController());
    rows.replaceChildren();
    self.replaceChildren();
    period.textContent = leagueNote.textContent = '';
    retry.hidden = table.hidden = self.hidden = true;
    if (board === 'class') {
      status.textContent = copy.classSoon;
      return;
    }
    if (!client?.enabled) return;
    status.textContent = copy.loading;
    try {
      let query: RankingQuery;
      if (board === 'mission') {
        query = {
          board,
          city: city.value as MissionCity,
          missionId: mission.value,
        };
      } else if (board === 'weekly-xp') {
        const info = await client.league(signal);
        if (signal.aborted) return;
        if (!chosenLeague && info.league) league.value = info.league;
        if (info.league)
          leagueNote.textContent = copy.yourLeague.replace(
            '{league}',
            copy.leagues[info.league],
          );
        query = { board, league: league.value as RankingLeague };
      } else query = { board };
      const result = await client.board(query, signal);
      if (signal.aborted) return;
      const { data } = result;
      const weekly = query.board === 'weekly-xp' || query.board === 'cities';
      period.textContent = weekly
        ? copy.week.replace('{date}', formatDate(data.week))
        : copy.season.replace('{date}', formatDate(data.season.end));
      valueHeading.textContent = copy.values[query.board];
      status.textContent = data.top.length ? '' : copy.empty;
      table.hidden = !data.top.length;
      if (result.kind === 'cities') {
        nameHeading.textContent = copy.city;
        for (const entry of result.data.top)
          addRow(entry.position, ui.cityPicker[entry.city], km(entry.value));
        const contributions = result.data.self;
        for (const entry of contributions) {
          self.append(
            node(
              'p',
              copy.contribution
                .replace('{city}', ui.cityPicker[entry.city])
                .replace('{value}', km(entry.contributedMeters)),
            ),
          );
        }
        self.hidden = !contributions.length;
      } else {
        nameHeading.textContent = copy.player;
        const value =
          query.board === 'plac'
            ? (ticks: number) => placTime(ticks) + ' ' + ui.plac.seconds
            : (score: number) => number.format(score);
        const own = result.data.self;
        for (const entry of result.data.top)
          addRow(
            entry.position,
            entry.nickname,
            value(entry.value),
            entry.avatarId,
            own?.position === entry.position,
          );
        self.textContent = own
          ? copy.yourPlace
              .replace('{position}', String(own.position))
              .replace('{value}', value(own.value))
          : copy.noPlace;
        self.hidden = false;
      }
    } catch {
      if (signal.aborted) return;
      status.textContent = copy.offline;
      retry.hidden = false;
    }
  }

  city.addEventListener('change', () => {
    setMissions();
    void load();
  });
  mission.addEventListener('change', () => void load());
  league.addEventListener('change', () => {
    chosenLeague = true;
    void load();
  });
  retry.addEventListener('click', () => void load());
  dialog.addEventListener('close', () => request?.abort());
  open.addEventListener('click', () => {
    if (!client?.enabled) return;
    dialog.showModal();
    select(board);
  });
  const refresh = () => {
    open.hidden = !client?.enabled;
    if (open.hidden && dialog.open) dialog.close();
  };
  setMissions();
  refresh();
  return { button: open, dialog, refresh };
}

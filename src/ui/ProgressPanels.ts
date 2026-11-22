import copyright from '../../LICENSE?raw';
import notices from 'virtual:third-party-notices';
import type { GameContent } from '../content/schemas';
import { translate, ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { signIllustration } from './SignIllustration';

function paragraph(text: string) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function heading(text: string) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}

export function progressPanels(
  progress: MissionProgress,
  content: GameContent,
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog progress-panel';
  dialog.setAttribute('aria-labelledby', 'progress-panel-title');

  const title = document.createElement('h2');
  title.id = 'progress-panel-title';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = ui.m5c.close;
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  const header = document.createElement('header');
  header.append(title, close);
  const body = document.createElement('div');
  dialog.append(header, body);

  const about = document.createElement('button');
  about.type = 'button';
  about.textContent = ui.settings.about;
  const settings = () => [
    heading(ui.m5c.breakSettings),
    breakSettings(progress, content),
    about,
  ];

  function showPanel(label: string, ...elements: HTMLElement[]) {
    title.textContent = label;
    body.replaceChildren(...elements);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  const navigation = document.createElement('nav');
  navigation.className = 'menu-progress';
  for (const [label, render] of [
    [ui.m5c.album, () => album(progress, content)],
    [ui.m5c.achievements, () => achievements(progress, content)],
    [ui.m5c.daily, () => daily(progress, content)],
    [ui.settings.title, settings],
  ] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => showPanel(label, ...render()));
    navigation.append(button);
  }

  about.addEventListener('click', () => {
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = ui.settings.back;
    back.addEventListener('click', () => {
      showPanel(ui.settings.title, ...settings());
      about.focus();
    });
    const text = document.createElement('pre');
    text.className = 'third-party-notices';
    text.textContent = notices;
    showPanel(
      ui.settings.about,
      back,
      paragraph(copyright.trim()),
      heading(ui.settings.thirdParty),
      text,
    );
    back.focus();
  });
  return { dialog, navigation };
}

function album(progress: MissionProgress, content: GameContent) {
  const { signPhotos } = progress.store.profile;
  const found: HTMLElement[] = [];
  const missing: HTMLElement[] = [];
  const cards = document.createElement('ul');
  cards.className = 'album-cards';
  for (const { kod, nazwa, dla_dziecka } of content.znaki.znaki) {
    const card = document.createElement('li');
    const photo = signPhotos[kod];
    if (photo) {
      const image = new Image(64, 64);
      image.src = photo;
      image.alt = nazwa;
      const images = document.createElement('div');
      images.className = 'album-images';
      images.append(image);
      const illustration = signIllustration(kod, '');
      if (illustration) images.append(illustration);
      card.append(images, heading(`${kod} · ${nazwa}`), paragraph(dla_dziecka));
      found.push(card);
    } else {
      card.className = 'album-missing';
      card.append(heading(kod));
      missing.push(card);
    }
  }
  cards.append(...found);
  const parts: HTMLElement[] = [
    paragraph(
      `${ui.m5c.albumProgress} ${found.length} / ${content.znaki.znaki.length}`,
    ),
    paragraph(ui.m5c.albumHint),
  ];
  if (found.length) parts.push(cards);
  if (missing.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${ui.m5c.lockedSign} (${missing.length})`;
    const unseen = document.createElement('ul');
    unseen.className = 'album-cards';
    unseen.append(...missing);
    details.append(summary, unseen);
    parts.push(details);
  }
  return parts;
}

function achievements(progress: MissionProgress, content: GameContent) {
  const list = document.createElement('ul');
  list.className = 'progress-cards';
  for (const { id, nazwa, opis, aktywne, zetony } of content.osiagniecia
    .osiagniecia) {
    const item = document.createElement('li');
    const earned = Object.hasOwn(progress.store.profile.achievementXp, id);
    const status = earned
      ? ui.m5c.earned
      : aktywne
        ? ui.m5c.inProgress
        : ui.m5c.inactive;
    item.append(
      heading(nazwa),
      paragraph(opis),
      paragraph(
        aktywne ? `${status} · ${ui.progression.tokens} ${zetony}` : status,
      ),
    );
    list.append(item);
  }
  return [list];
}

function daily(progress: MissionProgress, content: GameContent) {
  if (!progress.milestones(content).canPlayDaily(progress.store.profile))
    return [paragraph(ui.m5c.dailyLocked)];
  const cards = document.createElement('ul');
  cards.className = 'progress-cards';
  for (const challenge of progress.dailyChallenges(content)) {
    const item = document.createElement('li');
    const meter = document.createElement('progress');
    meter.max = challenge.ile;
    meter.value = challenge.count;
    meter.setAttribute('aria-label', challenge.opis);
    item.append(
      heading(challenge.opis),
      paragraph(ui.skillMap.modules[challenge.module]),
      meter,
      paragraph(
        challenge.completed
          ? ui.m5c.done
          : `${challenge.count} / ${challenge.ile} · ${ui.progression.tokens} +${content.balans.wyzwania_dzienne.zetony}`,
      ),
    );
    cards.append(item);
  }
  const stickers = document.createElement('ul');
  stickers.className = 'sticker-list';
  for (const id of progress.store.profile.stickers) {
    const name = translate(`m5c.stickerNames.${id}`);
    if (name === `m5c.stickerNames.${id}`) continue;
    const sticker = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = `sticker-icon sticker-${id}`;
    sticker.append(icon, name);
    stickers.append(sticker);
  }
  return [
    paragraph(ui.m5c.dailyRest),
    cards,
    heading(ui.m5c.stickers),
    stickers.childElementCount ? stickers : paragraph(ui.m5c.noStickers),
  ];
}

function breakSettings(progress: MissionProgress, content: GameContent) {
  const balance = content.balans.zdrowe_granie;
  const label = document.createElement('label');
  const select = document.createElement('select');
  for (const minutes of balance.opcje_min)
    select.add(new Option(`${minutes} ${ui.m5c.minutes}`, String(minutes)));
  select.value = String(progress.breakMinutes(balance));
  select.addEventListener('change', () =>
    progress.setBreakMinutes(Number(select.value), balance),
  );
  label.append(ui.m5c.breakAfter, ' ', select);
  const p = document.createElement('p');
  p.append(label);
  return p;
}

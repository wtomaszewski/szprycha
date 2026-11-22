import { version } from '../../package.json';
import copyright from '../../LICENSE?raw';
import notices from 'virtual:third-party-notices';
import type { GameContent } from '../content/schemas';
import { ui } from '../core/presentation';

export function aboutGame(content: GameContent) {
  const labels = ui.aboutGame;
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog progress-panel about-game';
  dialog.setAttribute('aria-labelledby', 'about-game-title');
  const title = document.createElement('h2');
  title.id = 'about-game-title';
  title.textContent = labels.title;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = ui.m5c.close;
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  const header = document.createElement('header');
  header.append(title, close);

  const body = document.createElement('div');
  const clause = document.createElement('p');
  const legalDate = document.createElement('time');
  legalDate.dateTime = content.przepisy.stan_prawny;
  legalDate.textContent = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(legalDate.dateTime));
  clause.append(
    `${labels.educationalMaterial} ${labels.legalDate} `,
    legalDate,
    '.',
  );
  const certificate = document.createElement('p');
  certificate.textContent = labels.certificate;

  const review = document.createElement('section');
  const reviewTitle = document.createElement('h3');
  reviewTitle.textContent = labels.review;
  review.append(reviewTitle);
  const { recenzja_merytoryczna } = content['o-grze'];
  if (recenzja_merytoryczna) {
    const text = document.createElement('p');
    text.textContent = recenzja_merytoryczna;
    review.append(text);
  }

  const gameVersion = document.createElement('p');
  gameVersion.textContent = `${labels.version} ${version}`;
  const rights = document.createElement('p');
  rights.textContent = copyright.trim();
  const licenses = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = labels.thirdParty;
  const text = document.createElement('pre');
  text.className = 'third-party-notices';
  text.textContent = notices;
  licenses.append(summary, text);
  body.append(clause, certificate, review, gameVersion, rights, licenses);
  dialog.append(header, body);

  function trigger() {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = labels.title;
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => {
      licenses.open = false;
      dialog.showModal();
      dialog.scrollTop = 0;
    });
    return button;
  }
  return { dialog, trigger };
}

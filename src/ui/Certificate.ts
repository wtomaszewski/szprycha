import type { ProgressProfile } from '../core/progressStore';
import { ui } from '../core/presentation';

const labels = ui.exam;
const points = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function showCertificate(
  profile: ProgressProfile,
  host: HTMLDialogElement,
) {
  const result = profile.licence;
  if (!result || !profile.licencePassed) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog certificate-dialog';
  dialog.setAttribute('aria-labelledby', 'certificate-title');
  const article = document.createElement('article');
  article.className = 'certificate-paper';

  const edition = document.createElement('p');
  edition.className = 'certificate-edition';
  edition.textContent = ui.title;
  const title = document.createElement('h2');
  title.id = 'certificate-title';
  title.textContent = labels.licence;
  const recipient = document.createElement('p');
  recipient.className = 'certificate-recipient';
  recipient.textContent = profile.nickname;
  const earned = document.createElement('p');
  earned.textContent = labels.earned;
  const stats = document.createElement('dl');
  for (const [label, value] of [
    [labels.theory, `${result.theory.correct} / ${result.theory.total}`],
    [
      labels.practice,
      `${points.format(result.practice.points)} / ${points.format(result.practice.max)}`,
    ],
    [labels.date, date.format(new Date(`${result.date}T00:00:00Z`))],
  ] as const) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    const stat = document.createElement('div');
    stat.append(term, detail);
    stats.append(stat);
  }
  const disclaimer = document.createElement('p');
  disclaimer.className = 'certificate-disclaimer';
  disclaimer.textContent = labels.disclaimer;
  article.append(edition, title, earned, recipient, stats, disclaimer);

  const actions = document.createElement('div');
  actions.className = 'certificate-actions';
  const print = document.createElement('button');
  print.type = 'button';
  print.textContent = labels.print;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = ui.quiz.close;
  print.addEventListener('click', () => window.print());
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  actions.append(print, close);
  dialog.append(article, actions);
  host.after(dialog);
  dialog.showModal();
}

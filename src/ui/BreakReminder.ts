import { ui } from '../core/presentation';

export function showBreakReminder(container: HTMLElement) {
  const reminder = document.createElement('aside');
  reminder.className = 'break-reminder';
  const speaker = document.createElement('strong');
  speaker.textContent = ui.m5c.kazik;
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = ui.m5c.dismiss;
  close.addEventListener('click', () => reminder.remove());
  reminder.append(speaker, message, close);
  container.append(reminder);
  message.textContent = ui.m5c.breakMessage;
}

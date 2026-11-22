import { classCodeAlphabet, classCodeLength } from '../content/classes';
import { ui } from '../core/presentation';
import type { RankingClient } from '../rankings/RankingClient';
import { RankingHttpError } from '../rankings/request';

const copy = ui.classMembership;

export function classMembership(client: RankingClient) {
  const section = document.createElement('section');
  section.className = 'parent-zone-preferences';
  const title = document.createElement('h3');
  title.textContent = copy.title;
  const form = document.createElement('form');
  form.className = 'parent-zone-setting class-membership-form';
  const label = document.createElement('label');
  label.textContent = copy.code;
  const input = document.createElement('input');
  input.required = true;
  input.maxLength = classCodeLength;
  input.pattern = `[${classCodeAlphabet}${classCodeAlphabet.toLowerCase()}]{${classCodeLength}}`;
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.spellcheck = false;
  input.setAttribute('aria-describedby', 'parent-class-help');
  label.append(input);
  const join = document.createElement('button');
  join.textContent = copy.join;
  const leave = document.createElement('button');
  leave.type = 'button';
  leave.textContent = copy.leave;
  const help = document.createElement('small');
  help.id = 'parent-class-help';
  const status = document.createElement('small');
  status.setAttribute('role', 'status');

  let busy = false;
  function refresh() {
    section.hidden = !client.enabled && !client.classJoined;
    form.hidden = client.classJoined || !client.enabled;
    leave.hidden = !client.classJoined;
    input.disabled = join.disabled = leave.disabled = busy;
    help.textContent = client.classJoined
      ? client.enabled
        ? copy.joined
        : copy.paused
      : copy.help;
  }

  async function update(action: () => Promise<unknown>) {
    busy = true;
    status.textContent = copy.working;
    refresh();
    try {
      await action();
      input.value = '';
      status.textContent = '';
    } catch (error) {
      status.textContent =
        error instanceof RankingHttpError
          ? error.status === 404
            ? copy.invalidCode
            : error.status === 409
              ? copy.conflict
              : error.status === 429
                ? copy.rateLimit
                : copy.unavailable
          : copy.unavailable;
    } finally {
      busy = false;
      refresh();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void update(() => client.joinClass(input.value));
  });
  leave.addEventListener('click', () => void update(() => client.leaveClass()));
  form.append(label, join);
  section.append(title, help, form, leave, status);
  refresh();
  if (client.enabled && client.classJoined) {
    void client
      .refreshClassMembership()
      .then(refresh)
      .catch(() => {});
  }
  return { section, refresh };
}

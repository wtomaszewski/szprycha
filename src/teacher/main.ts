import type { ClassInfo } from '../content/classes';
import { moduleId } from '../content/schemas';
import { ui } from '../core/presentation';
import { rankingUrl } from '../platform/parentZoneConfig';
import { RankingHttpError } from '../rankings/request';
import { TeacherClient } from './TeacherClient';
import {
  classLabels,
  clearClassLabels,
  maxLabelLength,
  setLabel,
} from './labels';
import './teacher.css';

const copy = ui.teacher;
const classCopy = ui.classMembership;
const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') =>
  Object.assign(document.createElement(tag), { textContent: text });
const button = (text: string) =>
  Object.assign(node('button', text), { type: 'button' });
const wrap = (className: string, ...children: Nodes[]) => {
  const element = node('div');
  element.className = className;
  element.append(...children);
  return element;
};
type Nodes = Node | string;
function label(text: string, input: HTMLElement) {
  const element = node('label', text);
  element.append(input);
  return element;
}
function action(text: string, run: () => void, danger = false) {
  const element = button(text);
  element.classList.toggle('danger', danger);
  element.addEventListener('click', run);
  return element;
}

document.title = `${copy.title} · ${ui.title}`;
const root = document.querySelector<HTMLElement>('#teacher')!;
const heading = node('header');
const brand = node('p', ui.title);
const title = node('h1', copy.title);
heading.append(brand, title);
const status = node('p');
status.className = 'status';
status.setAttribute('role', 'status');
const view = node('div');
root.append(heading, status, view);

const url = rankingUrl(import.meta.env.VITE_RANKING_URL);
if (url) setup(new TeacherClient(url));
else view.append(node('p', copy.disabled));

function setup(client: TeacherClient) {
  type Board = Awaited<ReturnType<TeacherClient['board']>>;
  let classes: ClassInfo[] = [];
  let board: Board | undefined;
  let busy = false;

  async function run(task: () => Promise<void>, signIn = false) {
    if (busy) return;
    busy = true;
    status.textContent = copy.working;
    try {
      await task();
      if (status.textContent === copy.working) status.textContent = '';
    } catch (error) {
      const code = error instanceof RankingHttpError ? error.status : 0;
      if (code === 401 && !signIn) {
        client.clearSession();
        showAuth();
        status.textContent = copy.sessionEnded;
      } else if (code === 404 && board) {
        board = undefined;
        classes = [];
        showClasses();
        status.textContent = copy.classMissing;
      } else {
        status.textContent =
          code === 401
            ? copy.invalidCredentials
            : code === 409 && signIn
              ? copy.accountUnavailable
              : code === 429
                ? classCopy.rateLimit
                : copy.unavailable;
      }
    } finally {
      busy = false;
    }
  }

  async function reload(id?: string) {
    classes = await client.classes();
    const target = classes.find((entry) => entry.id === id) ?? classes[0];
    board = target ? await client.board(target.id) : undefined;
    showClasses();
  }

  function showAuth(register = false) {
    classes = [];
    board = undefined;
    const form = node('form');
    form.className = 'card auth';
    const email = node('input');
    email.type = 'email';
    email.autocomplete = 'username';
    email.required = true;
    email.maxLength = 254;
    const password = node('input');
    password.type = 'password';
    password.autocomplete = register ? 'new-password' : 'current-password';
    password.required = true;
    password.minLength = 12;
    password.maxLength = 128;
    const adult = node('input');
    adult.type = 'checkbox';
    adult.required = true;
    const consent = label(copy.adult, adult);
    consent.className = 'consent';
    const submit = button(register ? copy.register : copy.login);
    submit.className = 'primary';
    submit.type = 'submit';
    const switchMode = action(register ? copy.login : copy.register, () => {
      if (busy) return;
      status.textContent = '';
      showAuth(!register);
    });
    form.append(
      node('h2', register ? copy.register : copy.login),
      label(copy.email, email),
      label(copy.password, password),
    );
    if (register) form.append(node('small', copy.passwordHint), consent);
    form.append(wrap('actions', submit, switchMode));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void run(async () => {
        try {
          await client.signIn(email.value.trim(), password.value, register);
          showClasses();
          await reload();
        } finally {
          password.value = '';
        }
      }, true);
    });
    view.replaceChildren(form);
  }

  function cleanup(id: string) {
    try {
      clearClassLabels(localStorage, id);
    } catch {
      status.textContent = copy.labelsUnavailable;
    }
  }

  function showClasses() {
    const sidebar = node('aside');
    sidebar.className = 'card sidebar';
    const list = node('nav');
    list.setAttribute('aria-label', copy.classes);
    for (const entry of classes) {
      const select = action(
        entry.name,
        () =>
          void run(async () => {
            board = await client.board(entry.id);
            showClasses();
          }),
      );
      if (board?.id === entry.id) select.setAttribute('aria-current', 'true');
      list.append(select);
    }

    const form = node('form');
    const name = node('input');
    name.required = true;
    name.maxLength = 48;
    const submit = button(copy.create);
    submit.type = 'submit';
    form.append(label(copy.className, name), submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void run(async () => {
        const entry = await client.create(name.value.trim());
        classes.push(entry);
        board = { ...entry, rows: [] };
        showClasses();
      });
    });
    sidebar.append(node('h2', copy.classes), list, form);
    const refresh = action(
      copy.refresh,
      () => void run(() => reload(board?.id)),
    );
    const logout = action(
      copy.logout,
      () =>
        void run(async () => {
          try {
            await client.logout();
          } finally {
            showAuth();
          }
        }),
    );
    const remove = action(
      copy.deleteAccount,
      () => {
        if (busy || !window.confirm(copy.confirmDeleteAccount)) return;
        void run(async () => {
          const owned = await client.classes();
          await client.deleteAccount();
          status.textContent = copy.accountDeleted;
          for (const { id } of owned) cleanup(id);
          showAuth();
        });
      },
      true,
    );
    const layout = wrap(
      'layout',
      sidebar,
      board ? classroom(board) : wrap('card empty', copy.noClasses),
    );
    view.replaceChildren(wrap('toolbar', refresh, logout, remove), layout);
  }

  function classroom(current: Board) {
    const { id, name, code, rows } = current;
    const codeActions = (open: boolean) =>
      void run(async () => {
        const info = await client.code(id, open);
        board = { ...current, ...info };
        showClasses();
      });
    const codeArea = node('section');
    codeArea.className = 'code-area';
    codeArea.append(node('h3', classCopy.code));
    if (code) {
      const codeValue = node('output', code);
      codeValue.setAttribute('aria-label', classCopy.code);
      const copyCode = action(
        copy.copyCode,
        () =>
          void run(async () => {
            await navigator.clipboard.writeText(code);
            status.textContent = copy.copied;
          }),
      );
      codeArea.append(
        wrap('code-value', codeValue, copyCode),
        node('p', copy.codeHelp),
      );
    } else codeArea.append(node('p', copy.codeClosed));
    const newCode = action(copy.rotateCode, () => codeActions(true));
    const codeButtons = wrap('actions', newCode);
    if (code)
      codeButtons.append(action(copy.closeCode, () => codeActions(false)));
    codeArea.append(codeButtons);

    const content = node('section');
    content.className = 'card classroom';
    const reset = action(copy.reset, () => {
      if (busy || !window.confirm(copy.confirmReset)) return;
      void run(async () => {
        await client.reset(id);
        board = await client.board(id);
        showClasses();
      });
    });
    reset.disabled = !rows.length;
    const remove = action(
      copy.deleteClass,
      () => {
        if (busy || !window.confirm(copy.confirmDeleteClass)) return;
        void run(async () => {
          await client.deleteClass(id);
          cleanup(id);
          board = undefined;
          classes = classes.filter((entry) => entry.id !== id);
          showClasses();
        });
      },
      true,
    );
    content.append(node('h2', name), codeArea, node('h3', copy.board));
    const table = roster(current);
    if (rows.length) content.append(node('p', copy.labelsHelp), table);
    else content.append(node('p', copy.noStudents));
    content.append(wrap('actions class-actions', reset, remove));
    return content;
  }

  function roster({ id, rows }: Board) {
    let labels: Map<string, string> | undefined;
    try {
      labels = classLabels(
        localStorage,
        id,
        rows.map(({ memberId }) => memberId),
      );
    } catch {
      status.textContent = copy.labelsUnavailable;
    }
    const table = node('table');
    table.setAttribute('aria-label', copy.board);
    const head = table.createTHead().insertRow();
    const columns = [
      ui.rankings.place,
      ui.rankings.player,
      copy.label,
      classCopy.xp,
      ...moduleId.options.map((module) => ui.skillMap.modules[module]),
    ];
    for (const title of columns) {
      const cell = node('th', title);
      cell.scope = 'col';
      head.append(cell);
    }
    const body = table.createTBody();
    for (const { nickname, memberId, position, xp, mastery } of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = String(position);
      const name = node('th', nickname);
      name.scope = 'row';
      row.append(name);
      const input = node('input');
      input.type = 'text';
      input.value = labels?.get(memberId) ?? '';
      input.maxLength = maxLabelLength;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute(
        'aria-label',
        copy.labelFor
          .replace('{nickname}', nickname)
          .replace('{position}', String(position)),
      );
      input.addEventListener('input', () => {
        try {
          setLabel(localStorage, id, memberId, input.value);
        } catch {
          status.textContent = copy.labelsUnavailable;
        }
      });
      row.insertCell().append(input);
      row.insertCell().textContent = format.format(xp);
      for (const module of moduleId.options)
        row.insertCell().textContent = format.format(mastery[module]);
    }
    const scroll = wrap('table-scroll', table);
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', copy.board);
    return scroll;
  }

  showAuth();
}

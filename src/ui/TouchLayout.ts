import { ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';
import {
  placActions,
  touchActions,
  type TouchAction,
} from '../core/touchLayout';

export const touchSymbols: Record<TouchAction, string> = {
  left: '☚',
  brake: '■',
  look: '◉',
  right: '☛',
  bell: '🔔',
  lights: '☀',
  dismount: '⇅',
};

const labels: Record<TouchAction, string> = {
  left: ui.driving.signalLeft,
  brake: ui.driving.brake,
  look: ui.driving.look,
  right: ui.driving.signalRight,
  bell: ui.driving.bell,
  lights: ui.driving.lights,
  dismount: ui.driving.dismount,
};

export function positionTouchActions(
  store: ProgressStore,
  buttons: ReadonlyMap<TouchAction, HTMLButtonElement>,
  plac = false,
) {
  const order = store.profile.touchLayout ?? touchActions;
  const slots = plac
    ? order.filter((action) => placActions.includes(action))
    : order;
  slots.forEach((action, index) => {
    const button = buttons.get(action);
    if (button) button.dataset.slot = String(index);
  });
}

export function touchLayoutEditor(store: ProgressStore, update?: () => void) {
  const labelsUi = ui.touchLayout;
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'touch-layout-open';
  open.textContent = labelsUi.title;
  open.setAttribute('aria-haspopup', 'dialog');

  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog touch-editor';
  dialog.setAttribute('aria-label', labelsUi.title);
  const title = document.createElement('h2');
  title.textContent = labelsUi.title;
  const help = document.createElement('p');
  help.textContent = labelsUi.help;
  const grid = document.createElement('div');
  grid.className = 'touch-actions';
  // Keep a drag across the editor from starting a browser gesture.
  grid.addEventListener(
    'touchmove',
    (event) => {
      if (event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
  const joystick = document.createElement('span');
  joystick.className = 'joystick';
  joystick.textContent = '✥';
  joystick.setAttribute('aria-label', ui.driving.joystick);
  const selection = document.createElement('output');
  const buttons = new Map<TouchAction, HTMLButtonElement>();
  let selected: TouchAction | undefined;

  function select(action?: TouchAction) {
    selected = action;
    selection.textContent = action ? labels[action] : '';
    for (const [id, button] of buttons)
      button.setAttribute('aria-pressed', String(id === action));
  }

  function swap(first: TouchAction, second: TouchAction) {
    if (first !== second) {
      store.change((profile) => {
        const order = [...(profile.touchLayout ?? touchActions)];
        const a = order.indexOf(first);
        const b = order.indexOf(second);
        [order[a], order[b]] = [order[b]!, order[a]!];
        profile.touchLayout = order;
      });
      positionTouchActions(store, buttons);
      update?.();
    }
    select();
  }

  for (const action of touchActions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.touchAction = action;
    button.textContent = touchSymbols[action];
    button.setAttribute('aria-label', labels[action]);
    button.title = labels[action];
    let pointer: number | undefined;
    let dragged = false;

    function target(event: PointerEvent) {
      return document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLButtonElement>('[data-touch-action]');
    }

    button.addEventListener('click', (event) => {
      if (dragged && event.detail) return;
      if (selected === action) select();
      else if (selected) swap(selected, action);
      else select(action);
    });
    button.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      dragged = false;
      pointer = event.pointerId;
      button.setPointerCapture(pointer);
    });
    button.addEventListener('pointermove', (event) => {
      if (pointer !== event.pointerId) return;
      const over = target(event);
      dragged ||= over !== button;
      if (dragged) select(action);
      for (const candidate of buttons.values())
        candidate.toggleAttribute(
          'data-drop-target',
          dragged && candidate !== button && over === candidate,
        );
    });
    button.addEventListener('pointerup', (event) => {
      if (pointer !== event.pointerId || !dragged) return;
      const over = target(event);
      for (const [id, candidate] of buttons)
        if (over === candidate) swap(action, id);
      select();
    });
    button.addEventListener('lostpointercapture', () => {
      pointer = undefined;
      if (dragged) select();
      for (const candidate of buttons.values())
        candidate.removeAttribute('data-drop-target');
    });

    buttons.set(action, button);
    grid.append(button);
  }
  grid.prepend(joystick);
  const footer = document.createElement('footer');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = labelsUi.reset;
  reset.addEventListener('click', () => {
    store.change((profile) => {
      delete profile.touchLayout;
    });
    positionTouchActions(store, buttons);
    select();
    update?.();
  });
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = labelsUi.done;
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  footer.append(reset, close);
  dialog.append(title, help, grid, selection, footer);
  open.addEventListener('click', () => {
    positionTouchActions(store, buttons);
    select();
    dialog.showModal();
  });
  return { open, dialog };
}

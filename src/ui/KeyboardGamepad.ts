const controls = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[tabindex]',
].join(',');

function focusable(scope: HTMLElement) {
  return Array.from(scope.querySelectorAll<HTMLElement>(controls)).filter(
    (element) =>
      !element.matches(':disabled, [tabindex^="-"]') &&
      !element.closest('[hidden], [inert]') &&
      (!element.closest('details:not([open])') ||
        element.matches('details > summary')) &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility === 'visible',
  );
}

let lastModal: HTMLDialogElement | undefined;

export function activeDialog() {
  if (lastModal?.matches(':modal')) return lastModal;
  return Array.from(
    document.querySelectorAll<HTMLDialogElement>('dialog:modal'),
  ).at(-1);
}

export function enableDialogFocus() {
  const clearGamepadFocus = () =>
    document.documentElement.removeAttribute('data-gamepad-navigation');
  document.addEventListener('pointerdown', clearGamepadFocus, {
    capture: true,
  });
  document.addEventListener('keydown', clearGamepadFocus, { capture: true });
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    lastModal =
      event.target.closest<HTMLDialogElement>('dialog:modal') ?? undefined;
  });
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const dialog = activeDialog();
      if (!dialog) return;
      const items = focusable(dialog);
      const active = document.activeElement;
      const atBoundary = active === (event.shiftKey ? items[0] : items.at(-1));
      if (atBoundary || !dialog.contains(active) || !items.length) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) : items[0])?.focus();
      }
    },
    { capture: true },
  );
}

export function showGamepadFocus() {
  document.documentElement.setAttribute('data-gamepad-navigation', '');
}

export type ButtonEdge = (index: number) => boolean;

export function connectedGamepad() {
  return navigator.getGamepads?.().find((pad) => pad?.connected);
}

function gamepadFocus(scope: HTMLElement, direction: number) {
  const items = focusable(scope);
  const index = items.findIndex((item) => item === document.activeElement);
  const next =
    index < 0
      ? direction > 0
        ? 0
        : items.length - 1
      : (index + direction + items.length) % items.length;
  items[next]?.focus();
}

function adjustValue(element: Element | null, direction: number) {
  if (element instanceof HTMLSelectElement) {
    const options = [...element.options].filter((option) => !option.disabled);
    const index = options.findIndex((option) => option.selected);
    const next = options[(index + direction + options.length) % options.length];
    if (next) element.value = next.value;
  } else if (element instanceof HTMLInputElement && element.type === 'range') {
    const step = Math.max(
      1,
      Math.round((Number(element.max) - Number(element.min)) / 20),
    );
    if (direction > 0) element.stepUp(step);
    else element.stepDown(step);
  } else {
    return false;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

export function gamepadMenu(scope: HTMLElement, justPressed: ButtonEdge) {
  if (![0, 12, 13, 14, 15].some(justPressed)) return;
  showGamepadFocus();
  const active = scope.contains(document.activeElement)
    ? document.activeElement
    : null;
  if (justPressed(12) || justPressed(13)) {
    gamepadFocus(scope, justPressed(12) ? -1 : 1);
    return;
  }
  if (justPressed(14) || justPressed(15)) {
    const direction = justPressed(14) ? -1 : 1;
    if (!adjustValue(active, direction)) {
      const tablist = active?.closest<HTMLElement>('[role="tablist"]');
      if (tablist && active?.matches('[role="tab"]')) {
        const tabs = Array.from(
          tablist.querySelectorAll<HTMLElement>('[role="tab"]'),
        );
        const next =
          tabs[
            (tabs.indexOf(active as HTMLElement) + direction + tabs.length) %
              tabs.length
          ];
        next?.click();
        next?.focus();
      } else gamepadFocus(scope, direction);
    }
    return;
  }
  if (justPressed(0)) {
    if (active instanceof HTMLSelectElement) adjustValue(active, 1);
    else if (active instanceof HTMLElement && focusable(scope).includes(active))
      active.click();
    else gamepadFocus(scope, 1);
  }
}

export function cancelDialog(dialog: HTMLDialogElement) {
  if (dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
    dialog.close();
}

export function menuGamepad(scope: HTMLElement, back?: () => void) {
  const read = () => {
    const pad = connectedGamepad();
    const buttons = pad?.buttons.map((button) => button.pressed) ?? [];
    const x = pad?.axes[0] ?? 0;
    const y = pad?.axes[1] ?? 0;
    for (const [index, direction] of [
      y < -0.55,
      y > 0.55,
      x < -0.55,
      x > 0.55,
    ].entries())
      buttons[index + 12] ||= direction;
    return buttons;
  };
  let previous = read();
  return () => {
    const current = read();
    const prior = previous;
    previous = current;
    const edge = (index: number) => Boolean(current[index] && !prior[index]);
    if (![0, 1, 12, 13, 14, 15].some(edge)) return;
    const dialog = activeDialog();
    if (edge(1)) {
      if (dialog) cancelDialog(dialog);
      else back?.();
    } else gamepadMenu(dialog ?? scope, edge);
  };
}

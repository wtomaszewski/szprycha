import type { Locator, Page } from '@playwright/test';
import pl from '../../../i18n/pl.json' with { type: 'json' };

const labels = pl.parentZone;

export function parentZone(page: Page) {
  return {
    open: page.getByRole('button', { name: labels.title, exact: true }),
    gate: page.getByRole('dialog', { name: labels.gateTitle }),
    settings: page.getByRole('dialog', { name: labels.title }),
  };
}

export async function answer(
  gate: Locator,
  activate: (button: Locator) => Promise<void>,
) {
  const question = await gate.getByText(/^\d+ × \d+ =$/).textContent();
  const [first, second] = question!.match(/\d+/g)!.map(Number);
  for (const digit of String(first! * second!))
    await activate(gate.getByRole('button', { name: digit, exact: true }));
  await activate(gate.getByRole('button', { name: labels.confirm }));
}

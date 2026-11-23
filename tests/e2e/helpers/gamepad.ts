import type { Page } from '@playwright/test';

export async function mockGamepad(page: Page) {
  await page.addInitScript(() => {
    type GamepadSample = { button: number; sampled: () => void };
    let button = -1;
    let sampled: (() => void) | undefined;

    window.addEventListener('test:gamepad', (event) => {
      const { detail } = event as CustomEvent<GamepadSample>;
      button = detail.button;
      sampled = detail.sampled;
    });

    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        const buttons = Array.from({ length: 17 }, (_, index) => ({
          pressed: index === button,
        }));
        sampled?.();
        sampled = undefined;
        return [{ connected: true, axes: [0, 0], buttons }];
      },
    });
  });

  // Keep each state in place until the game polls it.
  const setButton = (button: number) =>
    page.evaluate(
      (index) =>
        new Promise<void>((sampled) => {
          window.dispatchEvent(
            new CustomEvent('test:gamepad', {
              detail: { button: index, sampled },
            }),
          );
        }),
      button,
    );

  return {
    setButton,
    async tap(button: number) {
      await setButton(button);
      await setButton(-1);
    },
  };
}

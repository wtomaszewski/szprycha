import type { Page } from '@playwright/test';

export async function mockGamepad(page: Page) {
  await page.addInitScript(() => {
    type GamepadSample = {
      button: number;
      axes: [number, number];
      sampled: () => void;
    };
    let button = -1;
    let axes = [0, 0];
    let sampled: (() => void) | undefined;

    window.addEventListener('test:gamepad', (event) => {
      const { detail } = event as CustomEvent<GamepadSample>;
      button = detail.button;
      axes = detail.axes;
      sampled = detail.sampled;
    });

    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        const buttons = Array.from({ length: 17 }, (_, index) => ({
          pressed: index === button,
        }));
        sampled?.();
        sampled = undefined;
        return [{ connected: true, axes, buttons }];
      },
    });
  });

  // Keep each state in place until the game polls it.
  const sample = (button: number, axes: [number, number] = [0, 0]) =>
    page.evaluate(
      ({ button, axes }) =>
        new Promise<void>((sampled) => {
          window.dispatchEvent(
            new CustomEvent('test:gamepad', {
              detail: { button, axes, sampled },
            }),
          );
        }),
      { button, axes },
    );

  return {
    setButton: (button: number) => sample(button),
    setAxes: (x: number, y: number) => sample(-1, [x, y]),
    async tap(button: number) {
      await sample(button);
      await sample(-1);
    },
  };
}

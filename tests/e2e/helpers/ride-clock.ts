import type { Page } from '@playwright/test';

export async function installRideClock(page: Page) {
  // Phaser uses both the animation frame timestamp and performance.now().
  await page.addInitScript(() => {
    let rate = 1;
    const wallTime = performance.now.bind(performance);
    let lastWallTime = wallTime();
    let gameTime = lastWallTime;
    const now = () => {
      const current = wallTime();
      gameTime += (current - lastWallTime) * rate;
      lastWallTime = current;
      return gameTime;
    };
    const raf = window.requestAnimationFrame.bind(window);
    Object.defineProperty(performance, 'now', { value: now });
    window.requestAnimationFrame = (callback) => raf(() => callback(now()));
    window.addEventListener('test:ride-rate', (event) => {
      now();
      rate = (event as CustomEvent<number>).detail;
    });
  });
}

export async function setRideClockRate(page: Page, rate: number) {
  await page.evaluate((detail) => {
    window.dispatchEvent(new CustomEvent('test:ride-rate', { detail }));
  }, rate);
}

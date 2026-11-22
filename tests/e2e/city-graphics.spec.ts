import { expect, test } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

test('desktop HUD uses the mission timer, goal arrow and compact pause menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: pl.misje['WAW-T-01'].tytul }).click();
  await page.getByRole('button', { name: pl.dialogueUi.skip }).click();

  const left = page.locator('.ride-hud-left');
  await expect(left.getByLabel(pl.rideHud.points)).toHaveText('0');
  await expect(left.getByLabel(pl.rideHud.combo)).toHaveText('×1');
  const right = page.locator('.ride-hud-right');
  await expect(right.getByLabel(`${pl.rideHud.attention} 0/3`)).toBeVisible();
  await expect(right.getByLabel(pl.missionUi.timer)).toBeVisible();
  await expect(
    page.getByLabel(new RegExp(pl.missionUi.direction)),
  ).toBeVisible();
  await expect(page.getByLabel(pl.driving.joystick)).toBeHidden();
  await expect(page.getByText(pl.driving.help, { exact: false })).toBeHidden();
  await expect(left).toHaveCSS('font-family', '"Pixelify Sans", monospace');

  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: pl.driving.paused });
  await expect(
    pause.getByText(pl.driving.help, { exact: false }),
  ).toBeVisible();
  await expect(
    pause.getByRole('button', { name: pl.driving.resume }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();
  await expect(
    page.getByRole('button', { name: pl.driving.pause }),
  ).toBeFocused();
});

test.describe('touch HUD', () => {
  test.use({
    viewport: { width: 640, height: 360 },
    hasTouch: true,
    isMobile: true,
  });

  test('shows the joystick and touch actions alongside the HUD', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: pl.driving.praga }).tap();
    const joystick = page.getByLabel(pl.driving.joystick);
    await expect(joystick).toBeVisible();
    const [stick, dock, actions] = await Promise.all([
      joystick.boundingBox(),
      page.locator('.ride-quick-actions').boundingBox(),
      page.locator('.touch-actions').boundingBox(),
    ]);
    expect(stick!.x + stick!.width).toBeLessThan(dock!.x);
    expect(dock!.x + dock!.width).toBeLessThan(actions!.x);
    const lights = page.getByRole('button', {
      name: pl.driving.lights,
      exact: true,
    });
    await lights.tap();
    await expect(lights).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('img', { name: pl.rideHud.lightsOn }),
    ).toBeVisible();
    await page.getByRole('button', { name: pl.driving.pause }).tap();
    const pause = page.getByRole('dialog', { name: pl.driving.paused });
    await expect(
      pause.getByRole('button', { name: pl.driving.simple }),
    ).toBeVisible();
    await pause.getByRole('button', { name: pl.driving.resume }).tap();
    await page.getByRole('button', { name: pl.phone.open }).tap();
    await expect(
      page.getByRole('dialog', { name: pl.phone.title }),
    ).toBeVisible();
  });
});

test('rain freezes with reduced motion and night preview leaves the rules in daytime', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Inspect the generated rain pattern's offset in the Canvas renderer.
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply(target, element, args) {
        return args[0].includes('webgl')
          ? null
          : Reflect.apply(target, element, args);
      },
    });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (
      x,
      y,
      width,
      height,
    ) {
      if (
        this.fillStyle instanceof CanvasPattern &&
        !this.canvas.isConnected &&
        width > 640
      )
        document.documentElement.dataset.rainOffset = String(
          this.getTransform().f,
        );
      fill.call(this, x, y, width, height);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: pl.driving.praga }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-lighting', 'day');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: pl.driving.rain, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('img', { name: pl.rideHud.rain })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-rain-offset', '0');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-rain-offset',
    /^[1-9]\d*$/,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-rain-offset', '0');

  await page.keyboard.press('F3');
  await page.getByRole('button', { name: pl.driving.previewNight }).click();
  await expect(canvas).toHaveAttribute('data-lighting', 'night');
  await expect(
    page.getByRole('img', { name: pl.rideHud.lightsOff }),
  ).toBeVisible();
  const start = Number(await canvas.getAttribute('data-x'));
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-x')))
    .toBeGreaterThan(start + 18);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('Space');
  await expect(page.getByLabel(`${pl.rideHud.attention} 0/3`)).toBeVisible();
  await expect(page.getByLabel(pl.rules.debug.title)).not.toContainText(
    /WYP-04|WYP-05|MSC-04/,
  );
});

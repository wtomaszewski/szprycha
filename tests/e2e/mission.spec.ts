import { test, expect, type Page } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

const tutorial = pl.misje['WAW-T-01'];
const dialogue = (page: Page) =>
  page.getByRole('dialog', { name: pl.dialogueUi.title });
const skipDialogue = (page: Page) =>
  dialogue(page).getByRole('button', { name: pl.dialogueUi.skip }).click();

test('starts WAW-T-01 from the menu with a visible goal arrow and timer', async ({
  page,
}) => {
  await page.goto('/');
  const start = page.getByRole('button', { name: pl.misje['WAW-T-01'].tytul });
  await expect(start).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-menu.png' });
  await start.press('Enter');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'City');
  await skipDialogue(page);
  const arrow = page.getByRole('img', {
    name: new RegExp(pl.missionUi.direction),
  });
  await expect(arrow).toBeVisible();
  await expect(arrow).toHaveAttribute('aria-label', /\d+ m$/);
  const timer = page.getByLabel(pl.missionUi.timer);
  await expect(timer).toHaveText(/1:[0-2]\d/);
  const helmet = page.getByRole('button', { name: pl.missionUi.equip });
  await expect(helmet).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-tutorial.png' });
  await helmet.click();
  await expect(helmet).toBeHidden();
  await expect(page.getByText(pl.misje['WAW-T-01'].jazda)).toBeVisible();
  await expect(arrow).toBeVisible();
});

test('recovers from a helmet mistake and finishes after stopping at B-20', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: pl.misje['WAW-T-01'].tytul }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await skipDialogue(page);
  await page.keyboard.down('ArrowUp');
  const resume = page.getByRole('button', { name: pl.missionUi.continue });
  await expect(resume).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await expect(page.locator('.rule-feedback')).toHaveAttribute(
    'data-kind',
    'major',
  );
  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await resume.click();

  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1184);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skipDialogue(page);
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(pl.missionUi.noTimeBonus, { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/m4a-result.png' });
  await page.getByRole('button', { name: pl.missionUi.retry }).click();
  await expect(dialogue(page)).toContainText(pl.dialogi['WAW-T-01'].powitanie);
  await skipDialogue(page);
  await expect(
    page.getByRole('button', { name: pl.missionUi.equip }),
  ).toBeVisible();
});

test('shows the STOP retry hint and completes the tutorial after a full stop', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: tutorial.tytul }).click();
  await skipDialogue(page);
  await page.getByRole('button', { name: pl.missionUi.equip }).click();

  const canvas = page.locator('canvas');
  const resume = page.getByRole('button', { name: pl.missionUi.continue });
  await page.keyboard.down('ArrowUp');
  await expect(resume).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('ArrowUp');
  await expect(
    page.getByText(tutorial.powrot_stop, { exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute('data-y', '1199');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await resume.click();
  await expect(resume).toBeHidden();
  await expect(page.getByText(tutorial.stop, { exact: true })).toBeVisible();

  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1218);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(dialogue(page)).toBeVisible();
  await page.keyboard.up('ArrowUp');
  await skipDialogue(page);
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();
});

test('opens SzprychaApp at a stop and plays the opening and closing dialogues', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
  await page.keyboard.press('Enter');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'City');

  const phone = page.getByRole('dialog', { name: pl.phone.title });
  const openPhone = page.getByRole('button', { name: pl.phone.open });
  await page.keyboard.down('ArrowUp');
  await expect(canvas).not.toHaveAttribute('data-speed', '0');
  await page.keyboard.press('KeyM');
  await expect(phone).toBeHidden();
  await expect(page.locator('.drive-notice')).toBeVisible();
  await expect(page.locator('.drive-notice')).not.toHaveText(
    pl.driving.prototype,
  );
  await openPhone.click();
  await expect(phone).toBeHidden();
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.keyboard.up('Space');

  await page.keyboard.press('KeyM');
  await expect(phone).toBeVisible();
  await expect(phone.getByText(tutorial.opis)).toBeVisible();
  await page.screenshot({
    path: 'test-results/m4b-szprychaapp.png',
    animations: 'disabled',
  });
  await phone.getByRole('button', { name: new RegExp(pl.phone.start) }).click();
  const conversation = dialogue(page);
  const text = conversation.locator('.dialogue-text');
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await expect(conversation.locator('.dialogue-portrait')).toHaveCSS(
    'width',
    '64px',
  );
  await expect(conversation.locator('.dialogue-portrait')).toHaveCSS(
    'height',
    '64px',
  );
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText('1:30');
  await page.keyboard.down('ArrowUp');
  await page.screenshot({ path: 'test-results/m4b-dialogue.png' });
  await expect(page.getByLabel(pl.missionUi.timer)).toHaveText('1:30');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(text).toHaveText(pl.dialogi.reguly['ZNAK-STOP']);
  const next = conversation.getByRole('button', { name: pl.dialogueUi.next });
  await next.click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].powitanie);
  await next.click();
  await expect(conversation).toBeHidden();

  await page.getByRole('button', { name: pl.missionUi.equip }).click();
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-y')), {
      intervals: [25, 50, 75],
    })
    .toBeGreaterThanOrEqual(1184);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-speed', '0');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].meta);
  await page.keyboard.up('ArrowUp');
  await page.screenshot({ path: 'test-results/m4b-dialogue-end.png' });
  await next.click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].po_mecie);
  await next.click();
  await expect(
    page.getByText(pl.missionUi.completed, { exact: true }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: tutorial.tytul }).click();
  await expect(text).toHaveText(pl.dialogi['WAW-T-01'].powitanie);
});

test('uses Select and A on a gamepad without passing A through to the bicycle', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { button: -1 };
    window.addEventListener('test:gamepad', (event) => {
      state.button = (event as CustomEvent<number>).detail;
    });
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          connected: true,
          axes: [0, 0],
          buttons: Array.from({ length: 17 }, (_, i) => ({
            pressed: i === state.button,
          })),
        },
      ],
    });
  });
  const press = (button: number) =>
    page.evaluate((detail) => {
      window.dispatchEvent(new CustomEvent('test:gamepad', { detail }));
    }, button);

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', 'MainMenu');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-scene', 'City');
  await press(8);
  await expect(
    page.getByRole('dialog', { name: pl.phone.title }),
  ).toBeVisible();
  await press(0);
  const text = dialogue(page).locator('.dialogue-text');
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await press(-1);
  await page.waitForTimeout(100);
  await expect(text).toHaveText(pl.dialogi.reguly['KASK-01']);
  await press(0);
  await page.waitForTimeout(100);
  await press(-1);
  await expect(text).toHaveText(pl.dialogi.reguly['ZNAK-STOP']);
  await press(0);
  await expect(dialogue(page)).toBeHidden();
  await press(-1);
  await expect(canvas).toHaveAttribute('data-walking', 'false');
});

test.describe('touch dialogue controls', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('opens the phone and skips the dialogue with a long press', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-scene',
      'MainMenu',
    );
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: pl.phone.open }).tap();
    const phone = page.getByRole('dialog', { name: pl.phone.title });
    await phone.getByRole('button', { name: new RegExp(pl.phone.start) }).tap();
    const next = dialogue(page).getByRole('button', {
      name: pl.dialogueUi.next,
    });
    await next.tap();
    await expect(dialogue(page).locator('.dialogue-text')).toHaveText(
      pl.dialogi.reguly['ZNAK-STOP'],
    );
    const box = (await next.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await expect(dialogue(page)).toBeHidden();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(
      page.getByRole('button', { name: pl.missionUi.equip }),
    ).toBeVisible();
  });
});

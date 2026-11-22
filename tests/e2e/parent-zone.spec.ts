import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

const labels = pl.parentZone;

function parentZone(page: Page) {
  return {
    open: page.getByRole('button', { name: labels.title, exact: true }),
    gate: page.getByRole('dialog', { name: labels.gateTitle }),
    settings: page.getByRole('dialog', { name: labels.title }),
  };
}

async function answer(
  gate: Locator,
  activate: (button: Locator) => Promise<void>,
) {
  const question = await gate.getByText(/^\d+ × \d+ =$/).textContent();
  const [first, second] = question!.match(/\d+/g)!.map(Number);
  for (const digit of String(first! * second!))
    await activate(gate.getByRole('button', { name: digit, exact: true }));
  await activate(gate.getByRole('button', { name: labels.confirm }));
}

async function screenshot(page: Page, name: string) {
  const info = test.info();
  const path = process.env.UPDATE_MOBILE_SCREENSHOTS
    ? `docs/screenshots/80-${name}.png`
    : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled', scale: 'css' });
  await info.attach(name, { path, contentType: 'image/png' });
}

const mobile = [
  {
    name: 'telefon',
    device: 'Pixel 7 landscape',
    viewport: { width: 640, height: 360 },
    target: 44,
  },
  {
    name: 'tablet',
    device: 'iPad (gen 7) landscape',
    viewport: { width: 1024, height: 768 },
    target: 56,
  },
] as const;
const insets = { top: 6, right: 24, bottom: 18, left: 36 };

for (const { name, device, viewport, target } of mobile) {
  test.describe(name, () => {
    const { userAgent, deviceScaleFactor, isMobile, hasTouch } =
      devices[device]!;
    test.use({
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      viewport,
      baseURL: 'http://127.0.0.1:4174',
    });

    test('opens the parent zone offline and saves local settings by touch', async ({
      page,
      context,
    }) => {
      await page.goto('/');
      const { open, gate, settings } = parentZone(page);
      await expect(open).toBeVisible();
      await page.waitForFunction(
        () => navigator.serviceWorker.controller !== null,
      );
      await context.setOffline(true);
      await page.reload();
      await page.evaluate((insets) => {
        for (const [edge, gap] of Object.entries(insets))
          document.documentElement.style.setProperty(
            `--safe-${edge}`,
            `${gap}px`,
          );
      }, insets);

      await open.tap();
      await expect(gate).toBeVisible();
      await expect(settings).toHaveCount(0);
      await expect(gate.getByRole('textbox')).toHaveCount(0);
      const keys = await gate
        .locator('.parent-gate button')
        .evaluateAll((buttons) =>
          buttons.map((button) => {
            const { width, height, top, right, bottom, left } =
              button.getBoundingClientRect();
            return { width, height, top, right, bottom, left };
          }),
        );
      for (const key of keys) {
        expect(key.width).toBeGreaterThanOrEqual(target);
        expect(key.height).toBeGreaterThanOrEqual(target);
        expect(key.left).toBeGreaterThanOrEqual(insets.left);
        expect(key.top).toBeGreaterThanOrEqual(insets.top);
        expect(key.right).toBeLessThanOrEqual(viewport.width - insets.right);
        expect(key.bottom).toBeLessThanOrEqual(viewport.height - insets.bottom);
      }
      await screenshot(page, `${name}-bramka`);
      await answer(gate, (button) => button.tap());

      const age = settings.getByRole('combobox', { name: labels.age });
      const reminder = settings.getByRole('combobox', {
        name: labels.breakReminder,
      });
      await expect(age).toHaveValue('');
      await expect(reminder).toHaveValue('30');
      await expect(
        settings.getByRole('checkbox', { name: labels.rankings }),
      ).toHaveCount(0);
      await expect(
        settings.getByRole('button', { name: labels.removeProfile }),
      ).toHaveCount(0);
      await expect(settings.getByRole('link')).toHaveCount(0);
      await age.selectOption('under10');
      await reminder.selectOption('15');
      await screenshot(page, `${name}-strefa-rodzica`);
      await reminder.selectOption('');

      const nickname = settings.locator('output');
      const first = await nickname.textContent();
      await settings.getByRole('button', { name: labels.reroll }).tap();
      await expect(nickname).not.toHaveText(first!);
      const saved = (await nickname.textContent())!;
      await settings.getByRole('button', { name: pl.m5c.close }).tap();

      const skills = page.getByRole('button', { name: pl.skillMap.title });
      await skills.tap();
      const skillsDialog = page.getByRole('dialog', {
        name: pl.skillMap.title,
      });
      await expect(skillsDialog.getByText(saved)).toBeVisible();
      await expect(skillsDialog.getByText(/^Do 16\. urodzin/)).toBeVisible();
      await expect(skillsDialog.getByText(/^Dziecko do 10 lat/)).toBeVisible();
      await skillsDialog.getByRole('button', { name: pl.skillMap.close }).tap();

      await page.reload();
      await open.tap();
      await expect(gate).toBeVisible();
      await answer(gate, (button) => button.tap());
      await expect(age).toHaveValue('under10');
      await expect(reminder).toHaveValue('');
      await expect(nickname).toHaveText(saved);
    });
  });
}

test('supports keyboard navigation, rejects a wrong answer and locks again on close', async ({
  page,
}) => {
  await page.goto('/');
  const { open, gate, settings } = parentZone(page);
  await open.press('Enter');
  await expect(gate.getByRole('button', { name: pl.m5c.close })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    gate.getByRole('button', { name: '1', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await gate.getByRole('button', { name: labels.confirm }).press('Enter');
  await expect(gate.getByText(labels.tryAgain)).toBeVisible();
  await expect(settings).toHaveCount(0);

  await answer(gate, (button) => button.press('Space'));
  await expect(
    settings.getByRole('heading', { name: labels.title }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await open.press('Space');
  await expect(gate).toBeVisible();
  await expect(settings).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-scene',
    'MainMenu',
  );
});

test('only exposes configured links and ranking controls behind the gate', async ({
  page,
}) => {
  const externalRequests: string[] = [];
  const appUrl = 'http://127.0.0.1:4175';
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== appUrl)
      externalRequests.push(request.url());
  });
  await page.goto(appUrl);
  const { open, gate, settings } = parentZone(page);
  const rankings = settings.getByRole('checkbox', { name: labels.rankings });
  const privacy = page.getByRole('link', { name: labels.privacy });
  const project = page.getByRole('link', { name: labels.project });
  await expect(privacy).toHaveCount(0);
  await open.click();
  await expect(privacy).toHaveCount(0);
  await expect(project).toHaveCount(0);
  await answer(gate, (button) => button.click());
  await expect(rankings).not.toBeChecked();
  await expect(
    settings.getByRole('button', { name: labels.removeProfile }),
  ).toBeDisabled();
  await expect(privacy).toHaveAttribute(
    'href',
    'https://project.example/privacy',
  );
  await expect(project).toHaveAttribute('href', 'https://project.example/');
  await expect(project).toHaveAttribute('rel', 'noopener noreferrer');
  await rankings.check();
  await settings.getByRole('button', { name: pl.m5c.close }).click();
  await expect(privacy).toHaveCount(0);
  await page.reload();
  await open.click();
  await answer(gate, (button) => button.click());
  await expect(rankings).toBeChecked();
  await rankings.uncheck();
  await expect(rankings).not.toBeChecked();
  expect(externalRequests).toEqual([]);
});

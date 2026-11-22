import { expect, type Locator } from '@playwright/test';
import pl from '../../i18n/pl.json' with { type: 'json' };

export function findDisplayedQuestion<
  T extends { pytanie: string; odpowiedzi: readonly string[] },
>(questions: readonly T[], prompt: string | null, options: readonly string[]) {
  return questions.find(
    ({ pytanie, odpowiedzi }) =>
      pytanie === prompt &&
      odpowiedzi.length === options.length &&
      odpowiedzi.every((option) => options.includes(option)),
  );
}

export async function expectQuestionSign(
  dialog: Locator,
  code: keyof typeof pl.quiz.signAlt,
) {
  const image = dialog.getByRole('img', {
    name: pl.quiz.signAlt[code],
    exact: true,
  });
  await expect(image).toBeInViewport({ ratio: 1 });
  await expect(image).toHaveJSProperty('naturalWidth', 64);
  await expect(image).toHaveCSS('width', '64px');
  await expect(image).toHaveCSS('height', '64px');
}

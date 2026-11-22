import { illustratedSigns, signImageFile } from '../content/signIllustrations';
import { translate } from '../core/presentation';

const assets = import.meta.glob<string>('../../assets/generated/signs/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

export function signIllustration(code: string, alt: string) {
  const src = assets[`../../assets/generated/signs/${signImageFile(code)}`];
  if (!src) return;
  const image = document.createElement('img');
  image.src = src;
  image.alt = alt;
  image.width = 64;
  return image;
}

export function questionPrompt(prompt: HTMLElement, illustration?: string) {
  const element = document.createElement('div');
  element.className = 'question-prompt';
  element.append(prompt);
  if (!illustration) return { element };

  const signs = document.createElement('div');
  signs.className = 'question-signs';
  const images = illustratedSigns(illustration).map((code) =>
    signIllustration(code, translate(`quiz.signAlt.${code}`)),
  );
  for (const image of images) if (image) signs.append(image);
  element.append(signs);

  // Keep the layout and focus target available while the images load.
  element.style.opacity = '0';
  const illustrationReady = Promise.all(images.map((image) => image?.decode()))
    .then(
      () => images.every(Boolean),
      () => false,
    )
    .then((ready) => {
      element.style.opacity = '';
      return ready;
    });
  return { element, illustrationReady };
}

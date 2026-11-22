import { signImageFile } from '../content/signIllustrations';

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

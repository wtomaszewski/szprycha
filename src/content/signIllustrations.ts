export function illustratedSigns(illustration: string) {
  return illustration.split('+');
}

export function signImageFile(code: string) {
  return `${code.replaceAll('/', '_')}.png`;
}

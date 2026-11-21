export function textAt(translations: unknown, key: string): string | undefined {
  let value = translations;
  for (const segment of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment))
      return;
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === 'string' && value.trim() ? value : undefined;
}

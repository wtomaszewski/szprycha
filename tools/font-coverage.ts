import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import opentype from 'opentype.js';
import { parse as parseYaml } from 'yaml';
import { arcadeFont, readingFont } from '../src/core/fonts.ts';

export const localFonts = [
  {
    family: arcadeFont,
    directory: 'press-start-2p',
    ttf: 'PressStart2P-Regular.ttf',
  },
  { family: readingFont, directory: 'vt323', ttf: 'VT323-Regular.ttf' },
] as const;

function collectCharacters(value: unknown, characters: Set<string>) {
  if (typeof value === 'string') {
    for (const char of value) {
      if (!/[\r\n\t]/u.test(char)) characters.add(char);
    }
  } else if (value && typeof value === 'object') {
    for (const field of Object.values(value))
      collectCharacters(field, characters);
  }
}

export function polishCharacters(root: string) {
  const paths = [
    'i18n/pl.json',
    ...readdirSync(resolve(root, 'content'), {
      recursive: true,
      encoding: 'utf8',
    })
      .filter((path) => /\.(json|ya?ml)$/u.test(path))
      .map((path) => join('content', path)),
  ];
  const characters = new Map<string, string>();
  for (const path of paths) {
    const source = readFileSync(resolve(root, path), 'utf8');
    const values: unknown = path.endsWith('.json')
      ? JSON.parse(source)
      : parseYaml(source);
    const used = new Set<string>();
    collectCharacters(values, used);
    for (const char of used) {
      if (!characters.has(char)) characters.set(char, path);
    }
  }
  return characters;
}

export function checkFontCoverage(root: string) {
  const characters = polishCharacters(root);
  const missing: string[] = [];
  for (const { family, directory, ttf } of localFonts) {
    const bytes = readFileSync(resolve(root, 'assets/fonts', directory, ttf));
    const font = opentype.parse(Uint8Array.from(bytes).buffer);
    for (const [char, source] of characters) {
      if (
        !font.charToGlyphIndex(char) ||
        (!/\s/u.test(char) && !font.charToGlyph(char).path.commands.length)
      ) {
        const code = char
          .codePointAt(0)!
          .toString(16)
          .toUpperCase()
          .padStart(4, '0');
        missing.push(
          `${family}: ${JSON.stringify(char)} (U+${code}) in ${source}`,
        );
      }
    }
  }
  if (missing.length)
    throw new Error(`Missing font glyphs:\n${missing.join('\n')}`);
}

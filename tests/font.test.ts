import { readFileSync } from 'node:fs';
import { parse } from 'opentype.js';
import { expect, it } from 'vitest';
import pl from '../i18n/pl.json';
it('bundled pixel font contains outlines for pangram and all Polish letters', () => {
  const bytes = readFileSync('assets/fonts/PixelifySans.ttf');
  const font = parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  for (const char of new Set(pl.pangram + pl.glyphs)) {
    if (char === ' ') continue;
    expect(font.charToGlyphIndex(char), char).toBeGreaterThan(0);
    expect(font.charToGlyph(char).path.commands.length, char).toBeGreaterThan(
      0,
    );
  }
});

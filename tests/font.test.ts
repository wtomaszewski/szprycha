import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { checkFontCoverage } from '../tools/font-coverage';

it('contains every glyph used by Polish UI and game content in both local fonts', () => {
  expect(() => checkFontCoverage(process.cwd())).not.toThrow();
});

it('reports a missing glyph with its font, code point and source file', () => {
  const root = mkdtempSync(join(tmpdir(), 'szprycha-font-'));
  try {
    cpSync('assets/fonts', join(root, 'assets/fonts'), { recursive: true });
    mkdirSync(join(root, 'i18n'));
    mkdirSync(join(root, 'content'));
    writeFileSync(join(root, 'i18n/pl.json'), '{}');
    writeFileSync(join(root, 'content/pytanie.yaml'), 'pytanie: "🚲"');
    expect(() => checkFontCoverage(root)).toThrow(
      /Press Start 2P: "🚲" \(U\+1F6B2\) in .*pytanie\.yaml\nVT323: "🚲"/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

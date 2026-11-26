import { isUtf8 } from 'node:buffer';
import { globSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { parseAllDocuments } from 'yaml';
import { forbiddenBrands } from '../../tools/brand-denylist.ts';

const exceptions = [
  {
    file: 'content/przepisy.yaml',
    text: 'Zjazd na prawo przed karetką/strażą/policją',
    name: 'policją',
    reason:
      'PIER-07 używa nazwy służby rodzajowo w opisie pojazdu uprzywilejowanego.',
  },
];

function findings(file: string, text: string) {
  return forbiddenBrands(text)
    .filter(
      (name) =>
        !exceptions.some(
          (exception) =>
            exception.file === file &&
            exception.text === text &&
            exception.name === name,
        ),
    )
    .map((name) => [file, name, text.slice(0, 160)].join(' | '));
}

function* strings(value: unknown): Generator<string> {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) {
    for (const item of value) yield* strings(item);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) yield* strings(item);
  }
}

function mapStrings(file: string, source: string) {
  const literals: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
      literals.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, source, ts.ScriptTarget.Latest));
  return literals;
}

function scanSource(file: string, source: string) {
  switch (extname(file)) {
    case '.json':
      return [...strings(JSON.parse(source))];
    case '.yaml':
    case '.yml':
      return parseAllDocuments(source).flatMap((document) => {
        if (document.errors.length) throw document.errors[0];
        return [...strings(document.toJS())];
      });
    case '.ts':
      return mapStrings(file, source);
    default:
      return [source];
  }
}

it('rejects brand names in game content, the voice manifest, store copy and map generators', () => {
  const files = globSync(
    [
      'content/**/*',
      'i18n/**/*',
      'store/**/*',
      'tools/gen-*-map.ts',
      'voice/manifest.json',
      'assets/voice/manifest.json',
    ],
    { withFileTypes: true },
  )
    .filter((entry) => entry.isFile())
    .map(({ parentPath, name }) => [parentPath, name].join('/'))
    .sort();
  expect(files).toContain('assets/voice/manifest.json');

  const violations = files.flatMap((file) => {
    const data = readFileSync(file);
    const texts = isUtf8(data) ? scanSource(file, data.toString('utf8')) : [];
    return [file, ...texts].flatMap((text) => findings(file, text));
  });
  expect(violations).toEqual([]);
});

it.each([
  'Zatrzymaj się przed zajezdnią Tramwajów Warszawskich.',
  'Na rogu stoi Toyota.',
  'Znak na radiowozie: POLICJA.',
  'Napis na karetce: Pogotowie.',
  'ＰＫＰ Intercity',
])('detects forbidden names in %s', (text) => {
  expect(findings('content/test.yaml', text)).not.toEqual([]);
});

it.each([
  'Policjant kieruje ruchem. Słuchaj poleceń policjanta.',
  'Przed przejazdem kolejowym przepuść tramwaj i pociąg.',
  'Karetka i straż pożarna mają wolną drogę.',
  'Krupówki, Piotrkowska, PKiN, Hala Stulecia',
])('allows generic terms and place names in %s', (text) => {
  expect(findings('content/test.yaml', text)).toEqual([]);
});

it('limits the documented exception to its file and exact text', () => {
  const [exception] = exceptions;
  if (!exception) throw new Error('Missing exception');
  expect(findings(exception.file, exception.text)).toEqual([]);
  expect(findings('content/test.yaml', exception.text)).toHaveLength(1);
  expect(findings(exception.file, exception.text + ' i Toyota')).toHaveLength(
    2,
  );
});

it('scans decoded text rather than generator comments or YAML syntax', () => {
  expect(
    scanSource(
      'tools/gen-test-map.ts',
      String.raw`// Toyota
      const poi = { name: 'Metro\u0020Warszawskie' };`,
    ).flatMap(forbiddenBrands),
  ).toEqual(['Metro Warszawskie']);
  expect(
    scanSource('content/test.yaml', 'name: >-\n  Metro\n  Warszawskie').flatMap(
      forbiddenBrands,
    ),
  ).toEqual(['Metro Warszawskie']);
});

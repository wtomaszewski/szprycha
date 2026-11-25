import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import pl from '../../i18n/pl.json';

const exceptions = new Map([
  // #97: zatwierdzony napis na ekranie porażki.
  ['i18n/pl.json:missionFailure.title', 'OBLAŁEŚ!'],
]);
const genderedPastTense = /\p{L}+(?:łeś|łaś)\b/iu;

function findGenderedText(value: unknown, location: string): string[] {
  if (typeof value === 'string') {
    return genderedPastTense.test(value) && exceptions.get(location) !== value
      ? [`${location}: ${value}`]
      : [];
  }
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    findGenderedText(
      child,
      `${location}${location.endsWith(':') ? '' : '.'}${key}`,
    ),
  );
}

it('rejects gendered past-tense forms in Polish player text', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = await readdir(join(root, 'content'), {
    recursive: true,
    withFileTypes: true,
  });
  const contentViolations = await Promise.all(
    files
      .filter(
        (file) =>
          file.isFile() &&
          ['.json', '.yaml', '.yml'].includes(extname(file.name)),
      )
      .map(async ({ name, parentPath }) => {
        const path = join(parentPath, name);
        const source = await readFile(path, 'utf8');
        const data: unknown =
          extname(name) === '.json' ? JSON.parse(source) : parse(source);
        return findGenderedText(data, `${path.slice(root.length)}:`);
      }),
  );
  expect([
    ...findGenderedText(pl, 'i18n/pl.json:'),
    ...contentViolations.flat(),
  ]).toEqual([]);
});

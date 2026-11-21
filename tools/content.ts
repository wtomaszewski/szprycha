import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { contentSchema } from '../src/content/schemas.ts';
import { missionsSchema } from '../src/content/missions.ts';
import { textAt } from '../src/content/translation.ts';
import { validateMaps } from './maps.ts';

export const contentFiles = [
  'przepisy.yaml',
  'znaki.yaml',
  'pytania.json',
  'balans.yaml',
  'osiagniecia.yaml',
] as const;
export async function readContent(root = process.cwd()) {
  const entries = await Promise.all(
    contentFiles.map(async (file) => {
      const source = await readFile(resolve(root, 'content', file), 'utf8');
      const value: unknown = file.endsWith('.json')
        ? JSON.parse(source)
        : parse(source);
      return [file.split('.')[0], value];
    }),
  );
  const directory = resolve(root, 'content/misje');
  const missionFiles = (await readdir(directory)).filter((file) =>
    file.endsWith('.yaml'),
  );
  const groups = await Promise.all(
    missionFiles.sort().map(async (file) => {
      try {
        const missions = missionsSchema.parse(
          parse(await readFile(resolve(directory, file), 'utf8')),
        );
        if (missions.some(({ miasto }) => file !== `${miasto}.yaml`))
          throw new Error('Mission city must match its file name');
        return missions;
      } catch (error) {
        throw new Error(
          `Invalid mission content in ${file}: ${String(error)}`,
          {
            cause: error,
          },
        );
      }
    }),
  );
  const content = contentSchema.parse({
    ...Object.fromEntries(entries),
    misje: groups.flat(),
  });
  const translations: unknown = JSON.parse(
    await readFile(resolve(root, 'i18n/pl.json'), 'utf8'),
  );
  for (const mission of content.misje) {
    const keys = [
      mission.tytul,
      mission.dialog_start,
      mission.dialog_koniec,
      ...mission.cele.map(({ opis }) => opis),
    ];
    for (const key of keys) {
      if (key && !textAt(translations, key))
        throw new Error(`Mission ${mission.id}: missing translation ${key}`);
    }
  }
  return content;
}
export async function buildContent(root = process.cwd()) {
  const content = await readContent(root);
  await validateMaps(root, content);
  const output = resolve(root, 'public/data');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'content.json'), JSON.stringify(content));
  return content;
}

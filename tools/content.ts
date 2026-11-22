import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { contentSchema } from '../src/content/schemas.ts';
import {
  dialogueFileSchema,
  portraitEmotions,
} from '../src/content/dialogues.ts';
import { missionsSchema } from '../src/content/missions.ts';
import { eventIds, eventRules } from '../src/gameplay/TrafficEvents.ts';
import { textAt } from '../src/content/translation.ts';
import {
  illustratedSigns,
  signImageFile,
} from '../src/content/signIllustrations.ts';
import { validateMaps } from './maps.ts';

export const contentFiles = [
  'przepisy.yaml',
  'znaki.yaml',
  'pytania.json',
  'balans.yaml',
  'plac.yaml',
  'osiagniecia.yaml',
  'wyzwania.yaml',
] as const;
export async function readMissions(root: string) {
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
  return groups.flat();
}

export async function readContent(root = process.cwd()) {
  const [entries, missions] = await Promise.all([
    Promise.all(
      contentFiles.map(async (file) => {
        const source = await readFile(resolve(root, 'content', file), 'utf8');
        const value: unknown = file.endsWith('.json')
          ? JSON.parse(source)
          : parse(source);
        return [file.split('.')[0], value];
      }),
    ),
    readMissions(root),
  ]);
  const dialogueDirectory = resolve(root, 'content/dialogi');
  const dialogueFiles = (await readdir(dialogueDirectory))
    .filter((file) => file.endsWith('.yaml'))
    .sort();
  const dialogueGroups = await Promise.all(
    dialogueFiles.map(async (file) => {
      try {
        return dialogueFileSchema.parse(
          parse(await readFile(resolve(dialogueDirectory, file), 'utf8')),
        );
      } catch (error) {
        throw new Error(
          `Invalid dialogue content in ${file}: ${String(error)}`,
          {
            cause: error,
          },
        );
      }
    }),
  );
  const content = contentSchema.parse({
    ...Object.fromEntries(entries),
    misje: missions,
    dialogi: {
      postacie: dialogueGroups.flatMap(({ postacie }) => postacie),
      dialogi: dialogueGroups.flatMap(({ dialogi }) => dialogi),
      zapowiedzi: dialogueGroups.flatMap(({ zapowiedzi }) => zapowiedzi),
    },
  });
  const translations: unknown = JSON.parse(
    await readFile(resolve(root, 'i18n/pl.json'), 'utf8'),
  );
  const quizSigns = new Set(
    content.pytania.pytania.flatMap(({ obrazek }) =>
      obrazek ? illustratedSigns(obrazek) : [],
    ),
  );
  for (const code of quizSigns) {
    if (!textAt(translations, `quiz.signAlt.${code}`))
      throw new Error(`Missing sign illustration description: ${code}`);
    await readFile(
      resolve(root, 'assets/generated/signs', signImageFile(code)),
    ).catch((error: unknown) => {
      throw new Error(`Missing sign illustration: ${code}`, { cause: error });
    });
  }
  for (const mission of content.misje) {
    const keys = [
      mission.tytul,
      mission.opis,
      ...mission.cele.flatMap((goal) => [
        goal.opis,
        goal.wskazowka_powrotu,
        ...(goal.typ === 'wybor'
          ? [goal.pytanie, ...goal.odpowiedzi, goal.wyjasnienie]
          : []),
      ]),
    ];
    for (const key of keys) {
      if (key && !textAt(translations, key))
        throw new Error(`Mission ${mission.id}: missing translation ${key}`);
    }
  }
  for (const { naklejka } of content.wyzwania.wyzwania) {
    if (!textAt(translations, `m5c.stickerNames.${naklejka}`))
      throw new Error(`Missing sticker translation: ${naklejka}`);
  }
  const ruleIds = new Set(content.przepisy.przepisy.map(({ id }) => id));
  for (const id of eventIds) {
    if (!textAt(translations, `trafficEvents.${id}`))
      throw new Error(`Traffic event: missing translation ${id}`);
    for (const ruleId of eventRules[id])
      if (!ruleIds.has(ruleId))
        throw new Error(`Traffic event ${id}: unknown rule ${ruleId}`);
  }
  const translation = (key: string) => {
    const text = textAt(translations, key);
    if (!text) throw new Error(`Dialogue: missing translation ${key}`);
    return text;
  };
  for (const character of content.dialogi.postacie) {
    translation(character.nazwa);
    const image = await readFile(
      resolve(root, `assets/generated/portraits/${character.id}.png`),
    );
    if (
      image.readUInt32BE(16) !== 64 * portraitEmotions.length ||
      image.readUInt32BE(20) !== 64
    )
      throw new Error(`Invalid portrait sheet dimensions: ${character.id}`);
  }
  for (const { linie } of content.dialogi.dialogi)
    for (const { tekst, lektor } of linie) {
      translation(tekst);
      if (lektor) translation(lektor);
    }
  const sentences = new Intl.Segmenter('pl', { granularity: 'sentence' });
  for (const [id, { hint }] of Object.entries(content.plac.exercises)) {
    if (
      !content.przepisy.przepisy.some(
        (rule) => rule.id === id && rule.detektor === 'plac',
      )
    )
      throw new Error(`Missing plac rule: ${id}`);
    const text = textAt(translations, hint)?.trim();
    if (!text || text.length > 140 || [...sentences.segment(text)].length !== 1)
      throw new Error(`Invalid plac hint: ${hint}`);
  }
  for (const { tekst, lektor } of content.dialogi.zapowiedzi) {
    for (const key of [tekst, lektor]) {
      if (!key) continue;
      const text = translation(key).trim();
      if (text.length > 140 || [...sentences.segment(text)].length !== 1)
        throw new Error(
          `Rule introduction must have one sentence of at most 140 characters: ${key}`,
        );
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

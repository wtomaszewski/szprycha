import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type pl from '../../i18n/pl.json';
import type { GameContent } from '../../src/content/schemas.ts';
import { textAt } from '../../src/content/translation.ts';
import {
  examRideIntro,
  questionVoiceLine,
  quizExplanationLine,
  resultVoiceIds,
  ruleFeedbackLine,
  voiceNoticeIds,
} from '../../src/audio/voiceLines.ts';
import { readContent } from '../content.ts';
import { hash, voiceIdSchema, type Manifest } from './manifest.ts';

export function collectLines(
  content: GameContent,
  translations: typeof pl,
): Manifest['lines'] {
  const lines: Manifest['lines'] = {};
  function add({ id, text }: { id: string; text: string }) {
    voiceIdSchema.parse(id);
    if (!text.trim() || /\{[^{}]+\}/.test(text))
      throw new Error(`Expected a fixed voice line: ${id}`);
    if (lines[id] && lines[id].text !== text)
      throw new Error(`Conflicting voice lines: ${id}`);
    lines[id] = { text, hash: hash(text) };
  }
  function localized(id: string) {
    const text = textAt(translations, id);
    if (!text) throw new Error(`Missing voice translation: ${id}`);
    add({ id, text });
  }

  for (const { linie } of content.dialogi.dialogi)
    for (const { tekst, lektor } of linie) localized(lektor ?? tekst);
  for (const { tekst, lektor } of content.dialogi.zapowiedzi)
    localized(lektor ?? tekst);
  for (const { cele } of content.misje)
    for (const goal of cele) {
      if (goal.wskazowka_powrotu) localized(goal.wskazowka_powrotu);
      if (goal.typ === 'wybor') {
        localized(goal.pytanie);
        localized(goal.wyjasnienie);
      }
    }
  for (const { hint } of Object.values(content.plac.exercises)) localized(hint);
  for (const fault of Object.keys(translations.plac.faults))
    localized(`plac.faults.${fault}`);

  for (const key of [
    ...voiceNoticeIds,
    ...Object.values(resultVoiceIds),
    examRideIntro,
    'exam.cleanExercise',
    'missionUi.checkpointHint',
    'progression.wiseHead',
  ])
    localized(key);
  for (const question of content.pytania.pytania) {
    add(questionVoiceLine(question, 'pytanie'));
    add(questionVoiceLine(question, 'wyjasnienie'));
  }
  const practicedRules = new Set(
    content.pytania.pytania.map(({ przepisy }) => przepisy[0]),
  );
  for (const rule of content.przepisy.przepisy) {
    add(ruleFeedbackLine(`przepisy.${rule.id}.feedback`, rule.feedback));
    if (practicedRules.has(rule.id)) add(quizExplanationLine(rule));
  }
  for (const { text } of translations.audio.tips) localized(text);

  return Object.fromEntries(
    Object.keys(lines)
      .sort()
      .map((id) => [id, lines[id]!]),
  );
}

export async function readLines(root: string) {
  const [content, translations] = await Promise.all([
    readContent(root),
    readFile(resolve(root, 'i18n/pl.json'), 'utf8'),
  ]);
  return collectLines(content, JSON.parse(translations));
}

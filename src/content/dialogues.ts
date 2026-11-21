import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const dialogueId = z.string().regex(/^dialogi(\.[A-Za-z0-9_-]+)+$/);
export const portraitEmotions = [
  'neutral',
  'happy',
  'surprised',
  'worried',
  'proud',
] as const;

const character = z.strictObject({
  id,
  nazwa: dialogueId,
});
const line = z.strictObject({
  postac: id,
  emocja: z.enum(portraitEmotions),
  tekst: dialogueId,
  lektor: dialogueId.optional(),
});
const dialogue = z.strictObject({
  id: dialogueId,
  linie: z.array(line).min(1),
});
const introduction = z.strictObject({
  regula: id,
  emocja: line.shape.emocja,
  tekst: dialogueId,
  lektor: dialogueId.optional(),
});

export const dialogueFileSchema = z.strictObject({
  postacie: z.array(character).default([]),
  dialogi: z.array(dialogue).default([]),
  zapowiedzi: z.array(introduction).default([]),
});
export type DialogueLine = z.infer<typeof line>;
export type Dialogues = z.infer<typeof dialogueFileSchema>;

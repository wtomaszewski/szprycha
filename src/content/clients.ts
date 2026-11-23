import { z } from 'zod';

const entries = z.array(z.string().trim().min(1).max(48)).min(1);
const namePart = /^[\p{L}]+(?:[ -][\p{L}]+)*$/u;
const nameParts = z.array(z.string().trim().max(24).regex(namePart)).min(1);

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0142/g, 'l')
    .replace(/[^\p{L}]/gu, '');
}

export function allowedClientNames(
  content: Pick<ClientContent, 'imiona' | 'przydomki' | 'wykluczenia'>,
) {
  const excluded = new Set(content.wykluczenia.map(normalizeName));
  const names = new Map<string, { firstName: string; nickname: string }>();
  for (const firstName of content.imiona)
    for (const nickname of content.przydomki) {
      const key = normalizeName(`${firstName} ${nickname}`);
      if (!excluded.has(key) && !names.has(key))
        names.set(key, { firstName, nickname });
    }
  return [...names.values()];
}

const clientContent = z.strictObject({
  imiona: nameParts,
  przydomki: nameParts,
  wykluczenia: z.array(z.string().trim().min(1).max(49)).min(1),
  zawody: entries,
  cechy: entries,
});

export type ClientContent = z.infer<typeof clientContent>;

export const clientContentSchema = clientContent.refine(
  (content) => allowedClientNames(content).length >= 1000,
  { message: 'Expected at least 1000 distinct allowed client names' },
);

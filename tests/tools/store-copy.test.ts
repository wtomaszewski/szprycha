import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { storeCopySchema } from '../../tools/store-copy';

const copy = storeCopySchema.parse(
  parse(readFileSync('content/sklep.yaml', 'utf8')),
);

it('validates the shop listing for the offline edition', () => {
  expect(copy).toMatchObject({
    reklamy: false,
    zakupy_w_aplikacji: false,
    dziala_offline: true,
  });
  expect(copy.pelny_opis).toContain(
    'Licencja Szprychy nie jest kartą rowerową.',
  );
});

it.each([
  ['nazwa', 30],
  ['krotki_opis', 80],
  ['pelny_opis', 4000],
  ['slowa_kluczowe', 100],
] as const)('enforces the %s limit of %i characters', (field, limit) => {
  expect(
    storeCopySchema.safeParse({ ...copy, [field]: 'ż'.repeat(limit) }).success,
  ).toBe(true);
  expect(
    storeCopySchema.safeParse({ ...copy, [field]: 'ż'.repeat(limit + 1) })
      .success,
  ).toBe(false);
});

it.each([
  'gta2',
  'Grand Theft Auto',
  'Rockstar Games',
  'PKP',
  'MPK Wrocław',
  'Koleje Mazowieckie',
  'Policji',
  'PSP',
  'Toyota',
  'Škoda',
])('rejects %s throughout the store listing', (brand) => {
  for (const field of [
    'nazwa',
    'krotki_opis',
    'pelny_opis',
    'slowa_kluczowe',
  ] as const)
    expect(storeCopySchema.safeParse({ ...copy, [field]: brand }).success).toBe(
      false,
    );
  expect(
    storeCopySchema.safeParse({
      ...copy,
      kategoria: { ...copy.kategoria, app_store: brand },
    }).success,
  ).toBe(false);
});

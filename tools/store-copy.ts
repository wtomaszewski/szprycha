import { z } from 'zod';

const names = [
  String.raw`GTA\d*|Grand\s+Theft\s+Auto|Rockstar`,
  String.raw`Policj\p{L}*|PSP|Państwow\p{L}*\s+Straż\p{L}*\s+Pożarn\p{L}*|WORD|Pogotowi\p{L}*\s+Ratunkow\p{L}*`,
  String.raw`PKP|MZA|ZTM|MPK|SKM|WKD|Polregio|Intercity|Flixbus|RegioJet|Polski\s+Bus|Leo\s+Express`,
  String.raw`Kolej\p{L}*\s+(?:Mazowieck\p{L}*|Dolnośląsk\p{L}*)|Metro\s+Warszawsk\p{L}*|Tramwaj\p{L}*\s+(?:Warszawsk\p{L}*|Śląsk\p{L}*)`,
  String.raw`Alfa\s+Romeo|Audi|BMW|BYD|Chevrolet|Chrysler|Citro[eë]n|Cupra|Dacia|Daewoo|Daihatsu|Dodge|Ferrari|Fiat|Ford`,
  String.raw`Honda|Hyundai|Jaguar|Jeep|Kia|Lamborghini|Land\s+Rover|Lexus|Mazda|Mercedes|MG|Mini\s+Cooper|Mitsubishi|Nissan`,
  'Opel|Peugeot|Porsche|Renault|Saab|Seat|[SŠ]koda|Smart|Subaru|Suzuki|Tesla|Toyota|Volkswagen|Volvo|VW',
];
const forbiddenNames = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:${names.join('|')})(?![\p{L}\p{N}])`,
  'iu',
);

const storeText = (limit: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(limit)
    .refine((text) => !forbiddenNames.test(text.normalize('NFKC')), {
      message: 'Store copy contains a forbidden name',
    });

export const storeCopySchema = z.strictObject({
  nazwa: storeText(30),
  krotki_opis: storeText(80),
  pelny_opis: storeText(4000),
  slowa_kluczowe: storeText(100),
  kategoria: z.strictObject({
    google_play: storeText(80),
    app_store: storeText(80),
  }),
  reklamy: z.literal(false),
  zakupy_w_aplikacji: z.literal(false),
  dziala_offline: z.literal(true),
});

import { z } from 'zod';

import { forbiddenBrands } from './brand-denylist.ts';

const storeText = (limit: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(limit)
    .refine((text) => forbiddenBrands(text).length === 0, {
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

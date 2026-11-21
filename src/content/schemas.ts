import { z } from 'zod';

const text = z.string().trim().min(1);
const id = text.regex(/^[A-Za-z0-9_-]+$/);
const moduleId = z.enum([
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
]);
const count = z.number().int().nonnegative();
const positive = z.number().positive();
const percent = z.number().min(0).max(100);
const ratio = z.number().min(0).max(1);
const date = z.iso.date();
export const rulesSchema = z.strictObject({
  stan_prawny: date,
  przepisy: z
    .array(
      z.strictObject({
        id,
        modul: moduleId,
        tytul: text,
        dla_dziecka: text,
        podstawa: text,
        weryfikacja: z.boolean(),
        detektor: z.enum(['sim', 'scenka', 'garaz', 'plac', 'quiz-only']),
        waga_bledu: z.enum(['minor', 'major']),
        dobry_nawyk: text.optional(),
        feedback: text.max(140),
      }),
    )
    .min(1),
});
export const signsSchema = z.strictObject({
  znaki: z
    .array(
      z.strictObject({
        kod: text,
        kategoria: z.enum([
          'ostrzegawczy',
          'zakazu',
          'nakazu',
          'informacyjny',
          'tabliczka',
          'urzadzenie',
          'poziomy',
          'sygnalizator',
        ]),
        nazwa: text,
        znaczenie: text,
        rzadkosc: z.enum(['zwykly', 'rzadki', 'epicki']),
        reguly: z.array(id),
        weryfikacja: z.boolean().optional(),
      }),
    )
    .min(1),
});
export const questionsSchema = z.strictObject({
  stan_prawny: date,
  uwaga: text,
  pytania: z
    .array(
      z
        .strictObject({
          id: text.regex(/^Q\d+$/),
          modul: moduleId,
          przepisy: z.array(id).min(1),
          poziom: z.number().int().min(1).max(3),
          pytanie: text,
          odpowiedzi: z.array(text).min(2),
          poprawna: count,
          wyjasnienie: text,
          zrodlo: text,
          obrazek: text.optional(),
          weryfikacja: z.boolean().optional(),
        })
        .refine((q) => q.poprawna < q.odpowiedzi.length, {
          path: ['poprawna'],
          message: 'Answer index out of range',
        }),
    )
    .min(1),
});
const leafCondition = z.union([
  z.strictObject({ good: id, ile: positive.int() }),
  z.strictObject({ good_modul: moduleId, ile: positive.int() }),
  z.strictObject({
    misje_typ: text,
    bez_bledow: z.boolean(),
    ile: positive.int(),
  }),
  z.strictObject({ album: percent }),
  z.strictObject({
    kolekcja: z.enum(['krasnale', 'syrenki']),
    ile: positive.int(),
  }),
  z.strictObject({ combo: positive.int() }),
  z.strictObject({ seria: positive.int() }),
  z.strictObject({ plac_zloto: z.literal('all') }),
  z.strictObject({ scenka_pp: z.literal('bezblednie') }),
  z.strictObject({ akt: z.number().int().min(1).max(3) }),
  z.strictObject({ quiz_seria: positive.int() }),
  z.strictObject({ kampanie: z.array(z.enum(['warszawa', 'wroclaw'])).min(1) }),
  z.strictObject({ licencja: z.literal(true) }),
  z.strictObject({ zleceniodawca: id, ile: positive.int() }),
]);
export type Condition = z.infer<typeof leafCondition> | { all: Condition[] };
const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    leafCondition,
    z.strictObject({ all: z.array(conditionSchema).min(1) }),
  ]),
);
export const achievementsSchema = z.strictObject({
  osiagniecia: z
    .array(
      z.strictObject({
        id,
        nazwa: text,
        opis: text,
        warunek: conditionSchema,
        zetony: count,
      }),
    )
    .min(1),
});
export const balanceSchema = z.strictObject({
  misja: z.strictObject({
    ukonczenie: count,
    dobry_nawyk: count,
    bonus_czasu_max: count,
    bonus_plynnosci: count,
    prog_wstrzasow_plynnosc: ratio,
    kara_minor: count,
    kara_major: count,
    major_do_porazki: positive.int(),
  }),
  combo: z.strictObject({
    krok_dobrych_nawykow: positive.int(),
    max_mnoznik: positive.int(),
  }),
  uwaga_drogowki: z.strictObject({
    max: positive.int(),
    spadek_co_s: positive,
    bonus_madra_glowa: count,
  }),
  mastery: z.strictObject({
    good: count,
    good_limit_dzienny: count,
    quiz_ok: count,
    quiz_zle: z.number().nonpositive(),
    minor: z.number().nonpositive(),
    major: z.number().nonpositive(),
    waga_bazowa: positive,
    progi_odznak: z
      .strictObject({ braz: percent, srebro: percent, zloto: percent })
      .refine(
        (p) => p.braz < p.srebro && p.srebro < p.zloto,
        'Badge thresholds must increase',
      ),
  }),
  leitner_odstepy_dni: z
    .array(count)
    .length(5)
    .refine(
      (a) => a.every((v, i) => i === 0 || v > a[i - 1]!),
      'Intervals must increase',
    ),
  gwiazdki: z.strictObject({
    zetony: z.array(count).length(3),
    dwie_gwiazdki_max_minor: count,
  }),
  rangi: z
    .array(
      z.union([
        z.strictObject({ id, xp: count }),
        z.strictObject({ id, xp: z.null(), wymaga: z.literal('licencja') }),
      ]),
    )
    .min(1),
  licencja: z.strictObject({
    mastery_min_modul: percent,
    teoria_pytan: positive.int(),
    teoria_prog: ratio,
    plac_prog: ratio,
    przejazd_max_minor: count,
    przejazd_max_major: count,
  }),
  silnik: z
    .strictObject({
      ttc_minor_s: positive,
      ttc_major_s: positive,
      sygnalizacja_min_przed_s: positive,
      obejrzenie_okno_s: positive,
      stop_predkosc_ms: positive,
      stop_czas_s: positive,
      chodnik_predkosc_przy_pieszych_ms: positive,
      odstep_od_zaparkowanych_m: positive,
      kafel_m: positive,
    })
    .refine(
      (s) => s.ttc_major_s < s.ttc_minor_s,
      'Major TTC must be lower than minor TTC',
    ),
  wiek: z.strictObject({
    kask_do_lat: positive.int(),
    karta_od_lat: positive.int(),
    karta_wymagana_do_lat: positive.int(),
    dziecko_jako_pieszy_do_lat: positive.int(),
  }),
  zdrowe_granie: z.strictObject({ przypomnienie_po_min: positive }),
});
export const contentSchema = z
  .strictObject({
    przepisy: rulesSchema,
    znaki: signsSchema,
    pytania: questionsSchema,
    balans: balanceSchema,
    osiagniecia: achievementsSchema,
  })
  .superRefine((data, ctx) => {
    function unique(values: string[], path: string[]) {
      const seen = new Set<string>();
      for (const value of values) {
        if (seen.has(value))
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Duplicate ID: ${value}`,
          });
        seen.add(value);
      }
    }
    unique(
      data.przepisy.przepisy.map((r) => r.id),
      ['przepisy'],
    );
    unique(
      data.znaki.znaki.map((s) => s.kod),
      ['znaki'],
    );
    unique(
      data.pytania.pytania.map((q) => q.id),
      ['pytania'],
    );
    unique(
      data.osiagniecia.osiagniecia.map((a) => a.id),
      ['osiagniecia'],
    );
    unique(
      data.balans.rangi.map((r) => r.id),
      ['balans', 'rangi'],
    );
    const rules = new Set(data.przepisy.przepisy.map((r) => r.id));
    function reference(value: string, path: (string | number)[]) {
      if (!rules.has(value))
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Unknown rule ID: ${value}`,
        });
    }
    data.znaki.znaki.forEach((s, i) =>
      s.reguly.forEach((r, j) =>
        reference(r, ['znaki', 'znaki', i, 'reguly', j]),
      ),
    );
    data.pytania.pytania.forEach((q, i) =>
      q.przepisy.forEach((r, j) =>
        reference(r, ['pytania', 'pytania', i, 'przepisy', j]),
      ),
    );
    function condition(c: Condition, path: (string | number)[]) {
      if ('good' in c) reference(c.good, [...path, 'good']);
      if ('all' in c)
        c.all.forEach((v, i) => condition(v, [...path, 'all', i]));
    }
    data.osiagniecia.osiagniecia.forEach((a, i) =>
      condition(a.warunek, ['osiagniecia', 'osiagniecia', i, 'warunek']),
    );
    if (data.przepisy.stan_prawny !== data.pytania.stan_prawny)
      ctx.addIssue({
        code: 'custom',
        path: ['pytania', 'stan_prawny'],
        message: 'Legal content dates differ',
      });
    if (data.balans.licencja.teoria_pytan > data.pytania.pytania.length)
      ctx.addIssue({
        code: 'custom',
        path: ['balans', 'licencja', 'teoria_pytan'],
        message: 'Question bank too small',
      });
  });
export type GameContent = z.infer<typeof contentSchema>;

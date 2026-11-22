import { z } from 'zod';
import { placBalanceSchema, placSchema } from './plac.ts';
import { missionsSchema } from './missions.ts';
import { dialogueFileSchema } from './dialogues.ts';

const text = z.string().trim().min(1);
const id = text.regex(/^[A-Za-z0-9_-]+$/);
export const moduleId = z.enum([
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
        waga_bledu: z.enum(['minor', 'major']).nullable(),
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
        dla_dziecka: text,
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
          wyjasnienie: text.max(140),
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
        aktywne: z.boolean().default(true),
        zetony: count,
      }),
    )
    .min(1),
});
const challengesSchema = z.strictObject({
  wyzwania: z
    .array(
      z.strictObject({
        id,
        opis: text,
        good: id,
        ile: positive.int(),
        naklejka: id,
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
  combo: z
    .strictObject({
      mnoznik_startowy: positive.int(),
      efekt_od_mnoznika: positive.int(),
      krok_dobrych_nawykow: positive.int(),
      max_mnoznik: positive.int(),
    })
    .refine(
      (combo) =>
        combo.mnoznik_startowy <= combo.efekt_od_mnoznika &&
        combo.efekt_od_mnoznika <= combo.max_mnoznik,
      'Combo thresholds must be ordered',
    ),
  uwaga_drogowki: z
    .strictObject({
      przyrost_minor: positive.int(),
      po_blednej_odpowiedzi: count,
      max: positive.int(),
      spadek_co_s: positive,
      bonus_madra_glowa: count,
    })
    .refine(
      (attention) => attention.po_blednej_odpowiedzi < attention.max,
      'Wrong answer must clear the stop',
    ),
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
    .tuple([z.literal(0), count, count, count, count])
    .refine(
      (a) => a.every((v, i) => i === 0 || v > a[i - 1]!),
      'Intervals must increase',
    ),
  quiz: z.strictObject({
    szybkie_pytania: positive.int(),
    xp_za_odpowiedz: count,
  }),
  gwiazdki: z.strictObject({
    zetony: z
      .tuple([count, count, count])
      .refine(
        ([one, two, three]) => one <= two && two <= three,
        'Star payouts must increase',
      ),
    dwie_gwiazdki_max_minor: count,
  }),
  rangi: z
    .array(
      z.union([
        z.strictObject({ id, xp: count, odblokuj: z.array(id) }),
        z.strictObject({
          id,
          xp: z.null(),
          wymaga: z.literal('licencja'),
          odblokuj: z.array(id),
        }),
      ]),
    )
    .min(1),
  plac: placBalanceSchema,
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
  album: z.strictObject({ zasieg_zdjecia_m: positive }),
  osiagniecia: z.strictObject({ xp_za_zeton: count }),
  wyzwania_dzienne: z
    .strictObject({
      liczba: positive.int(),
      z_najslabszego_modulu: positive.int(),
      zetony: count,
    })
    .refine(
      ({ liczba, z_najslabszego_modulu }) => z_najslabszego_modulu <= liczba,
    ),
  zdrowe_granie: z
    .strictObject({
      przypomnienie_po_min: positive.int(),
      opcje_min: z.array(positive.int()).min(1),
    })
    .refine(
      ({ przypomnienie_po_min, opcje_min }) =>
        opcje_min.includes(przypomnienie_po_min) &&
        new Set(opcje_min).size === opcje_min.length,
    ),
});
export const contentSchema = z
  .strictObject({
    przepisy: rulesSchema,
    znaki: signsSchema,
    pytania: questionsSchema,
    balans: balanceSchema,
    plac: placSchema,
    osiagniecia: achievementsSchema,
    wyzwania: challengesSchema,
    misje: missionsSchema,
    dialogi: dialogueFileSchema,
  })
  .superRefine((data, ctx) => {
    function unique(values: string[], path: (string | number)[]) {
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
    unique(
      data.misje.map((mission) => mission.id),
      ['misje'],
    );
    const rules = new Map(data.przepisy.przepisy.map((r) => [r.id, r]));
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
    const signs = new Map(data.znaki.znaki.map((s) => [s.kod, s]));
    const questionRules = new Set<string>();
    const questionModules = new Set<z.infer<typeof moduleId>>();
    data.pytania.pytania.forEach((q, i) => {
      const path = ['pytania', 'pytania', i];
      const signCodes = q.obrazek?.split('+') ?? [];
      const linkedSigns = signCodes.every((code) => {
        const sign = signs.get(code);
        return sign?.reguly.some((rule) => q.przepisy.includes(rule));
      });
      if (!linkedSigns || new Set(signCodes).size !== signCodes.length)
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'obrazek'],
          message: 'Expected distinct Album signs linked to the question rules',
        });
      unique(q.przepisy, [...path, 'przepisy']);
      q.przepisy.forEach((rule, j) =>
        reference(rule, [...path, 'przepisy', j]),
      );
      // Sign recognition belongs in M03 even when the sign illustrates a
      // rule taught in another module (e.g. A-17 and safe speed).
      if (
        !(q.modul === 'M03' && signCodes.length && linkedSigns) &&
        !q.przepisy.some((rule) => rules.get(rule)?.modul === q.modul)
      )
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'modul'],
          message:
            'Question module must match its rules or teach an Album sign',
        });
      questionModules.add(q.modul);
      for (const rule of q.przepisy) {
        // A quiz-only rule needs a question in its own study module.
        if (
          rules.get(rule)?.detektor !== 'quiz-only' ||
          rules.get(rule)?.modul === q.modul
        )
          questionRules.add(rule);
      }
    });
    for (const module of moduleId.options)
      if (!questionModules.has(module))
        ctx.addIssue({
          code: 'custom',
          path: ['pytania', 'pytania'],
          message: `Missing study question for ${module}`,
        });
    for (const { id, detektor } of data.przepisy.przepisy) {
      if (
        (detektor === 'sim' || detektor === 'quiz-only' || id === 'KASK-01') &&
        !questionRules.has(id)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['pytania', 'pytania'],
          message: `Missing control question for ${id}`,
        });
    }
    function condition(c: Condition, path: (string | number)[]) {
      if ('good' in c) reference(c.good, [...path, 'good']);
      if ('all' in c)
        c.all.forEach((v, i) => condition(v, [...path, 'all', i]));
    }
    data.osiagniecia.osiagniecia.forEach((a, i) =>
      condition(a.warunek, ['osiagniecia', 'osiagniecia', i, 'warunek']),
    );
    const templates = data.wyzwania.wyzwania;
    unique(
      templates.map(({ id }) => id),
      ['wyzwania'],
    );
    unique(
      templates.map(({ good }) => good),
      ['wyzwania'],
    );
    if (templates.length < data.balans.wyzwania_dzienne.liczba)
      ctx.addIssue({
        code: 'custom',
        path: ['wyzwania'],
        message: 'Too few distinct daily challenge templates',
      });
    const simRules = new Set(
      data.przepisy.przepisy
        .filter(({ detektor }) => detektor === 'sim')
        .map(({ id }) => id),
    );
    templates.forEach(({ good }, i) => {
      if (!simRules.has(good))
        ctx.addIssue({
          code: 'custom',
          path: ['wyzwania', 'wyzwania', i, 'good'],
          message: `Expected a simulated rule: ${good}`,
        });
    });
    const { postacie, dialogi, zapowiedzi } = data.dialogi;
    unique(
      postacie.map(({ id }) => id),
      ['dialogi', 'postacie'],
    );
    unique(
      dialogi.map(({ id }) => id),
      ['dialogi', 'dialogi'],
    );
    unique(
      zapowiedzi.map(({ regula }) => regula),
      ['dialogi', 'zapowiedzi'],
    );
    const characters = new Set(postacie.map(({ id }) => id));
    const dialogueIds = new Map(
      dialogi.map((dialogue) => [dialogue.id, dialogue]),
    );
    const introducedRules = new Set(zapowiedzi.map(({ regula }) => regula));
    for (const [i, dialogue] of dialogi.entries()) {
      dialogue.linie.forEach(({ postac }, j) => {
        if (!characters.has(postac))
          ctx.addIssue({
            code: 'custom',
            path: ['dialogi', 'dialogi', i, 'linie', j, 'postac'],
            message: `Unknown character: ${postac}`,
          });
      });
    }
    zapowiedzi.forEach(({ regula }, i) =>
      reference(regula, ['dialogi', 'zapowiedzi', i, 'regula']),
    );
    if (zapowiedzi.length && !characters.has('sierzant_ola'))
      ctx.addIssue({
        code: 'custom',
        path: ['dialogi', 'postacie'],
        message: 'Missing character sierzant_ola for rule introductions',
      });

    const missions = new Set(data.misje.map(({ id }) => id));
    const ranks = new Set(data.balans.rangi.map(({ id }) => id));
    data.misje.forEach((mission, i) => {
      const path = ['misje', i];
      const practiced = new Set(mission.reguly_cwiczone);
      mission.reguly_cwiczone.forEach((rule, j) => {
        const rulePath = [...path, 'reguly_cwiczone', j];
        reference(rule, rulePath);
        if (rules.has(rule) && !introducedRules.has(rule))
          ctx.addIssue({
            code: 'custom',
            path: rulePath,
            message: `Missing rule introduction: ${rule}`,
          });
      });
      for (const field of ['dialog_start', 'dialog_koniec'] as const) {
        const id = mission[field];
        if (id && !dialogueIds.has(id))
          ctx.addIssue({
            code: 'custom',
            path: [...path, field],
            message: `Unknown dialogue: ${id}`,
          });
      }
      const startLines =
        dialogueIds.get(mission.dialog_start ?? '')?.linie.length ?? 0;
      if (startLines + practiced.size > 4)
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'dialog_start'],
          message:
            'Mission opening including introductions can have at most four lines',
        });
      mission.cele.forEach((goal, j) => {
        if (goal.wymagany_nawyk)
          reference(goal.wymagany_nawyk, [
            ...path,
            'cele',
            j,
            'wymagany_nawyk',
          ]);
        if (goal.typ === 'wybor')
          reference(goal.regula, [...path, 'cele', j, 'regula']);
      });
      mission.zdarzenia_wymuszone.forEach(({ regula }, j) =>
        reference(regula, [...path, 'zdarzenia_wymuszone', j, 'regula']),
      );
      unique(mission.checkpointy, ['misje', String(i), 'checkpointy']);
      unique(mission.warunki_porazki, ['misje', String(i), 'warunki_porazki']);
      const rank = mission.wymagania?.ranga_min;
      if (rank && !ranks.has(rank))
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'wymagania', 'ranga_min'],
          message: `Unknown rank: ${rank}`,
        });
      mission.wymagania?.misje_ukonczone?.forEach((required, j) => {
        if (required === mission.id || !missions.has(required))
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'wymagania', 'misje_ukonczone', j],
            message: `Invalid mission prerequisite: ${required}`,
          });
      });
    });
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
    if (data.balans.quiz.szybkie_pytania > data.pytania.pytania.length)
      ctx.addIssue({
        code: 'custom',
        path: ['balans', 'quiz', 'szybkie_pytania'],
        message: 'Question bank too small for quick quiz',
      });
  });
export type GameContent = z.infer<typeof contentSchema>;

import { z } from 'zod';
import { dialogueId } from './dialogues.ts';

const id = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const missionCity = z.enum(['warszawa', 'wroclaw']);
export type MissionCity = z.infer<typeof missionCity>;
export const campaignCity = z.enum([
  ...missionCity.options,
  'krakow',
  'gdansk',
  'wies',
  'poznan',
  'zakopane',
]);
export type CampaignCity = z.infer<typeof campaignCity>;
export const playableCity = z.enum([...campaignCity.options, 'lodz']);
export type PlayableCity = z.infer<typeof playableCity>;

export function isCampaignCity(city: PlayableCity): city is CampaignCity {
  return campaignCity.safeParse(city).success;
}

const key = z.string().regex(/^(misje|dialogi)(\.[A-Za-z0-9_-]+)+$/);
const seconds = z.number().positive();
const count = z.number().int().nonnegative();
const goalFields = {
  opis: key.optional(),
  limit_s: seconds.optional(),
  wymagany_nawyk: id.optional(),
  wskazowka_powrotu: key.optional(),
};
const missionGoal = z.discriminatedUnion('typ', [
  z.strictObject({
    ...goalFields,
    typ: z.literal('przygotuj_rower'),
    wymagana_kamizelka: z.literal(true).optional(),
  }),
  z.strictObject({ ...goalFields, typ: z.literal('dojedz'), poi: id }),
  z.strictObject({ ...goalFields, typ: z.literal('zbierz_krasnala'), poi: id }),
  z.strictObject({
    ...goalFields,
    typ: z.literal('zbierz_obwarzanka'),
    poi: id,
  }),
  z.strictObject({ ...goalFields, typ: z.literal('zbierz_bursztyn'), poi: id }),
  z.strictObject({ ...goalFields, typ: z.literal('zbierz_szyszke'), poi: id }),
  z.strictObject({ ...goalFields, typ: z.literal('zbierz_rogala'), poi: id }),
  z.strictObject({ ...goalFields, typ: z.literal('zbierz_swierk'), poi: id }),
  z
    .strictObject({
      ...goalFields,
      typ: z.literal('wybor'),
      poi: id,
      opis: key,
      regula: id,
      pytanie: key,
      odpowiedzi: z.array(key).min(2),
      poprawna: count,
      wyjasnienie: key,
    })
    .refine(({ poprawna, odpowiedzi }) => poprawna < odpowiedzi.length, {
      path: ['poprawna'],
      message: 'Answer index out of range',
    }),
  z.strictObject({
    ...goalFields,
    typ: z.literal('sfotografuj'),
    poi: id,
    znak: id,
  }),
  z.strictObject({
    ...goalFields,
    typ: z.literal('odbierz'),
    poi: id.optional(),
    przedmiot: id,
  }),
  z.strictObject({
    ...goalFields,
    typ: z.literal('oddaj'),
    poi: id.optional(),
    przedmiot: id,
  }),
]);

export const missionSchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^(WAW|WRO|KRA|GDA|WIE|POZ|LOD|ZAK)-(T|A[1-3]|B)-\d{2}$/),
    miasto: playableCity,
    mapa: id.optional(),
    akt: count.max(3),
    poboczna: z.literal(true).optional(),
    tytul: key,
    opis: key.optional(),
    zleceniodawca: id,
    typ: id,
    wymagania: z
      .strictObject({
        ranga_min: id.optional(),
        misje_ukonczone: z.array(id).optional(),
      })
      .optional(),
    start: z.strictObject({
      poi: id,
      kask_zapiety: z.boolean().optional(),
      zmrok: z.boolean().optional(),
      noc: z.literal(true).optional(),
      pogoda: z
        .enum([
          'lekki_deszcz',
          'ulewa',
          'snieg',
          'silny_wiatr',
          'mgla',
          'gesta_mgla',
          'gololedz',
        ])
        .optional(),
      ulewa: z.boolean().optional(),
      awaria_swiatel: z.boolean().optional(),
    }),
    cele: z.array(missionGoal).min(1),
    limit_s: seconds.optional(),
    przesylka: z.strictObject({ delikatna: z.boolean() }).optional(),
    wyscig: z.strictObject({ trasa_rywala: id }).optional(),
    warunki_porazki: z
      .array(z.enum(['czas_minal', 'dowolny_blad']))
      .default([]),
    checkpointy: z.array(id).default([]),
    reguly_cwiczone: z.array(id).min(1),
    zdarzenia_wymuszone: z
      .array(z.strictObject({ typ: id, przy: id, regula: id }))
      .default([]),
    par_s: seconds,
    premia_czasowa: z.literal(false).optional(),
    min_dobre_nawyki: count,
    nagrody: z.strictObject({
      zetony: count,
      xp: count,
      odblokuj: z.array(id).optional(),
    }),
    dialog_start: dialogueId.optional(),
    dialog_koniec: dialogueId.optional(),
    ruch_ai: z.boolean().optional(),
    towarzysze: z.number().int().min(1).max(14).optional(),
    skrot: z.strictObject({ odcinek: id }).optional(),
  })
  .superRefine((mission, ctx) => {
    const act = mission.poboczna
      ? 'B'
      : mission.akt === 0
        ? 'T'
        : `A${mission.akt}`;
    const prefix = {
      warszawa: 'WAW',
      wroclaw: 'WRO',
      krakow: 'KRA',
      gdansk: 'GDA',
      wies: 'WIE',
      poznan: 'POZ',
      lodz: 'LOD',
      zakopane: 'ZAK',
    }[mission.miasto];
    // Original free-ride exercises retain their saved IDs in the campaigns.
    const legacyCityTraining =
      act === 'T' &&
      ((mission.miasto === 'krakow' && /^KRA-B-0[1-3]$/.test(mission.id)) ||
        (mission.miasto === 'gdansk' && /^GDA-B-0[1-4]$/.test(mission.id)) ||
        (mission.miasto === 'wies' && /^WIE-B-0[1-4]$/.test(mission.id)) ||
        (mission.miasto === 'poznan' && /^POZ-B-0[1-4]$/.test(mission.id)) ||
        (mission.miasto === 'lodz' && /^LOD-B-0[1-4]$/.test(mission.id)) ||
        (mission.miasto === 'zakopane' && /^ZAK-B-0[1-5]$/.test(mission.id)));
    if (!legacyCityTraining && !mission.id.startsWith(`${prefix}-${act}-`))
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'Mission ID must match its city and act',
      });

    if (
      (mission.start.zmrok && mission.start.noc) ||
      (mission.start.ulewa && mission.start.pogoda)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['start'],
        message: 'Use one field per environment condition',
      });
    }

    const timed =
      mission.limit_s !== undefined ||
      mission.cele.some(({ limit_s }) => limit_s !== undefined);
    if (timed !== mission.warunki_porazki.includes('czas_minal'))
      ctx.addIssue({
        code: 'custom',
        path: ['warunki_porazki'],
        message: 'Time limits and czas_minal must be configured together',
      });

    if (
      mission.cele.some(
        ({ typ }, i) =>
          typ === 'przygotuj_rower' && (i !== 0 || mission.cele.length < 2),
      )
    )
      ctx.addIssue({
        code: 'custom',
        path: ['cele'],
        message: 'Bike preparation must precede a riding goal',
      });

    const cargo = new Set<string>();
    mission.cele.forEach((goal, index) => {
      if (goal.typ !== 'odbierz' && goal.typ !== 'oddaj') return;
      const { przedmiot } = goal;
      const valid =
        goal.typ === 'odbierz'
          ? !cargo.has(przedmiot)
          : cargo.delete(przedmiot);
      if (!valid)
        ctx.addIssue({
          code: 'custom',
          path: ['cele', index, 'przedmiot'],
          message: `Invalid pickup or delivery order for ${przedmiot}`,
        });
      if (goal.typ === 'odbierz') cargo.add(przedmiot);
    });
  });

export const missionsSchema = z.array(missionSchema).min(1);
export type MissionDefinition = z.infer<typeof missionSchema>;
export type MissionGoal = z.infer<typeof missionGoal>;
export type ForcedMissionEvent =
  MissionDefinition['zdarzenia_wymuszone'][number];

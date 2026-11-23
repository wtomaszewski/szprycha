import type {
  MissionCity,
  MissionDefinition,
  MissionGoal,
} from '../../content/missions';
import type { GameContent } from '../../content/schemas';
import type { ProgressProfile } from '../../core/progressStore';
import {
  masteryWeight,
  moduleMastery,
  type ModuleId,
} from '../../progression/mastery';
import type { QuizQuestion } from '../quiz/leitner';
import { signRules } from './focus';
import type { CertifiedRoute, RouteCatalogData } from './RouteCatalog';

export const orderKinds = [
  'delivery',
  'pickup',
  'escort',
  'photo',
  'collect',
  'race',
  'fragile',
] as const;
export type OrderKind = (typeof orderKinds)[number];
export type OrderText = {
  place: string;
  item: string;
  sender: string;
  sign: string;
};
export type DailyOrder = {
  definition: MissionDefinition;
  kind: OrderKind;
  route: CertifiedRoute;
  text: OrderText;
  question?: QuizQuestion;
};
type Content = Pick<GameContent, 'balans' | 'pytania' | 'przepisy'>;
type Candidate = Pick<DailyOrder, 'kind' | 'route'> & {
  night?: boolean;
  sign?: CertifiedRoute['signs'][number];
  ruleId: string;
  module: ModuleId;
};

const types: Record<OrderKind, string> = {
  delivery: 'dostawa_na_czas',
  pickup: 'odbior',
  escort: 'eskorta',
  photo: 'detektyw_znakow',
  collect: 'kolekcja',
  race: 'wyscig',
  fragile: 'delikatna_przesylka',
};
const items = ['map', 'notebook', 'envelope'] as const;
const senders = ['workshop', 'library', 'club'] as const;

// Finishing a clean daily race within par always beats the rival, even
// without habit points. The campaign keeps its original rival scoring.
export function dailyRivalScoreLimit(balance: Content['balans']['misja']) {
  return balance.ukonczenie + balance.bonus_czasu_max - 1;
}

export function orderSeed(text: string) {
  let hash = 2166136261;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export class DailyOrderGenerator {
  private readonly candidates: readonly Candidate[];
  private readonly rulesByModule = new Map<ModuleId, string[]>();
  private readonly questionsByRule = new Map<string, QuizQuestion[]>();

  constructor(
    private readonly city: MissionCity,
    catalog: RouteCatalogData,
    private readonly content: Content,
  ) {
    const modules = new Map<string, ModuleId>();
    for (const { id, modul } of content.przepisy.przepisy) {
      if (modul === 'M08') continue;
      modules.set(id, modul);
      const rules = this.rulesByModule.get(modul) ?? [];
      rules.push(id);
      this.rulesByModule.set(modul, rules);
    }
    for (const question of content.pytania.pytania)
      for (const id of question.przepisy) {
        const questions = this.questionsByRule.get(id) ?? [];
        questions.push(question);
        this.questionsByRule.set(id, questions);
      }
    const candidates: Candidate[] = [];
    const add = (
      kind: OrderKind,
      route: CertifiedRoute,
      ruleIds: readonly string[],
      night = false,
      sign?: Candidate['sign'],
    ) => {
      for (const ruleId of new Set(ruleIds)) {
        const module = modules.get(ruleId);
        if (module)
          candidates.push({ kind, route, ruleId, module, night, sign });
      }
    };
    const aidRules = (this.rulesByModule.get('M07') ?? []).filter((id) =>
      this.questionsByRule.has(id),
    );
    for (const route of catalog.routes) {
      if (route.race) {
        add('race', route, route.rules);
        continue;
      }
      const rules = route.safeStop
        ? [...route.rules, ...aidRules]
        : route.rules;
      add('delivery', route, rules);
      add('pickup', route, rules);
      if (route.steps.length >= 3) add('collect', route, rules);
      if (route.steps.every(({ walking }) => !walking)) {
        add('escort', route, rules);
        add('fragile', route, rules);
      }
      for (const sign of route.signs) {
        const ruleId = signRules[sign.code];
        if (route.safeStop && ruleId)
          add('photo', route, [ruleId], false, sign);
      }
    }
    for (const route of catalog.nightRoutes)
      add('delivery', route, ['WYP-04', 'WYP-05', 'MSC-04'], true);
    this.candidates = candidates;
  }

  generate(
    seed: number,
    mastery: ProgressProfile['mastery'],
    count = 3,
  ): DailyOrder[] {
    const balance = this.content.balans.mastery;
    const modules = new Map(
      [...this.rulesByModule].map(([id, rules]) => [
        id,
        moduleMastery(mastery, rules),
      ]),
    );
    const score = ({ ruleId, module }: Candidate) =>
      (mastery[ruleId]?.value ?? 0) + (modules.get(module) ?? 0);
    const result: DailyOrder[] = [];
    const ranked = this.candidates.map((candidate) => {
      const { kind, route, ruleId, night } = candidate;
      const weakness = score(candidate);
      const draw =
        (orderSeed(`${seed}/${route.id}/${kind}/${ruleId}/${night}`) + 1) /
        (2 ** 32 + 1);
      return {
        candidate,
        weakness,
        draw: -Math.log(draw) / masteryWeight(weakness / 2, balance),
      };
    });
    const minimum = ranked.reduce(
      (min, { weakness }) => Math.min(min, weakness),
      Infinity,
    );
    const kinds = orderKinds
      .map((kind) => ({ kind, draw: orderSeed(`${seed}/${kind}`) }))
      .sort((a, b) => a.draw - b.draw);
    const weakest = kinds.find(({ kind }) =>
      ranked.some(
        ({ candidate, weakness }) =>
          candidate.kind === kind && weakness === minimum,
      ),
    );
    if (!weakest || count <= 0) return result;
    const usedRoutes = new Set<string>();
    for (const choice of [
      weakest,
      ...kinds.filter((kind) => kind !== weakest),
    ]) {
      const isFirst = choice === weakest;
      let best: (typeof ranked)[number] | undefined;
      for (const entry of ranked) {
        const { candidate, weakness, draw } = entry;
        if (
          candidate.kind !== choice.kind ||
          usedRoutes.has(candidate.route.id) ||
          (isFirst && weakness !== minimum)
        )
          continue;
        if (!best || draw < best.draw) best = entry;
      }
      if (best) {
        usedRoutes.add(best.candidate.route.id);
        result.push(this.create(best.candidate, seed));
      }
      if (result.length >= count) break;
    }
    return result;
  }

  private create(
    { kind, route, ruleId, night, sign }: Candidate,
    seed: number,
  ): DailyOrder {
    const hash = orderSeed(
      `${this.city}/${seed}/${kind}/${route.id}/${ruleId}`,
    );
    const id = `${this.city}-daily-${kind}-${hash.toString(36)}`;
    const item = kind === 'fragile' ? 'model' : items[hash % items.length]!;
    const sender = senders[(hash >>> 8) % senders.length]!;
    const start = route.steps[0]!.poi.id;
    const finish = route.steps.at(-1)!.poi.id;
    const labels = `procedural.templates.${kind}`;
    const goals: MissionGoal[] = [];
    if (night) goals.push({ typ: 'przygotuj_rower' });
    if (kind === 'delivery' || kind === 'fragile')
      goals.push({
        typ: 'odbierz',
        przedmiot: item,
        opis: 'procedural.goals.pickup',
      });
    for (const { poi, walking } of route.steps.slice(1)) {
      if (kind === 'collect' && poi.id !== finish) {
        goals.push({
          typ: 'odbierz',
          poi: poi.id,
          przedmiot: `${item}-${goals.length}`,
          opis: walking
            ? 'procedural.goals.collectWalk'
            : 'procedural.goals.collect',
        });
      } else {
        goals.push({
          typ: 'dojedz',
          poi: poi.id,
          opis: walking ? 'procedural.goals.walk' : 'procedural.goals.ride',
        });
      }
    }
    if (kind === 'pickup' || kind === 'collect')
      goals.push({
        typ: 'odbierz',
        przedmiot: item,
        opis: 'procedural.goals.pickup',
      });
    if (kind === 'delivery' || kind === 'fragile')
      goals.push({
        typ: 'oddaj',
        przedmiot: item,
        opis: 'procedural.goals.deliver',
      });
    if (sign)
      goals.push({
        typ: 'sfotografuj',
        poi: finish,
        znak: sign.id,
        opis: 'procedural.goals.photo',
      });
    const questions =
      route.safeStop &&
      !sign &&
      !route.race &&
      !night &&
      !route.proof.habits.includes(ruleId)
        ? this.questionsByRule.get(ruleId)
        : undefined;
    const question = questions?.[hash % questions.length];
    if (question)
      goals.push({
        typ: 'wybor',
        poi: finish,
        regula: ruleId,
        poprawna: question.poprawna,
        opis: 'procedural.goals.question',
        pytanie: question.id,
        odpowiedzi: question.odpowiedzi.map((_, i) => `${question.id}-${i}`),
        wyjasnienie: question.id,
      });
    const par = Math.max(
      30,
      Math.ceil(Math.max(route.proof.seconds, route.race?.seconds ?? 0) * 1.45),
    );
    const timed = kind === 'delivery' || kind === 'race';
    return {
      kind,
      route,
      question,
      text: {
        place: route.district
          ? `procedural.places.${this.city}.${route.district}`
          : `cityPicker.${this.city}`,
        item: `procedural.items.${item}`,
        sender: `procedural.senders.${sender}`,
        sign: sign?.code ?? '',
      },
      definition: {
        id,
        miasto: this.city,
        akt: 0,
        tytul: `${labels}.title`,
        opis: `${labels}.description`,
        zleceniodawca: route.race ? 'turbo' : sender,
        typ: types[kind],
        start: { poi: start, ...(night && { noc: true, kask_zapiety: false }) },
        cele: goals,
        ruch_ai: false,
        ...(timed && {
          limit_s: par + Math.max(30, Math.ceil(route.proof.seconds)),
        }),
        ...(kind === 'escort' && { towarzysze: 1 }),
        ...(kind === 'fragile' && { przesylka: { delikatna: true } }),
        ...(route.race && { wyscig: { trasa_rywala: route.race.rival } }),
        ...(route.race?.shortcut && {
          skrot: { odcinek: route.race.shortcut },
        }),
        warunki_porazki: [
          'major_x3',
          ...(timed ? ['czas_minal' as const] : []),
          ...(kind === 'race' ? ['dowolny_blad' as const] : []),
        ],
        checkpointy: route.steps
          .slice(1, -1)
          .filter(({ through }, index) => !through && index % 3 === 2)
          .map(({ poi }) => poi.id),
        reguly_cwiczone: [ruleId],
        zdarzenia_wymuszone: [],
        par_s: par,
        min_dobre_nawyki: 0,
        nagrody: { xp: 0, zetony: 0 },
      },
    };
  }
}

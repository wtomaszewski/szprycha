import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { moduleId } from '../../src/content/schemas';
import {
  ProgressStore,
  type ProgressProfile,
} from '../../src/core/progressStore';
import {
  drawExamQuestions,
  evaluateExam,
  licenceRequirements,
  type ExamResult,
} from '../../src/gameplay/exam/exam';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { placIds } from '../../src/gameplay/plac/PlacRun';
import { readContent } from '../../tools/content';

const content = await readContent();
const { balans } = content;
const campaign = content.misje.filter(
  ({ miasto, poboczna }) => miasto === 'wroclaw' && !poboczna,
);

function ready(profile: ProgressProfile) {
  profile.completed = campaign.map(({ id }) => id);
  profile.missionPoints = 40_000;
  profile.mastery = Object.fromEntries(
    content.przepisy.przepisy.map(({ id }) => [
      id,
      { value: 70, goodToday: 0 },
    ]),
  );
}

function exam(): ExamResult {
  return {
    city: 'wroclaw',
    theory: { correct: 20, total: 25 },
    plac: placIds.map((id, index) => ({
      id,
      grade: index === 0 ? 'minor' : 'good',
      faults: new Map(),
      ticks: 100,
    })),
    ride: { completed: true, minor: 2, major: 0 },
  };
}

it('reserves two questions per road module and apportions the rest by remaining pool size', () => {
  const questions = drawExamQuestions(content, 42);
  expect(questions).toHaveLength(25);
  expect(new Set(questions.map(({ id }) => id)).size).toBe(25);
  expect(
    Object.fromEntries(
      moduleId.options.map((module) => [
        module,
        questions.filter(({ modul }) => modul === module).length,
      ]),
    ),
  ).toEqual({ M01: 4, M02: 4, M03: 3, M04: 3, M05: 4, M06: 3, M07: 3, M08: 1 });
  expect(drawExamQuestions(content, 42)).toEqual(questions);
  expect(
    drawExamQuestions(content, 43)
      .map(({ id }) => id)
      .sort(),
  ).not.toEqual(questions.map(({ id }) => id).sort());
});

it.each([1, 8, 14, content.pytania.pytania.length])(
  'draws exactly %i distinct questions when the exam length is configured',
  (limit) => {
    const config = {
      ...content,
      balans: {
        ...balans,
        licencja: { ...balans.licencja, teoria_pytan: limit },
      },
    };
    const questions = drawExamQuestions(config, 42);
    expect(questions).toHaveLength(limit);
    expect(new Set(questions.map(({ id }) => id)).size).toBe(limit);
    const modules = new Set(questions.map(({ modul }) => modul));
    if (limit === 8) expect(modules.size).toBe(8);
    if (limit === 14) {
      expect(modules.size).toBe(7);
      expect(modules.has('M08')).toBe(false);
      for (const module of modules)
        expect(questions.filter(({ modul }) => modul === module)).toHaveLength(
          2,
        );
    }
  },
);

it('accepts the configured threshold inclusively and requires the full practical exam', () => {
  const result = exam();
  const { ride } = result;
  expect(evaluateExam(result, balans)).toMatchObject({
    practice: { points: 5.5 },
    passed: true,
  });
  expect(
    evaluateExam({ ...result, theory: { correct: 19, total: 25 } }, balans)
      .passedTheory,
  ).toBe(false);
  expect(
    evaluateExam({ ...result, theory: { correct: 4, total: 5 } }, balans)
      .passedTheory,
  ).toBe(false);
  expect(
    evaluateExam({ ...result, plac: result.plac.slice(1) }, balans)
      .passedPractice,
  ).toBe(false);
  expect(
    evaluateExam(
      { ...result, plac: [result.plac[1]!, ...result.plac.slice(1)] },
      balans,
    ).passedPractice,
  ).toBe(false);
  expect(evaluateExam({ ...result, ride: undefined }, balans).passedRide).toBe(
    false,
  );
  expect(
    evaluateExam({ ...result, ride: { ...ride!, completed: false } }, balans)
      .passedRide,
  ).toBe(false);
  expect(
    evaluateExam({ ...result, ride: { ...ride!, major: 1 } }, balans)
      .passedRide,
  ).toBe(false);
  expect(
    evaluateExam({ ...result, ride: { ...ride!, minor: 3 } }, balans)
      .passedRide,
  ).toBe(false);
  const stricter = {
    ...balans,
    licencja: { ...balans.licencja, teoria_prog: 0.81, plac_prog: 0.92 },
  };
  expect(evaluateExam(result, stricter)).toMatchObject({
    passedTheory: false,
    passedPractice: false,
    passed: false,
  });
  expect(
    evaluateExam(result, {
      ...balans,
      plac: { ...balans.plac, points: { ...balans.plac.points, minor: 0.4 } },
    }).passedPractice,
  ).toBe(true);
  expect(
    evaluateExam(result, {
      ...balans,
      plac: { ...balans.plac, points: { ...balans.plac.points, minor: 0.399 } },
    }).passedPractice,
  ).toBe(false);
});

it.each([
  [
    'campaign missing one mission',
    (profile: ProgressProfile) => profile.completed.shift(),
  ],
  [
    'rank just below the threshold',
    (profile: ProgressProfile) => profile.missionPoints--,
  ],
  ...Array.from({ length: 8 }, (_, index) => {
    const rule = content.przepisy.przepisy.find(
      ({ modul }) => modul === `M0${index + 1}`,
    )!;
    return [
      rule.modul,
      (profile: ProgressProfile) => profile.mastery[rule.id]!.value--,
    ] as const;
  }),
] as const)('requires %s before awarding the licence', (_reason, remove) => {
  const progress = new MissionProgress();
  ready(progress.store.profile);
  remove(progress.store.profile);
  expect(progress.unlocks(content)).not.toContain('egzamin_licencji');
  expect(progress.recordLicence(content, exam())).toBe(false);
  expect(progress.store.profile.licence).toBeUndefined();
  expect(progress.store.profile.licencePassed).toBe(false);
});

it('requires all conditions in one city and saves only the first completed exam scores and date', async () => {
  const factory = new IDBFactory();
  const progress = new MissionProgress(await ProgressStore.open(factory));
  progress.store.change(ready);
  const result = exam();
  expect(licenceRequirements(progress.store.profile, content).cities).toEqual([
    'wroclaw',
  ]);
  expect(progress.recordLicence(content, { ...result, city: 'warszawa' })).toBe(
    false,
  );
  expect(progress.recordLicence(content, { ...result, ride: undefined })).toBe(
    false,
  );
  expect(progress.unlocks(content)).not.toContain('zloty_dzwonek');
  expect(progress.recordLicence(content, result, '2026-11-22')).toBe(true);
  expect(
    progress.recordLicence(
      content,
      {
        ...result,
        firstName: 'Żaneta',
        theory: { ...result.theory, firstName: 'Żaneta' },
      } as ExamResult,
      '2026-11-23',
    ),
  ).toBe(true);
  await progress.store.flush();
  const loaded = new MissionProgress(await ProgressStore.open(factory));
  expect(loaded.rank(content)?.id).toBe('legenda');
  expect(loaded.unlocks(content)).toContain('zloty_dzwonek');
  expect(loaded.store.profile.licence).toEqual({
    date: '2026-11-22',
    theory: { correct: 20, total: 25 },
    practice: { points: 5.5, max: 6 },
  });
  expect(JSON.stringify(loaded.store.profile)).not.toContain('Żaneta');
});

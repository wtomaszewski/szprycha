import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { reputationRank } from '../../src/progression/reputation';
import { readContent } from '../../tools/content';

const content = await readContent();
const { balans, misje } = content;

it('adds half of completed mission points, awarded quiz XP and one award per achievement', () => {
  const progress = new MissionProgress();
  const mission = misje[0]!;
  const reward = { stars: 1, balance: balans.gwiazdki } as const;
  for (const points of [1001, 750, -150])
    progress.complete(mission, { ...reward, points });
  expect(progress.xp).toBe(875.5);
  expect(progress.bestScore(mission.id)).toBe(1001);
  expect(progress.tokens).toBe(10);

  progress.awardAchievement('seria_5', 75);
  progress.awardAchievement('seria_5', 75);
  progress.recordQuizAnswer('ZNAK-STOP', true, balans.mastery, 20);
  progress.recordQuizAnswer('ZNAK-STOP', false, balans.mastery, 20);
  expect(progress.xp).toBe(970.5);
});

it.each([
  [0, 'zoltodziob'],
  [1999.5, 'zoltodziob'],
  [2000, 'kurier'],
  [5999.5, 'kurier'],
  [6000, 'kurier_pro'],
  [11999.5, 'kurier_pro'],
  [12000, 'pilot_miejski'],
  [19999.5, 'pilot_miejski'],
  [20000, 'mistrz_szlaku'],
  [100000, 'mistrz_szlaku'],
])('at %i XP gives rank %s', (xp, rank) => {
  expect(reputationRank(balans.rangi, xp, false)?.id).toBe(rank);
});

it('accumulates unlock flags and gates the licence exam on campaign progress and mastery', () => {
  const progress = new MissionProgress();
  expect([...progress.unlocks(content)]).toEqual(['miasteczko', 'akt_1']);
  progress.awardAchievement('seria_5', 2_000);
  expect([...progress.unlocks(content)]).toEqual([
    'miasteczko',
    'akt_1',
    'akt_2',
    'quiz',
    'wyzwania_dzienne',
  ]);
  progress.awardAchievement('seria_100', 18_000);
  expect(progress.unlocks(content)).toContain('rankingi_tygodniowe');
  expect(progress.unlocks(content)).not.toContain('egzamin_licencji');
  for (const { id } of content.przepisy.przepisy)
    for (let i = 0; i < 5; i++)
      progress.recordQuizAnswer(id, true, balans.mastery);
  expect(progress.unlocks(content)).not.toContain('egzamin_licencji');
  for (const mission of misje.filter(
    ({ miasto, poboczna }) => miasto === 'warszawa' && !poboczna,
  ))
    progress.complete(mission);
  expect(progress.unlocks(content)).toContain('egzamin_licencji');
  expect(progress.unlocks(content)).not.toContain('zloty_dzwonek');
});

it('keeps the configured quiz and exam thresholds from docs/04', () => {
  expect(balans.leitner_odstepy_dni).toEqual([0, 1, 3, 7, 14]);
  expect(balans.licencja).toMatchObject({
    mastery_min_modul: 70,
    teoria_pytan: 25,
    teoria_prog: 0.8,
    plac_prog: 0.9,
    przejazd_max_minor: 2,
    przejazd_max_major: 0,
  });
});

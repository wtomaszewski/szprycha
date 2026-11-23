import { readContent } from '../../tools/content';
import { describe, expect, it } from 'vitest';
import { missionSchema } from '../../src/content/missions';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import { RoadAttention } from '../../src/progression/RoadAttention';
import type { Verdict } from '../../src/rules/types';
import type {
  Box,
  PointOfInterest,
  Zone,
} from '../../src/rules/world/WorldModel';

const { balans, pytania } = await readContent();

const start = { id: 'start', x: 1, y: 1, width: 0, height: 0, heading: 0 };
const pickup = { ...start, id: 'pickup', x: 8 };
const checkpoint = { ...start, id: 'check', x: 16, heading: 1 };
const destination = { ...start, id: 'destination', x: 24 };
const zone: Zone = {
  id: 'road',
  kind: 'roadway',
  x: 16,
  y: 0,
  width: 4,
  height: 3,
};
const trigger: Box = { id: 'event', x: 24, y: 0, width: 2, height: 2 };
const world = {
  pois: new Map<string, PointOfInterest>(
    [start, pickup, checkpoint, destination].map((poi) => [poi.id, poi]),
  ),
  zones: [zone],
  triggers: new Map([[trigger.id, trigger]]),
};
const definition = missionSchema.parse({
  id: 'WAW-T-01',
  miasto: 'warszawa',
  akt: 0,
  tytul: 'misje.WAW-T-01.tytul',
  zleceniodawca: 'sierzant_ola',
  typ: 'dostawa_na_czas',
  start: { poi: 'start' },
  cele: [
    { typ: 'dojedz', poi: 'pickup' },
    { typ: 'odbierz', przedmiot: 'paczka' },
    { typ: 'dojedz', poi: 'check' },
    { typ: 'oddaj', poi: 'destination', przedmiot: 'paczka' },
  ],
  checkpointy: ['check'],
  reguly_cwiczone: ['ZNAK-STOP'],
  par_s: 25,
  min_dobre_nawyki: 1,
  nagrody: { zetony: 0, xp: 0 },
});

const good: Verdict = {
  ruleId: 'ZNAK-STOP',
  kind: 'good',
  at: 1,
  pos: destination,
  evidence: {},
  feedbackKey: 'przepisy.ZNAK-STOP.feedback',
};
const major: Verdict = {
  ...good,
  kind: 'major',
  ruleId: 'SYG-01',
  feedbackKey: 'przepisy.SYG-01.feedback',
};

function driveToCheckpoint(mission: MissionSystem) {
  mission.step(pickup, []);
  mission.step(pickup, []);
  mission.step(checkpoint, []);
}

describe('MissionSystem', () => {
  it('completes goals in order and records the mission result', () => {
    const mission = new MissionSystem(definition, world, balans);
    expect(mission.start).toEqual({ x: 1, y: 1, heading: 0 });
    mission.step(destination, []);
    expect(mission.target?.goal.typ).toBe('dojedz');
    mission.step(pickup, []);
    expect(mission.target?.goal.typ).toBe('odbierz');
    expect(mission.target?.position).toEqual({ x: pickup.x, y: pickup.y });
    mission.step(pickup, []);
    mission.step(checkpoint, []);
    mission.step(destination, [good]);
    expect(mission.result).toEqual({
      status: 'completed',
      missionId: 'WAW-T-01',
      elapsedSeconds: 5 / 60,
      par_s: 25,
      goodHabits: 1,
      points: 1550,
      completionPoints: 1000,
      habitPoints: 50,
      penaltyPoints: 0,
      questionPoints: 0,
      timeBonus: 500,
      stars: 3,
      longestSeries: 1,
      verdicts: [good],
      illegalShortcut: false,
      timeBonusEligible: true,
    });
    mission.step(destination, [major]);
    expect(mission.result?.verdicts).toEqual([good]);
    expect(mission.target).toBeUndefined();
  });

  it.each(['mission', 'goal'])(
    'times out at the exact %s deadline',
    (scope) => {
      const mission = new MissionSystem(
        {
          ...definition,
          warunki_porazki: ['czas_minal'],
          limit_s: scope === 'mission' ? 1 : 2,
          cele: [
            {
              typ: 'dojedz',
              poi: 'destination',
              limit_s: scope === 'goal' ? 1 : undefined,
            },
          ],
        },
        world,
        balans,
      );
      for (let i = 0; i < 59; i++) mission.step(start, []);
      expect(mission.result).toBeUndefined();
      expect(mission.remainingSeconds).toBeCloseTo(1 / 60);
      mission.step(destination, []);
      expect(mission.result).toMatchObject({
        status: 'failed',
        reason: 'czas_minal',
        elapsedSeconds: 1,
        timeBonusEligible: false,
      });
    },
  );

  it('ends the attempt on the first major, even at the goal and with a control question pending', () => {
    const mission = new MissionSystem(definition, world, balans);
    driveToCheckpoint(mission);
    mission.step(checkpoint, [good]);
    mission.answerQuestion(balans.uwaga_drogowki.bonus_madra_glowa);
    expect(
      mission.step(
        destination,
        [major],
        undefined,
        undefined,
        undefined,
        1,
        true,
      ),
    ).toBeUndefined();
    expect(mission.result).toMatchObject({
      status: 'failed',
      reason: 'major',
      verdict: major,
      verdicts: [good, major],
      points: 0,
      habitPoints: 0,
      questionPoints: 0,
      stars: 0,
      timeBonusEligible: false,
    });
    expect(mission.waitingForQuestion).toBe(false);
    mission.step(destination, [good]);
    expect(mission.result?.verdicts).toEqual([good, major]);
  });

  it('fails a fragile delivery at the configured shock threshold', () => {
    const mission = new MissionSystem(
      { ...definition, przesylka: { delikatna: true } },
      { ...world, zones: [{ ...zone, surface: 'rough' }] },
      balans,
    );
    driveToCheckpoint(mission);
    for (let tick = 0; tick < 120 && !mission.result; tick++)
      mission.step(checkpoint, [], undefined, undefined, undefined, 8);
    expect(mission.result).toMatchObject({
      status: 'failed',
      reason: 'wstrzasy_paczki',
      shocks: balans.misja.prog_wstrzasow_porazka,
      points: 0,
    });
  });

  it('fails at full Road Attention when the finishing question is answered incorrectly', () => {
    const mission = new MissionSystem(definition, world, balans);
    const attention = new RoadAttention(balans.uwaga_drogowki, pytania.pytania);
    const minor = { ...good, kind: 'minor' } as const;
    mission.step(start, [good]);
    driveToCheckpoint(mission);
    for (let i = 0; i < balans.uwaga_drogowki.max; i++) {
      attention.step([minor], true);
      const position = attention.pending ? destination : checkpoint;
      mission.step(
        position,
        [minor],
        undefined,
        undefined,
        undefined,
        1,
        Boolean(attention.pending),
      );
    }
    expect(attention.level).toBe(balans.uwaga_drogowki.max);
    expect(mission.waitingForQuestion).toBe(true);
    const wrongIndex =
      (attention.pending!.poprawna + 1) % attention.pending!.odpowiedzi.length;
    const answer = attention.answer(wrongIndex)!;
    expect(answer.correct).toBe(false);
    mission.failControlQuestion(answer.ruleId);
    expect(mission.result).toMatchObject({
      status: 'failed',
      reason: 'uwaga_drogowki',
      verdict: minor,
      points: 0,
      stars: 0,
    });
    expect(mission.waitingForQuestion).toBe(false);
  });

  it('counts a control answer before producing the result of the finishing tick', () => {
    const mission = new MissionSystem(
      { ...definition, cele: [{ typ: 'dojedz', poi: 'destination' }] },
      world,
      balans,
    );
    const minor = { ...major, kind: 'minor' } as const;
    mission.step(
      destination,
      [minor],
      undefined,
      undefined,
      undefined,
      1,
      true,
    );
    expect(mission.result).toBeUndefined();
    const elapsed = mission.elapsedSeconds;
    mission.step(destination, []);
    expect(mission.elapsedSeconds).toBe(elapsed);
    const bonus = balans.uwaga_drogowki.bonus_madra_glowa;
    mission.answerQuestion(bonus);
    expect(mission.result).toMatchObject({
      status: 'completed',
      stars: 2,
      points: 1450,
      elapsedSeconds: elapsed,
    });
    mission.answerQuestion(bonus);
    expect(mission.result?.points).toBe(1450);
  });

  it('rewinds a missing required habit, preserving the clock, stage budget and verdicts', () => {
    const mission = new MissionSystem(
      {
        ...definition,
        warunki_porazki: ['czas_minal'],
        limit_s: 60,
        cele: [
          ...definition.cele.slice(0, 3),
          { typ: 'dojedz', poi: 'destination', limit_s: 1 },
          {
            typ: 'oddaj',
            przedmiot: 'paczka',
            poi: 'destination',
            wymagany_nawyk: good.ruleId,
          },
        ],
      },
      world,
      balans,
    );
    mission.step(start, []);
    driveToCheckpoint(mission);
    mission.step(destination, [good]);
    expect(mission.target?.goal.typ).toBe('oddaj');
    expect(mission.step(destination, [])?.respawn).toEqual({
      x: checkpoint.x,
      y: checkpoint.y,
      heading: checkpoint.heading,
    });
    expect(mission.target?.goal.typ).toBe('dojedz');
    expect(mission.remainingSeconds).toBeCloseTo(59 / 60);
    expect(mission.elapsedSeconds).toBe(6 / 60);
    mission.step(destination, []);
    mission.step(destination, [good]);
    expect(mission.result).toMatchObject({
      status: 'completed',
      elapsedSeconds: 8 / 60,
      goodHabits: 2,
      verdicts: [good, good],
      timeBonusEligible: true,
    });
  });

  it('updates the checkpoint when the rider returns with more goals completed', () => {
    const mission = new MissionSystem(definition, world, balans);
    mission.step(checkpoint, []);
    driveToCheckpoint(mission);
    mission.rewindCheckpoint();
    expect(mission.target?.goal.typ).toBe('oddaj');
  });

  it('triggers each configured event once per attempt by POI, zone or trigger', () => {
    const events = [checkpoint.id, zone.id, trigger.id].map((przy) => ({
      przy,
      typ: 'cwiczenie_stop',
      regula: 'ZNAK-STOP',
    }));
    const mission = new MissionSystem(
      { ...definition, zdarzenia_wymuszone: events },
      world,
      balans,
    );
    expect(mission.step(checkpoint, [])?.events).toEqual(events.slice(0, 2));
    mission.rewindCheckpoint();
    expect(mission.step(checkpoint, [])).toBeUndefined();
    expect(mission.step(destination, [])?.events).toEqual(events.slice(2));
    expect(mission.step(destination, [])).toBeUndefined();
  });

  it('gives the same effects and result for the same positions and verdicts', () => {
    function run() {
      const mission = new MissionSystem(definition, world, balans);
      const effects = [
        mission.step(start, []),
        mission.step(pickup, []),
        mission.step(pickup, []),
        mission.step(checkpoint, []),
        mission.step(destination, [good]),
      ];
      return { effects, result: mission.result };
    }
    const first = run();
    expect(first.result?.status).toBe('completed');
    expect(run()).toEqual(first);
  });
});

import { readContent } from '../../tools/content';
import { describe, expect, it } from 'vitest';
import { missionSchema } from '../../src/content/missions';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import type { Verdict } from '../../src/rules/types';
import type {
  Box,
  PointOfInterest,
  Zone,
} from '../../src/rules/world/WorldModel';

const { balans } = await readContent();

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
  warunki_porazki: ['major_x3'],
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
const major: Verdict = { ...good, kind: 'major', ruleId: 'SYG-01' };

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

  it('fails at the third major verdict, even at the goal', () => {
    const mission = new MissionSystem(definition, world, balans);
    driveToCheckpoint(mission);
    for (let i = 0; i < 2; i++) {
      expect(mission.step(destination, [major])?.respawn).toBeDefined();
      expect(mission.result).toBeUndefined();
    }
    expect(mission.step(destination, [major])).toBeUndefined();
    expect(mission.result).toMatchObject({
      status: 'failed',
      reason: 'major_x3',
      verdicts: [major, major, major],
      timeBonusEligible: false,
    });
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

  it('rewinds goal progress, preserving the clock, stage budget and verdicts', () => {
    const mission = new MissionSystem(
      {
        ...definition,
        warunki_porazki: ['czas_minal', 'major_x3'],
        limit_s: 60,
        cele: [
          ...definition.cele.slice(0, 3),
          { typ: 'dojedz', poi: 'destination', limit_s: 1 },
          { typ: 'oddaj', przedmiot: 'paczka', poi: 'destination' },
        ],
      },
      world,
      balans,
    );
    expect(mission.step(start, [major])?.respawn).toEqual(mission.start);
    driveToCheckpoint(mission);
    mission.step(destination, [good]);
    expect(mission.target?.goal.typ).toBe('oddaj');
    expect(mission.step(destination, [major])?.respawn).toEqual({
      x: checkpoint.x,
      y: checkpoint.y,
      heading: checkpoint.heading,
    });
    expect(mission.target?.goal.typ).toBe('dojedz');
    expect(mission.remainingSeconds).toBeCloseTo(59 / 60);
    expect(mission.elapsedSeconds).toBe(6 / 60);
    mission.step(destination, []);
    mission.step(destination, []);
    expect(mission.result).toMatchObject({
      status: 'completed',
      elapsedSeconds: 8 / 60,
      goodHabits: 1,
      verdicts: [major, good, major],
      timeBonusEligible: false,
    });
  });

  it('updates the checkpoint when the rider returns with more goals completed', () => {
    const mission = new MissionSystem(definition, world, balans);
    mission.step(checkpoint, []);
    driveToCheckpoint(mission);
    mission.step(destination, [major]);
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
    expect(mission.step(checkpoint, [major])?.respawn).toBeDefined();
    expect(mission.step(checkpoint, [])).toBeUndefined();
    expect(mission.step(destination, [])?.events).toEqual(events.slice(2));
    expect(mission.step(destination, [])).toBeUndefined();
  });

  it('gives the same effects and result for the same positions and verdicts', () => {
    function run() {
      const mission = new MissionSystem(definition, world, balans);
      const effects = [
        mission.step(start, [major]),
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

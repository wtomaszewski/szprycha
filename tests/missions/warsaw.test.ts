import { expect, it } from 'vitest';
import { warsawRoutes, type WarsawMissionId } from './warsaw-routes';
import { missionContent, runWarsawRoute } from './run-warsaw-route';

it.each(Object.keys(warsawRoutes) as WarsawMissionId[])(
  '%s completes the reference route',
  (id) => {
    const legal = runWarsawRoute(id, warsawRoutes[id].legal);
    expect(
      legal.mission.result,
      JSON.stringify({
        ...legal,
        mission: undefined,
        seenAgents: [...legal.seenAgents],
      }),
    ).toMatchObject({
      status: 'completed',
      timeBonusEligible: true,
      illegalShortcut: false,
    });
    expect(
      legal.mission.result?.verdicts.map(({ kind }) => kind),
    ).not.toContain('major');
    const habits: Record<WarsawMissionId, string[]> = {
      'WAW-T-02': ['MSC-04'],
      'WAW-A1-01': ['PIER-01'],
      'WAW-A1-02': ['MSC-03', 'MAN-01', 'MAN-07'],
      'WAW-A1-03': ['ZNAK-STOP'],
      'WAW-A1-04': ['GDZIE-01', 'GDZIE-06'],
      'WAW-A1-05': [],
      'WAW-A1-06': [],
    };
    expect(legal.mission.result?.verdicts).toEqual(
      expect.arrayContaining(
        habits[id].map((ruleId) =>
          expect.objectContaining({ ruleId, kind: 'good' }),
        ),
      ),
    );
    if (id.startsWith('WAW-A1'))
      expect(legal.mission.result!.elapsedSeconds).toBeGreaterThanOrEqual(120);
    expect(legal.mission.result!.elapsedSeconds).toBeLessThan(
      legal.mission.definition.par_s,
    );
    expect(legal.collision).toBe(false);
    expect(legal.fired).toEqual(
      legal.mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'WAW-A1-04') {
      const violations = legal.mission.race?.opponentVerdicts.filter(
        ({ kind }) => kind !== 'good',
      );
      expect(violations?.map(({ ruleId }) => ruleId)).toEqual(
        expect.arrayContaining(['ZNAK-B2T22', 'GDZIE-06']),
      );
      expect(legal.mission.result!.opponentScore).toBeLessThanOrEqual(
        missionContent.balans.misja.ukonczenie,
      );
      expect(legal.mission.result!.points!).toBeGreaterThan(
        legal.mission.result!.opponentScore!,
      );
    }
    if (id === 'WAW-A1-05')
      expect(legal.mission.result!.smoothBonus).toBeGreaterThan(0);
    if (id === 'WAW-A1-06') expect(legal.mission.result!.photos).toBe(1);
    const agent = {
      'WAW-A1-01': 'auto-z-prawej',
      'WAW-A1-02': 'pieszy-brama',
      'WAW-A1-03': 'auto-na-glownej',
      'WAW-T-02': undefined,
      'WAW-A1-04': 'pieszy-zamkowy',
      'WAW-A1-05': 'turysci-rynek',
      'WAW-A1-06': undefined,
    }[id];
    if (agent) expect(legal.seenAgents).toContain(agent);
  },
);

it('shakes the parcel when riding fast on the cobbles', () => {
  const [market, beforePromenade, ...rest] = warsawRoutes['WAW-A1-05'].legal;
  const run = runWarsawRoute('WAW-A1-05', [
    { ...market!, maxInput: 1 },
    { ...beforePromenade!, maxInput: 1 },
    ...rest,
  ]);
  expect(run.mission.result).toMatchObject({
    status: 'completed',
    smoothBonus: 0,
    verdicts: expect.arrayContaining([
      expect.objectContaining({ ruleId: 'MAN-08', kind: 'minor' }),
    ]),
  });
  expect(run.mission.result!.shocks!).toBeGreaterThanOrEqual(
    missionContent.balans.misja.prog_wstrzasow_plynnosc,
  );
});

it('records the instruction from Ola when the rider crosses on green too early', () => {
  const [stop, ...legal] = warsawRoutes['WAW-A1-06'].legal;
  const run = runWarsawRoute('WAW-A1-06', [legal[0]!], [stop!, ...legal]);
  expect(run.mission.result).toMatchObject({
    status: 'completed',
    photos: 1,
    timeBonusEligible: false,
    verdicts: expect.arrayContaining([
      expect.objectContaining({ ruleId: 'SYG-03', kind: 'major' }),
    ]),
  });
});

it('leaves the photo objective open when the rider passes the sign without taking a picture', () => {
  const run = runWarsawRoute(
    'WAW-A1-06',
    warsawRoutes['WAW-A1-06'].legal.map((point) => ({
      ...point,
      photo: false,
    })),
  );
  expect(run.mission.result).toBeUndefined();
  expect(run.target).toBe('foto_znak');
});

it('penalizes an unsignaled exit during the first delivery', () => {
  const id = 'WAW-A1-01';
  const route = warsawRoutes[id].legal.map((point) => ({
    ...point,
    signal: undefined,
  }));
  const run = runWarsawRoute(id, route);
  expect(run.mission.result?.verdicts).toContainEqual(
    expect.objectContaining({ ruleId: 'MAN-01', kind: 'minor' }),
  );
});

it('records a missed turn signal during the bazaar course', () => {
  const id = 'WAW-A1-02';
  const route = warsawRoutes[id].legal.map((point) =>
    point.until === 'signaled'
      ? { ...point, until: undefined, signal: undefined }
      : { ...point, signal: undefined },
  );
  const run = runWarsawRoute(id, route);
  expect(run.mission.result?.verdicts).toContainEqual(
    expect.objectContaining({ ruleId: 'MAN-01', kind: 'minor' }),
  );
});

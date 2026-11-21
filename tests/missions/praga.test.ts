import { expect, it } from 'vitest';
import { pragaRoutes, type PragaMissionId } from './praga-routes';
import { runPragaRoute } from './run-praga-route';

it.each(Object.keys(pragaRoutes) as PragaMissionId[])(
  '%s completes the reference route',
  (id) => {
    const legal = runPragaRoute(id, pragaRoutes[id].legal);
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
    const habits: Record<PragaMissionId, string[]> = {
      'WAW-T-02': ['MSC-04'],
      'WAW-A1-01': ['PIER-01'],
      'WAW-A1-02': ['MSC-03', 'MAN-01', 'MAN-07'],
      'WAW-A1-03': ['ZNAK-STOP'],
    };
    expect(legal.mission.result?.verdicts).toEqual(
      expect.arrayContaining(
        habits[id].map((ruleId) =>
          expect.objectContaining({ ruleId, kind: 'good' }),
        ),
      ),
    );
    expect(legal.mission.result!.elapsedSeconds).toBeLessThan(
      legal.mission.definition.par_s,
    );
    expect(legal.collision).toBe(false);
    expect(legal.fired).toEqual(
      legal.mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    const agent = {
      'WAW-A1-01': 'auto-z-prawej',
      'WAW-A1-02': 'pieszy-brama',
      'WAW-A1-03': 'auto-na-glownej',
      'WAW-T-02': undefined,
    }[id];
    if (agent) expect(legal.seenAgents).toContain(agent);
  },
);

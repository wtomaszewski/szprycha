import { expect, it } from 'vitest';
import { examRoute } from '../../src/gameplay/exam/route';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

function at(x: number, y: number, options: Partial<Waypoint> = {}): Waypoint {
  return { x, y, look: true, ...options };
}

const walking = { walking: true };
const riding = { walking: false };
const slow = { maxInput: 0.43 };
const corner = { signal: 'left', ...slow } as const;
const parade = [
  at(4464, 1792, corner),
  at(4464, 1872, corner),
  at(4512, 1904, corner),
  at(4576, 1904, corner),
  at(4704, 1904, corner),
  at(4752, 1856, corner),
  at(4752, 1792, corner),
  at(4752, 1712, corner),
  at(4712, 1632, corner),
  at(4640, 1616, corner),
  at(4512, 1616, corner),
  at(4464, 1664, corner),
  at(4464, 1728, corner),
];
const routes = {
  'WRO-T-01': [
    at(424, 1065, { ...slow, helmet: true }),
    at(424, 1196),
    at(424, 1250, { wait: 1 }),
    at(424, 1524),
  ],
  'WRO-T-02': [at(1790, 1057), at(1911, 1055)],
  'WRO-A1-01': [
    at(3024, 2016, walking),
    at(3104, 2016, walking),
    at(3184, 2016, walking),
  ],
  'WRO-A1-02': [
    at(3092, 2386, walking),
    at(3092, 2348, walking),
    at(2950, 2348, walking),
    at(2950, 2016, walking),
    at(3024, 2016, walking),
  ],
  'WRO-A1-03': [
    at(3448, 1864, { ...walking, until: 'traffic-ended' }),
    at(3430, 1852, { ...walking, crossingGreen: 'rynek-zebra' }),
    at(3430, 1658, walking),
    at(3448, 1540, walking),
    at(2624, 1540, riding),
    at(2624, 1572),
    at(2624, 1336, corner),
    at(2775, 1336, walking),
  ],
  'WRO-A1-04': [
    at(2752, 780, { ...slow, signal: 'right' }),
    at(2624, 790, { ...slow, signal: 'left' }),
    at(2624, 864),
    at(2624, 1336, corner),
    at(2775, 1336, walking),
  ],
  'WRO-A1-05': [at(2624, 1072), at(2624, 1572)],
  'WRO-A1-06': [
    at(2642, 1678, { ...walking, photo: true }),
    at(2802, 1682, { ...walking, photo: true }),
    at(2802, 1850, walking),
    at(3024, 1912, walking),
  ],
  'WRO-A2-01': [
    ...parade.slice(0, 7),
    at(4896, 1792),
    at(4896, 1640, walking),
    at(4670, 1540, walking),
    at(4640, 1460, riding),
    at(4640, 1080),
    at(4750, 930, walking),
    at(4896, 936, walking),
    at(4896, 670, walking),
    at(4930, 670, walking),
  ],
  'WRO-A2-02': [
    at(4896, 2144),
    at(4992, 2208),
    at(4992, 2416),
    at(4992, 2488),
    at(5136, 2488, walking),
  ],
  'WRO-A2-03': [
    at(2624, 2776, { crossingGreen: 'poludnie-przejazd' }),
    at(2864, 2776),
    at(3060, 2776),
    at(3160, 2855),
    at(3728, 2855, { until: 'tram-cleared' }),
    at(3930, 2860),
    at(3940, 2794, walking),
  ],
  'WRO-A2-04': [
    at(2608, 3056),
    at(2608, 3080, { crossingGreen: 'poludnie-przejazd' }),
    at(2700, 3080, { signal: 'left' }),
    at(2810, 3056),
    at(4136, 3056),
  ],
  'WRO-A2-05': [at(3304, 3056, { photo: true }), at(4136, 3056)],
  'WRO-A2-06': [
    at(1080, 2848),
    at(928, 2848, { signal: 'right' }),
    at(928, 2800),
    at(928, 2710),
  ],
  'WRO-A3-01': [
    at(928, 2620, { railOpen: 'zachod-kolej-bez-zapor' }),
    at(928, 2410),
    at(928, 2305, { railOpen: 'zachod-kolej-zapory' }),
    at(928, 2112),
    at(880, 1992),
  ],
  'WRO-A3-02': [
    at(720, 3208, { photo: true }),
    at(720, 3208, { answer: 0 }),
    at(720, 3088),
    at(1104, 3032),
  ],
  'WRO-A3-03': [at(3664, 1540), at(2624, 1536), at(2128, 1536)],
  'WRO-A3-04': [
    at(3664, 1540),
    at(2624, 1536),
    at(2128, 1536),
    at(2000, 1530, { ...slow, signal: 'right' }),
    at(1256, 1536),
  ],
  'WRO-A3-05': [
    at(1376, 1602, { answer: 1 }),
    at(1376, 1602, { answer: 2 }),
    at(1376, 1602, { answer: 0 }),
    at(1376, 1602, { answer: 1 }),
  ],
  'WRO-A3-06': [
    at(2128, 1536, { answer: 0 }),
    at(2624, 1536),
    at(2624, 2690),
    at(2688, 2774, { until: 'officer-go', signal: 'left' }),
    at(2688, 3008),
    at(2688, 3104, walking),
    at(2624, 3104, walking),
    at(2624, 1872),
    at(2624, 1854, walking),
    at(2920, 1854, walking),
    at(3024, 1912, walking),
  ],
} satisfies Record<string, Waypoint[]>;

const sideRoutes = {
  'WRO-B-01': [
    at(4930, 670),
    at(5300, 670),
    at(5300, 224),
    at(5016, 224),
    at(5016, 172),
  ],
  'WRO-B-02': [
    at(2624, 1072),
    at(2624, 864),
    at(2624, 1072),
    at(2624, 1572),
    at(2624, 864),
    at(2624, 1572),
    at(2624, 1540),
    at(3552, 1540),
    at(3552, 1512),
    at(3552, 1358),
    at(3552, 1512),
    at(3552, 1358),
    at(3552, 1512),
    at(3552, 1536),
    at(4640, 1536),
    at(4640, 1464),
    at(4640, 1040),
    at(4640, 1464),
    at(4640, 1536),
    at(992, 1536),
    at(992, 1490),
    at(992, 960),
    at(992, 1490),
  ],
  'WRO-B-03': [
    at(3060, 2776),
    at(3160, 2855),
    at(3728, 2855, { until: 'tram-cleared' }),
    at(3930, 2855),
    at(3928, 2802, walking),
  ],
  'WRO-B-04': [at(3344, 1580, { answer: 0 }), at(3344, 1632), at(3344, 1672)],
  'WRO-B-05': [
    at(3552, 1540),
    at(3552, 1512),
    at(3552, 1358),
    at(3552, 1304),
    at(3712, 1304),
  ],
  'WRO-B-06': [at(5248, 2456), at(5248, 2080)],
  'WRO-B-07': Array.from({ length: 5 }, () => [
    at(4432, 1896, slow),
    at(4462, 1936, slow),
    at(4608, 1936, slow),
    at(4754, 1936, slow),
    at(4784, 1906, slow),
    at(4784, 1760, slow),
    at(4784, 1614, slow),
    at(4754, 1584, slow),
    at(4608, 1584, slow),
    at(4462, 1584, slow),
    at(4432, 1614, slow),
    at(4432, 1760, slow),
  ]).flat(),
} satisfies Record<string, Waypoint[]>;

it.each(Object.entries({ ...routes, ...sideRoutes }))(
  '%s is playable with the production map and rules',
  (id, route) => {
    const run = runMissionRoute(id, route);
    expect(
      run.mission.result,
      JSON.stringify({
        target: run.target,
        rider: run.rider,
        attempt: run.attempt,
        result: run.mission.result,
        recent: run.verdicts,
      }),
    ).toMatchObject({ status: 'completed' });
    expect(run.collision).toBe(false);
    expect(run.fired).toHaveLength(
      run.mission.definition.zdarzenia_wymuszone.length,
    );
  },
);

it('unlocks the Wrocław campaign in order, independently of Warsaw and side missions', () => {
  const progress = new MissionProgress();
  const missions = missionContent.misje.filter(
    ({ miasto, poboczna }) => miasto === 'wroclaw' && !poboczna,
  );
  expect(missions.map(({ id }) => id)).toEqual(Object.keys(routes));
  for (const mission of missions) {
    expect(progress.nextMission('wroclaw', missionContent)).toBe(mission);
    expect(progress.nextMission('warszawa', missionContent)?.id).toBe(
      'WAW-T-01',
    );
    progress.complete(mission);
  }
  expect(progress.nextMission('wroclaw', missionContent)).toBeUndefined();
});

it('can finish the Wrocław control ride within the licence limits', () => {
  const balance = missionContent.balans.licencja;
  const { mission } = runMissionRoute(examRoute('wroclaw', balance), [
    at(4384, 1792, { signal: 'right', wait: 1.6 }),
    ...routes['WRO-A2-01'].map<Waypoint>((point, index) =>
      index < 3 || (index >= 5 && index <= 7)
        ? { ...point, signal: 'right', ...(index === 5 && { wait: 1.6 }) }
        : point,
    ),
  ]);
  expect(mission.result?.status).toBe('completed');
  const errors = mission.result!.verdicts.filter(({ kind }) => kind !== 'good');
  expect(errors.filter(({ kind }) => kind === 'major')).toHaveLength(0);
  expect(
    errors.filter(({ kind }) => kind === 'minor').length,
    JSON.stringify(
      errors.map(({ ruleId, evidence }) => ({ ruleId, evidence })),
    ),
  ).toBeLessThanOrEqual(balance.przejazd_max_minor);
});

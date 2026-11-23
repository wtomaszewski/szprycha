import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { balanceSchema } from '../src/content/schemas.ts';
import { missionCity, type MissionCity } from '../src/content/missions.ts';
import { placSchema, type PlacCourse } from '../src/content/plac.ts';
import { MAX_RIDING_SPEED, RIDER_RADIUS } from '../src/gameplay/bicycle.ts';
import { placCourseKey } from '../src/gameplay/plac/courseKey.ts';
import { TICKS_PER_SECOND } from '../src/rules/types.ts';
import { WorldModel, type Box } from '../src/rules/world/WorldModel.ts';
import { readMissions } from './content.ts';

interface Timing {
  version: string;
  minTicks: number;
  maxTicks: number;
}

export interface RankingRules {
  missions: Record<
    string,
    Timing & {
      city: MissionCity;
      smoothBonus: number;
      parSeconds: number;
      limitSeconds?: number;
    }
  >;
  plac: Timing;
  ride: Record<MissionCity, { version: string; maxTicks: number }>;
  weeklyXp: { version: string };
  scoring: {
    ticksPerSecond: number;
    maxMetersPerTick: number;
    maxVerdictsPerSecond: number;
    verdictBurst: number;
    completion: number;
    pointsPerGood: number;
    maxMultiplier: number;
    minorPenalty: number;
    timeBonus: number;
    questionBonus: number;
  };
}

const hash = (key: string) => createHash('sha256').update(key).digest('hex');
const version = (...key: unknown[]) => hash(JSON.stringify(key));
const minimumTicks = (distance: number, speed: number) =>
  Math.max(1, Math.floor((distance / speed) * TICKS_PER_SECOND));
const pointRadius = ({ width, height }: Box) => (width || height ? 0 : 1.5);

// Distance between bounding boxes is a lower bound even for circular POIs.
function separation(a: Box, b: Box, paddingA = pointRadius(a)) {
  const paddingB = pointRadius(b);
  const x = Math.max(a.x - b.x - b.width, b.x - a.x - a.width);
  const y = Math.max(a.y - b.y - b.height, b.y - a.y - a.height);
  return Math.hypot(
    Math.max(0, x - paddingA - paddingB),
    Math.max(0, y - paddingA - paddingB),
  );
}

function placLowerBound({ exercises }: PlacCourse) {
  const { path, gateRadius } = exercises['PLAC-01'];
  const figureEight = path.slice(1).reduce((total, point, index) => {
    const previous = path[index]!;
    return (
      total +
      Math.max(
        0,
        Math.hypot(point.x - previous.x, point.y - previous.y) - 2 * gateRadius,
      )
    );
  }, 0);
  // Each remaining exercise requires crossing a line or stopping fully inside a box.
  return (
    figureEight +
    Object.values(exercises).reduce((total, exercise) => {
      if ('finishX' in exercise)
        return total + exercise.finishX - exercise.start.x;
      if ('stopBox' in exercise)
        return total + exercise.stopBox.x + RIDER_RADIUS - exercise.start.x;
      return total;
    }, 0)
  );
}

export async function buildRankingRules(root: string): Promise<RankingRules> {
  const content = (name: string) =>
    readFile(resolve(root, 'content', name), 'utf8');
  const [missions, balance, plac, rules, achievements] = await Promise.all([
    readMissions(root),
    content('balans.yaml').then((file) => balanceSchema.parse(parse(file))),
    content('plac.yaml').then((file) => placSchema.parse(parse(file))),
    content('przepisy.yaml'),
    content('osiagniecia.yaml').then((file) => parse(file) as unknown),
  ]);
  const rankedMissions = missions.flatMap((mission) =>
    mission.miasto === 'warszawa' || mission.miasto === 'wroclaw'
      ? [{ ...mission, miasto: mission.miasto }]
      : [],
  );
  const mapIds = [
    ...new Set([
      ...missionCity.options,
      ...rankedMissions.map((mission) => mission.mapa ?? mission.miasto),
    ]),
  ];
  const maps = new Map(
    await Promise.all(
      mapIds.map(async (id) => {
        const file = await readFile(resolve(root, 'maps', id + '.tmj'), 'utf8');
        const data: unknown = JSON.parse(file);
        return [
          id,
          {
            world: new WorldModel(data, balance.silnik.kafel_m),
            version: version(
              'ride-v1',
              data,
              balance.silnik,
              hash(rules),
              MAX_RIDING_SPEED,
              TICKS_PER_SECOND,
            ),
          },
        ] as const;
      }),
    ),
  );

  const maxTicks = 60 * 60 * TICKS_PER_SECOND;
  const ride = (city: MissionCity) => ({
    version: maps.get(city)!.version,
    maxTicks,
  });
  const { misja, combo, uwaga_drogowki } = balance;
  const scoring = {
    ticksPerSecond: TICKS_PER_SECOND,
    maxMetersPerTick:
      (MAX_RIDING_SPEED *
        Math.max(
          ...[...maps.values()].map(({ world }) => world.metersPerPixel),
        )) /
      TICKS_PER_SECOND,
    maxVerdictsPerSecond: 12,
    verdictBurst: 32,
    completion: misja.ukonczenie,
    pointsPerGood: misja.dobry_nawyk,
    maxMultiplier: combo.max_mnoznik,
    minorPenalty: misja.kara_minor,
    timeBonus: misja.bonus_czasu_max,
    questionBonus: uwaga_drogowki.bonus_madra_glowa,
  };
  return {
    missions: Object.fromEntries(
      rankedMissions.map((mission) => {
        const map = maps.get(mission.mapa ?? mission.miasto)!;
        const poi = (name: string) => {
          const area = map.world.pois.get(name);
          if (!area)
            throw new Error(`Missing mission POI: ${mission.id} / ${name}`);
          return area;
        };
        const startArea = poi(mission.start.poi);
        const start = {
          ...startArea,
          x: startArea.x + startArea.width / 2,
          y: startArea.y + startArea.height / 2,
          width: 0,
          height: 0,
        };
        let previous = start;
        let distance = 0;
        const checkpoints = mission.checkpointy.map(poi);
        for (const goal of mission.cele) {
          if (!('poi' in goal) || !goal.poi) continue;
          const area = poi(goal.poi);
          // In-game rewinds can use a checkpoint. Allow the shortest leg from
          // any possible origin to keep the validation a conservative bound.
          distance += Math.min(
            separation(previous, area, previous === start ? 0 : undefined),
            ...checkpoints.map((checkpoint) => separation(checkpoint, area)),
          );
          previous = area;
        }
        return [
          mission.id,
          {
            city: mission.miasto,
            version: version(
              'mission-v1',
              mission,
              map.version,
              misja,
              combo,
              uwaga_drogowki,
            ),
            minTicks: minimumTicks(
              distance,
              MAX_RIDING_SPEED * map.world.metersPerPixel,
            ),
            maxTicks: Math.min(
              maxTicks,
              mission.limit_s === undefined
                ? maxTicks
                : Math.ceil(mission.limit_s * TICKS_PER_SECOND) - 1,
            ),
            parSeconds: mission.par_s,
            ...(mission.limit_s === undefined
              ? {}
              : { limitSeconds: mission.limit_s }),
            smoothBonus: mission.przesylka?.delikatna
              ? misja.bonus_plynnosci
              : 0,
          },
        ];
      }),
    ),
    plac: {
      version: hash(placCourseKey(plac, balance.plac)),
      minTicks: minimumTicks(
        placLowerBound(plac),
        balance.plac.physics.max_speed,
      ),
      maxTicks:
        Object.keys(plac.exercises).length *
        Math.ceil(balance.plac.time_limit_s * TICKS_PER_SECOND),
    },
    ride: { warszawa: ride('warszawa'), wroclaw: ride('wroclaw') },
    weeklyXp: {
      version: version(
        'weekly-xp-v1',
        misja,
        combo,
        balance.quiz,
        balance.osiagniecia,
        achievements,
      ),
    },
    scoring,
  };
}

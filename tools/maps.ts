import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { missionCity } from '../src/content/missions.ts';
import { examRoute } from '../src/gameplay/exam/route.ts';
import type { GameContent } from '../src/content/schemas.ts';
import { MissionSystem } from '../src/gameplay/MissionSystem.ts';
import {
  eventRules,
  supportsForcedEvent,
  type TrafficEventId,
} from '../src/gameplay/TrafficEvents.ts';
import { WorldModel } from '../src/rules/world/WorldModel.ts';

export async function readMaps(root: string, metersPerTile: number) {
  const directory = resolve(root, 'maps');
  const worlds = new Map<string, WorldModel>();
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.tmj')) continue;
    try {
      const world = new WorldModel(
        JSON.parse(await readFile(resolve(directory, file), 'utf8')),
        metersPerTile,
      );
      worlds.set(file.slice(0, -4), world);
    } catch (cause) {
      throw new Error(`Invalid Tiled map: ${file}`, { cause });
    }
  }
  return worlds;
}

export async function validateMaps(root: string, content: GameContent) {
  const worlds = await readMaps(root, content.balans.silnik.kafel_m);
  for (const [map, world] of worlds)
    for (const { id, unlock } of world.districts) {
      if (!unlock) continue;
      if (
        !content.misje.some(
          (mission) =>
            mission.id === unlock.missionId &&
            (mission.mapa ?? mission.miasto) === map,
        )
      )
        throw new Error(
          `Map ${map}: unknown unlock mission for district ${id}`,
        );
    }
  const signCodes = new Set(content.znaki.znaki.map(({ kod }) => kod));
  const examRoutes = missionCity.options.map((city) =>
    examRoute(city, content.balans.licencja),
  );
  for (const mission of [...content.misje, ...examRoutes]) {
    const map = mission.mapa ?? mission.miasto;
    const world = worlds.get(map);
    if (!world) throw new Error(`Mission ${mission.id}: unknown map ${map}`);
    new MissionSystem(mission, world, content.balans);
    for (const goal of mission.cele) {
      if (goal.typ !== 'sfotografuj') continue;
      const sign = world.signs.find(({ id }) => id === goal.znak);
      if (!sign || !signCodes.has(sign.code))
        throw new Error(
          `Mission ${mission.id}: photographed sign ${goal.znak} is missing from the catalog`,
        );
    }
    for (const { typ, przy, regula } of mission.zdarzenia_wymuszone) {
      const id = typ as TrafficEventId;
      const area =
        world.pois.get(przy) ??
        world.triggers.get(przy) ??
        world.zones.find(({ id }) => id === przy);
      if (
        !Object.hasOwn(eventRules, id) ||
        !(eventRules[id] as readonly string[]).includes(regula)
      )
        throw new Error(
          `Mission ${mission.id}: invalid event or rule ${typ}/${regula}`,
        );
      if (!area || !supportsForcedEvent(id, world, area))
        throw new Error(
          `Mission ${mission.id}: event ${typ} has no suitable site at ${przy}`,
        );
    }
  }
}

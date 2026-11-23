import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { missionCity } from '../src/content/missions';
import type { GameContent } from '../src/content/schemas';
import { RouteCatalog } from '../src/gameplay/procedural/RouteCatalog';
import { WorldModel } from '../src/rules/world/WorldModel';

export async function buildOrderRoutes(
  content: GameContent,
  root = process.cwd(),
) {
  return Object.fromEntries(
    await Promise.all(
      missionCity.options.map(async (city) => {
        const map = JSON.parse(
          await readFile(resolve(root, `maps/${city}.tmj`), 'utf8'),
        ) as unknown;
        const world = new WorldModel(map, content.balans.silnik.kafel_m);
        return [city, new RouteCatalog(city, world, content)] as const;
      }),
    ),
  );
}

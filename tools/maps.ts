import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WorldModel } from '../src/rules/world/WorldModel.ts';

export async function validateMaps(metersPerTile: number) {
  const maps = resolve('maps');
  for (const file of await readdir(maps)) {
    if (!file.endsWith('.tmj')) continue;
    try {
      new WorldModel(
        JSON.parse(await readFile(resolve(maps, file), 'utf8')),
        metersPerTile,
      );
    } catch (cause) {
      throw new Error(`Invalid Tiled map: ${file}`, { cause });
    }
  }
}

import { artHash, neighbours, tiles } from '../src/render/artFrames.ts';

export type Surface =
  'grass' | 'asphalt' | 'sidewalk' | 'bike' | 'cobble' | 'gravel' | 'water';

const variants = {
  grass: tiles.grassVariants,
  asphalt: tiles.asphaltVariants,
  sidewalk: tiles.sidewalkVariants,
  bike: tiles.bikeVariants,
  cobble: tiles.cobble,
  gravel: tiles.gravel,
  water: [tiles.water[0]],
};

export function tileTerrain(
  width: number,
  height: number,
  surfaces: Surface[],
) {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height
      ? surfaces[y * width + x]
      : undefined;
  const paved = (surface: Surface | undefined) =>
    surface === 'sidewalk' || surface === 'cobble';
  const curb = new Array<number>(surfaces.length).fill(0);
  const verge = new Array<number>(surfaces.length).fill(0);
  const ground = surfaces.map<number>((surface, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const adjacent = neighbours.map(([dx, dy]) => at(x + dx, y + dy));
    if (paved(surface)) {
      const masks = adjacent.reduce(
        ({ road, grass }, kind, side) => ({
          road: road | (kind === 'asphalt' ? 1 << side : 0),
          grass:
            grass | (kind === 'grass' || kind === 'gravel' ? 1 << side : 0),
        }),
        { road: 0, grass: 0 },
      );
      if (masks.road) curb[index] = tiles.curbMask + masks.road;
      if (masks.grass) verge[index] = tiles.vergeMask + masks.grass;
    }
    const choices = variants[surface];
    const sample = artHash(x, y);
    if (surface === 'asphalt') {
      if (sample % 61 === 0 && adjacent.some(paved)) return tiles.asphaltDrain;
      return choices[sample % 4 === 0 ? 1 + ((sample >>> 8) % 3) : 0]!;
    }
    if (surface === 'sidewalk' && verge[index] && sample % 5 === 0)
      return tiles.sidewalkLeaves;
    if (surface === 'grass')
      return choices[sample % 7 === 0 ? 3 : (sample >>> 8) % 3]!;
    return choices[sample % choices.length]!;
  });
  return { ground, verge, curb };
}

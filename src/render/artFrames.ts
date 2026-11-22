export const TILE = 32;
export const TILE_COLUMNS = 16;
export const TILE_COUNT = 96;

// Tiled GIDs. Keep the original first eight slots stable for older maps.
export const tiles = {
  grass: 1,
  asphalt: 2,
  sidewalk: 3,
  bike: 4,
  roofLegacy: 5,
  water: [6, 29, 30, 31],
  dashVertical: 7,
  dashHorizontal: 8,
  grassVariants: [1, 9, 10, 11],
  asphaltVariants: [2, 12, 13, 14],
  sidewalkVariants: [3, 15, 16, 17],
  bikeVariants: [4, 18, 19, 20],
  cobble: [21, 22, 23, 24],
  gravel: [25, 26, 27, 28],
  solidVertical: 32,
  solidHorizontal: 33,
  zebra: 34,
  bikeCrossing: 35,
  stop: 36,
  yield: 37,
  bicycle: 38,
  arrowStraight: 39,
  arrowLeft: 40,
  arrowRight: 41,
  rails: 42,
  ramp: 43,
  arrowStraightLeft: 44,
  arrowStraightRight: 45,
  arrowLeftRight: 46,
  curbMask: 48,
  vergeMask: 64,
} as const;

// clockwise from north; corners start at north-west
export const neighbours = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
export const corners = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

export const roofKinds = ['felt', 'tile', 'copper', 'stone'] as const;
export const roofDetails = ['chimney', 'vent', 'ac', 'skylight'] as const;
export const wallKinds = ['sand', 'brick', 'plaster', 'concrete'] as const;
export const propKinds = [
  'tree',
  'lamp',
  'bench',
  'bin',
  'bollard',
  'shelter',
] as const;
export const BALL_FRAME = propKinds.length;
export type PropKind = (typeof propKinds)[number];

export function artHash(x: number, y: number, salt = 0) {
  let n = Math.imul(x ^ salt, 0x45d9f3b) ^ Math.imul(y + salt, 0x119de1f3);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

import { tiledMap } from './tiled-map.ts';
import { sides, otherSide } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';

const width = 70;
const height = 48;
const tile = 32;
const mapWidth = width * tile;
const mapHeight = height * tile;
const street = 128;
const ground: number[] = [];
const markings: number[] = [];
const { rect, polyline, objectLayer, write } = tiledMap(
  width,
  height,
  ground,
  markings,
);
type Point = [number, number];
type Junction = {
  id: string;
  x: number;
  y: number;
  kind: 'equal' | 'priority' | 'roundabout';
};
const equalWest: Junction = { id: 'kamienice', x: 448, y: 448, kind: 'equal' };
const stop: Junction = { id: 'stop', x: 1088, y: 448, kind: 'priority' };
const equalEast: Junction = { id: 'fabryka', x: 1856, y: 448, kind: 'equal' };
const equalSouth: Junction = { id: 'osiedle', x: 448, y: 1088, kind: 'equal' };
const bazaar: Junction = { id: 'bazar', x: 1088, y: 1088, kind: 'priority' };
const island = { x: 1856, y: 1088 };
const merges = sides.map((side): Junction => ({
  id: `rondo-${side}`,
  x: island.x + 144 * sideVector[side].x,
  y: island.y + 144 * sideVector[side].y,
  kind: 'roundabout',
}));
const junctions = [equalWest, stop, equalEast, equalSouth, bazaar, ...merges];

const zones = [
  rect('prog_osiedle', 384, 1280, 128, 32, {
    kind: 'roadway',
    surface: 'rough',
  }),
  ...[448, 1088].map((y) =>
    rect(`road-ew-${y}`, 0, y - 64, mapWidth, street, { kind: 'roadway' }),
  ),
  ...[448, 1088, 1856].map((x) =>
    rect(`road-ns-${x}`, x - 64, 0, street, mapHeight, { kind: 'roadway' }),
  ),
  rect('roundabout-road', 1632, 864, 448, 448, { kind: 'roadway' }),
  rect('gate-walk-north', 512, 352, 512, 32, { kind: 'sidewalk' }),
  rect('gate-walk-south', 512, 992, 512, 32, { kind: 'sidewalk' }),
  rect('bazar-walk-north', 1152, 992, 480, 32, { kind: 'sidewalk' }),
  rect('bazar-walk-south', 1152, 1152, 480, 32, { kind: 'sidewalk' }),
  rect('pasaz_pierogi', 1152, 280, 128, 72, { kind: 'park_path' }),
];
const hasTile = (
  x: number,
  y: number,
  area: { x: number; y: number; width: number; height: number },
) =>
  x >= area.x &&
  x < area.x + area.width &&
  y >= area.y &&
  y < area.y + area.height;
const streetTiles = zones.filter(({ name }) => name.startsWith('road-'));
const hump = zones[0]!;
const paved = [
  ...zones.filter(({ name }) => name.includes('-walk-')),
  { x: 544, y: 192, width: 224, height: 64 },
  { x: 928, y: 864, width: 96, height: 64 },
  { x: 1248, y: 544, width: 64, height: 288 },
  { x: 768, y: 192, width: 64, height: 192 },
  { x: 832, y: 864, width: 96, height: 160 },
  { x: 544, y: 256, width: 64, height: 128 },
  { x: 1152, y: 800, width: 320, height: 192 },
  { x: 1184, y: 768, width: 128, height: 64 },
  { x: 1248, y: 512, width: 64, height: 64 },
  { x: 1152, y: 192, width: 160, height: 352 },
  { x: 1024, y: 864, width: 576, height: 64 },
  { x: 160, y: 256, width: 224, height: 128 },
];
for (let row = 0; row < height; row++)
  for (let col = 0; col < width; col++) {
    const x = col * tile + tile / 2;
    const y = row * tile + tile / 2;
    const distance = Math.hypot(x - island.x, y - island.y);
    const inRoundabout =
      Math.abs(x - island.x) < 224 && Math.abs(y - island.y) < 224;
    const onStreet = streetTiles.some((area) => hasTile(x, y, area));
    const circle = inRoundabout && distance < 247;
    const verge =
      [448, 1088].some((mid) => Math.abs(y - mid) < 96) ||
      [448, 1088, 1856].some((mid) => Math.abs(x - mid) < 96);
    ground.push(
      hasTile(x, y, hump)
        ? 3
        : distance < 94
          ? 1
          : circle || onStreet
            ? 2
            : verge || paved.some((area) => hasTile(x, y, area))
              ? 3
              : 1,
    );
    const junction = junctions.some(
      ({ x: cx, y: cy }) => Math.abs(x - cx) < 64 && Math.abs(y - cy) < 64,
    );
    markings.push(
      !junction && !inRoundabout && onStreet
        ? [448, 1088, 1856].includes(col * 32)
          ? 7
          : [448, 1088].includes(row * 32)
            ? 8
            : 0
        : 0,
    );
  }

const lanes: ReturnType<typeof polyline>[] = [];
const signs: ReturnType<typeof rect>[] = [];
function linePoint(junction: Junction, side: Side, inlet: boolean): Point {
  const { x, y } = sideVector[side];
  const offset = inlet ? 32 : -32;
  return [junction.x + 64 * x + offset * y, junction.y + 64 * y - offset * x];
}
function boundary([x, y]: Point, side: Side): Point {
  if (side === 'N') return [x, 0];
  if (side === 'S') return [x, mapHeight];
  return [side === 'W' ? 0 : mapWidth, y];
}
function neighbour(junction: Junction, side: Side) {
  const { x, y } = sideVector[side];
  return junctions
    .filter(
      (candidate) =>
        (x ? candidate.y === junction.y : candidate.x === junction.x) &&
        (candidate.x - junction.x) * x + (candidate.y - junction.y) * y > 0,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - junction.x, a.y - junction.y) -
        Math.hypot(b.x - junction.x, b.y - junction.y),
    )[0];
}
function approach(
  junction: Junction,
  side: Side,
  points: Point[],
  priorityClass: string,
  turns: string,
  from?: string,
) {
  const id = `${junction.id}-${side}`;
  lanes.push(
    polyline(id, points, {
      intersection: junction.id,
      side,
      priorityClass,
      type: 'car',
      turns,
      width_px: 64,
      speedLimit: junction.kind === 'roundabout' ? 18 : 30,
      ...(from && { from }),
    }),
  );
  return id;
}
function roadsideSign(
  junction: Junction,
  side: Side,
  code: string,
  affects: string,
  displacement = 17,
) {
  const [x, y] = linePoint(junction, side, true);
  const vector = sideVector[side];
  signs.push(
    rect(
      `${affects}-${code}`,
      x + displacement * vector.x + 43 * vector.y,
      y + displacement * vector.y - 43 * vector.x,
      0,
      0,
      { code, affects, facing: side },
    ),
  );
}
function connectStreet(
  junction: Junction,
  side: Side,
  priority: string,
  turns: string,
  codes: string[],
) {
  const end = linePoint(junction, side, true);
  const upstream = neighbour(junction, side);
  const opposite = otherSide(side, 2);
  const start = upstream
    ? linePoint(upstream, opposite, false)
    : boundary(end, side);
  const id = approach(
    junction,
    side,
    [start, end],
    priority,
    turns,
    upstream && `${upstream.id}-${opposite}`,
  );
  if (!upstream) {
    const out = linePoint(junction, side, false);
    lanes.push(
      polyline(`${id}-out`, [out, boundary(out, side)], {
        role: 'exit',
        intersection: junction.id,
        side,
        speedLimit: 30,
      }),
    );
  }
  for (const [i, code] of codes.entries())
    roadsideSign(junction, side, code, id, 17 + 37 * i);
}
for (const junction of junctions) {
  if (junction.kind === 'roundabout') continue;
  for (const side of sides) {
    const minor = side === 'N' || side === 'S';
    connectStreet(
      junction,
      side,
      junction.kind === 'equal' ? 'equal' : minor ? 'minor' : 'main',
      'straight,left,right',
      junction.kind === 'equal'
        ? []
        : [
            minor
              ? junction === stop && side === 'S'
                ? 'B-20'
                : 'A-7'
              : 'D-1',
          ],
    );
  }
}
for (const [i, radial] of sides.entries()) {
  const junction = merges[i]!;
  connectStreet(junction, radial, 'roundabout_in', 'right', ['A-7', 'C-12']);
  const ringIn = otherSide(radial, 1);
  const previous = merges[(i + 1) % sides.length]!;
  const previousExit = otherSide(ringIn, -1);
  const start = linePoint(previous, previousExit, false);
  const end = linePoint(junction, ringIn, true);
  const corner: Point = sideVector[previousExit].x
    ? [end[0], start[1]]
    : [start[0], end[1]];
  const bevel: Point[] = [
    [
      corner[0] - 30 * sideVector[previousExit].x,
      corner[1] - 30 * sideVector[previousExit].y,
    ],
    [
      corner[0] - 30 * sideVector[ringIn].x,
      corner[1] - 30 * sideVector[ringIn].y,
    ],
  ];

  approach(
    junction,
    ringIn,
    [start, ...bevel, end],
    'roundabout_ring',
    'straight,right',
    `${previous.id}-${previousExit}`,
  );
}

signs.push(
  rect('pasaz_pierogi-B-1', 1152, 322, 0, 0, {
    code: 'B-1',
    affects: 'pasaz_pierogi',
    facing: 'W',
  }),
  rect('droga-wewnetrzna', 820, 1018, 0, 0, {
    code: 'D-46',
    affects: 'brama-podworko',
    facing: 'S',
  }),
  rect('koniec-drogi-wewnetrznej', 916, 977, 0, 0, {
    code: 'D-47',
    affects: 'brama-podworko',
    facing: 'N',
  }),
  rect('prog-znak', 525, 1231, 0, 0, {
    code: 'A-11a',
    affects: 'osiedle-S',
    facing: 'N',
  }),
  rect('szkola-znak', 525, 1366, 0, 0, {
    code: 'A-17',
    affects: 'osiedle-S',
    facing: 'S',
  }),
);
objectLayer('zones', zones);
objectLayer(
  'intersections',
  junctions.map(({ id, x, y, kind }) =>
    rect(id, x - 64, y - 64, street, street, { kind }),
  ),
);
objectLayer('lanes', lanes);
objectLayer('signs', signs);
objectLayer('spawns', [rect('player', 550, 1145, 0, 0, { heading: 0 })]);
objectLayer('driveways', [
  rect('brama-kamienicy', 762, 271, 70, 151, { direction: 'S' }),
  rect('brama-podworko', 832, 868, 96, 274, { direction: 'S' }),
  rect('brama-targowa', 1344, 1150, 72, 112, { direction: 'N' }),
]);
objectLayer('pois', [
  rect('warsztat_praga', 800, 224, 0, 0, { heading: Math.PI / 2 }),
  rect('wyjazd_warsztat', 779, 391, 42, 38),
  rect('prawa_reka', 531, 385, 98, 56, { heading: Math.PI }),
  rect('sasiad_praga', 205, 385, 68, 52),
  rect('podworko_praga', 870, 883, 0, 0, { heading: Math.PI / 2 }),
  rect('przed_brama', 840, 892, 60, 48),
  rect('za_brama', 923, 1120, 66, 32),
  rect('cp_bramy', 951, 1128, 36, 24, { heading: 0 }),
  rect('odbiorca_bazar', 1416, 1100, 72, 50),
  rect('bazar_praga', 1130, 878, 0, 0, { heading: -Math.PI / 2 }),
  rect('cp_bazar', 1102, 782, 54, 42, { heading: -Math.PI / 2 }),
  rect('podejscie_do_stop', 1100, 546, 52, 55, { heading: -Math.PI / 2 }),
  rect('przez_stop', 1101, 322, 51, 56),
  rect('blok_haliny', 1268, 217, 64, 62),
  rect('kiosk_zapiekanki', 1490, 943, 0, 0),
]);
objectLayer('traffic_routes', [
  polyline(
    'auto-z-prawej',
    [
      [416, 246],
      [416, 384],
      [416, 512],
      [416, 594],
    ],
    { kind: 'car', speed: 4 },
  ),
  polyline(
    'auto-na-glownej',
    [
      [963, 480],
      [1024, 480],
      [1152, 480],
      [1242, 480],
    ],
    { kind: 'car', speed: 4 },
  ),
  polyline(
    'pieszy-brama',
    [
      [797, 1008],
      [970, 1008],
    ],
    { kind: 'pedestrian', speed: 1.65, event_only: true },
  ),
  polyline(
    'pieszy-bazar',
    [
      [1542, 997],
      [1542, 1182],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
]);
objectLayer('traffic_controls', [
  rect('auto-kamienice', 0, 0, 0, 0, {
    kind: 'junction',
    route: 'auto-z-prawej',
    lane: 'kamienice-N',
    vertex: 1,
    exit: 2,
  }),
  rect('auto-droga-glowna', 0, 0, 0, 0, {
    kind: 'junction',
    route: 'auto-na-glownej',
    lane: 'stop-W',
    vertex: 1,
    exit: 2,
  }),
]);
objectLayer('crossings', [
  rect('zebra-pasaz', 1259, 384, 43, 128, { kind: 'pedestrian', axis: 'y' }),
  rect('zebra-bazar', 1520, 1024, 44, 128, { kind: 'pedestrian', axis: 'y' }),
]);
objectLayer('parked_cars', [
  rect('parking-bazar', 1404, 967, 58, 24),
  rect('parking-osiedle', 606, 1170, 62, 26),
]);
const buildings = [
  ['sasiad', 180, 302, 151, 50, 3, 0xad7655],
  ['kamienica-lewa', 627, 271, 133, 80, 4, 0xdc9a73],
  ['kamienica-prawa', 844, 262, 145, 89, 4, 0xb96557],
  ['warsztat', 860, 115, 131, 95, 2, 0x8dc6ad],
  ['oficyna', 562, 554, 288, 128, 4, 0xe8c39e],
  ['brama-lewa', 667, 910, 151, 72, 3, 0xdc9a73],
  ['brama-prawa', 932, 938, 74, 45, 3, 0xdc9a73],
  ['halina', 1344, 181, 174, 124, 5, 0xd0a4a8],
  ['szkola', 617, 1338, 198, 94, 2, 0xe8c39e],
  ['fabryka', 1527, 560, 216, 176, 4, 0xb96557],
  ['fabryka-wieza', 1678, 558, 36, 36, 7, 0xb96557],
  ['bazar-warzywa', 1321, 900, 56, 48, 1, 0xf1a15e],
  ['bazar-kwiaty', 1391, 900, 57, 48, 1, 0xe98b95],
  ['bazar-pierogi', 1461, 900, 55, 48, 1, 0xfad88e],
  ['kiosk', 1532, 915, 44, 35, 1, 0x8dc6ad],
] as const;
objectLayer(
  'blocks',
  buildings.map(([id, x, y, w, h, floors, tint]) =>
    rect(id, x, y, w, h, { height: floors, tint }),
  ),
);
objectLayer(
  'collisions',
  Array.from({ length: 11 }, (_, i) => {
    const y = 16 * (i - 5);
    const halfWidth = Math.floor(Math.sqrt(88 ** 2 - y ** 2));
    return rect(
      'obrzez-wyspy',
      island.x - halfWidth,
      island.y + y - 8,
      2 * halfWidth,
      16,
      { kind: 'wall' },
    );
  }),
);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', island.x - 93, island.y - 93, 186, 186),
]);
objectLayer('districts', [rect('praga', 0, 0, mapWidth, mapHeight)]);
await write('warszawa', 9);

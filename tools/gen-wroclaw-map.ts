import {
  roadSignalTiming,
  sideArrowTiming,
  parallelCrossingTiming,
  standaloneCrossingTiming,
  startOnRed,
} from './signal-timing.ts';
import { tiles } from '../src/render/artFrames.ts';
import { otherSide, sides } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';
import { tiledMap } from './tiled-map.ts';
import { tileTerrain, type Surface } from './tile-terrain.ts';
import { wroclawMissionSites } from './wroclaw-missions.ts';
import { wroclawScenery } from './wroclaw-scenery.ts';

type Point = [number, number];
type Kind = 'equal' | 'priority' | 'signals' | 'roundabout';
type Junction = { id: string; x: number; y: number; kind: Kind };
const width = 176;
const height = 120;
const tile = 32;
const mapWidth = width * tile;
const mapHeight = height * tile;
const west = 960;
const centre = 2720;
const east = 4608;
const north = 768;
const market = 1760;
const south = 2944;
const columns = [west, centre, east];
const rows = [north, market, south];
const map = tiledMap(width, height);
const { rect, polyline, objectLayer, write } = map;

const surface = Array<Surface>(width * height).fill('grass');
const markings = Array<number>(width * height).fill(0);
const paint = (x: number, y: number, w: number, h: number, color: Surface) => {
  for (let row = Math.floor(y / tile); row < (y + h) / tile; row++)
    for (let col = Math.floor(x / tile); col < (x + w) / tile; col++)
      surface[row * width + col] = color;
};
const mark = (x: number, y: number, gid: number) => {
  markings[Math.floor(y / tile) * width + Math.floor(x / tile)] = gid;
};

const junctions: Junction[] = [
  { id: 'stadion', x: west, y: north, kind: 'equal' },
  { id: 'ostrow', x: centre, y: north, kind: 'equal' },
  { id: 'zachod-stop', x: west, y: market, kind: 'priority' },
  { id: 'rynek', x: centre, y: market, kind: 'priority' },
  { id: 'obwodnica', x: west, y: south, kind: 'priority' },
  { id: 'poludnie', x: centre, y: south, kind: 'signals' },
  { id: 'dworzec', x: east, y: south, kind: 'equal' },
];
const roundabouts = [
  { id: 'rondo-hala', x: east, y: market, radius: 144 },
  { id: 'rondo-zoo', x: east, y: north, radius: 176 },
].map((ring) => ({
  ...ring,
  merges: sides.map((side): Junction => ({
    id: `${ring.id}-${side}`,
    x: ring.x + ring.radius * sideVector[side].x,
    y: ring.y + ring.radius * sideVector[side].y,
    kind: 'roundabout',
  })),
}));
const network = [...junctions, ...roundabouts.flatMap(({ merges }) => merges)];
const halfHeight = (j: Junction) => (j.y === south ? 128 : 64);

const zones: ReturnType<typeof rect>[] = [];
const lanes: ReturnType<typeof polyline>[] = [];
const signs: ReturnType<typeof rect>[] = [];
const signals: ReturnType<typeof rect>[] = [];
const crossings: ReturnType<typeof rect>[] = [];
const crossingSignals: ReturnType<typeof rect>[] = [];
const trafficRoutes: ReturnType<typeof polyline>[] = [];
const trafficControls: ReturnType<typeof rect>[] = [];
const zone = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: string,
  color: Surface,
  properties: Record<string, string | number | boolean> = {},
) => {
  zones.push(rect(id, x, y, w, h, { kind, ...properties }));
  paint(x, y, w, h, color);
};
const sign = (
  code: string,
  affects: string,
  facing: Side,
  x: number,
  y: number,
  properties: Record<string, string | boolean> = {},
) =>
  signs.push(
    rect(`${affects}-${code}`, x, y, 0, 0, {
      code,
      affects,
      facing,
      ...properties,
    }),
  );

// Lay out the public spaces before painting the carriageways and bridges.
zone('rynek-deptak', 2944, 1888, 864, 480, 'pedestrian_zone', 'cobble', {
  surface: 'rough',
});
zone('plac-solny', 2944, 2368, 352, 128, 'pedestrian_zone', 'cobble');
zone('ostrow-d40', 2400, 1152, 768, 224, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('wyspa-slodowa', 3264, 1152, 672, 224, 'park_path', 'grass');
zone('park-japonski', 4864, 1888, 672, 704, 'park_path', 'sidewalk');
zone('plac-dworcowy', 3104, 2624, 992, 192, 'sidewalk', 'sidewalk');
zone('dziedziniec-hali', 4800, 512, 736, 576, 'park_path', 'sidewalk');
zone('zachod-droga-wewnetrzna', 1152, 1568, 128, 160, 'roadway', 'gravel');

const river = [
  [0, 1024, mapWidth, 128],
  [0, 1152, 2400, 224],
  [3168, 1152, 96, 224],
  [3936, 1152, mapWidth - 3936, 224],
  [0, 1376, mapWidth, 128],
] as const;
for (const [x, y, w, h] of river) paint(x, y, w, h, 'water');
paint(5056, 2112, 352, 320, 'water');
paint(5216, 2112, 64, 320, 'sidewalk');

for (const x of columns) {
  if (x !== west) {
    zone(
      `chodnik-ns-${x}-w`,
      x - 128,
      0,
      64,
      mapHeight,
      'sidewalk',
      'sidewalk',
    );
    zone(`chodnik-ns-${x}-e`, x + 64, 0, 64, mapHeight, 'sidewalk', 'sidewalk');
  }
  zone(`road-ns-${x}`, x - 64, 0, 128, mapHeight, 'roadway', 'asphalt');
}
for (const y of rows) {
  const half = y === south ? 128 : 64;
  const sidewalk = y === north ? 256 : 0;
  zone(
    `chodnik-ew-${y}-n`,
    sidewalk,
    y - half - 64,
    mapWidth - sidewalk,
    64,
    'sidewalk',
    'sidewalk',
  );
  zone(
    `chodnik-ew-${y}-s`,
    sidewalk,
    y + half,
    mapWidth - sidewalk,
    64,
    'sidewalk',
    'sidewalk',
  );
  zone(`road-ew-${y}`, 0, y - half, mapWidth, 2 * half, 'roadway', 'asphalt');
}
for (const { id, x, y, radius } of roundabouts) {
  const edge = radius + 80;
  zone(id, x - edge, y - edge, 2 * edge, 2 * edge, 'roadway', 'asphalt');
}

zone('pobocze-zachod', west + 64, 1824, 32, 992, 'shoulder', 'gravel', {
  shoulderUsable: true,
});
zone('pobocze-zachod-powrot', west - 96, 1824, 32, 992, 'shoulder', 'gravel', {
  shoulderUsable: true,
});
zone('zjazd-obwodnica', 640, 3072, 96, 128, 'roadway', 'asphalt');
zone('zakaz-obwodnica', 0, 3136, 704, 64, 'no_bikes', 'asphalt');
sign('B-9', 'zakaz-obwodnica', 'E', 702, 3210);
zone('ulica-nadodrze', 3264, 1568, 96, 128, 'roadway', 'asphalt', {
  direction: 'N',
});
zone('kontrapas-nadodrze', 3328, 1568, 32, 128, 'bike_lane', 'bike', {
  direction: 'S',
});
sign('B-2', 'ulica-nadodrze', 'N', 3374, 1578, { exceptBicycles: true });

zone('ddr-bulwary', 0, 1504, mapWidth, 64, 'bike_path', 'bike');
zone('ddr-most-tumski', 2592, 832, 64, 864, 'bike_path', 'bike');
zone('kladka-slodowa', 3520, 1344, 64, 160, 'shared_path', 'sidewalk');
zone('ddr-bulwary-hala', 4864, 1504, 64, 192, 'bike_path', 'bike');
zone('ddr-lacznik-hala', 4864, 1824, 64, 288, 'bike_path', 'bike');
zone('ddr-hala-zachod', 4288, 2112, 256, 64, 'bike_path', 'bike');
zone('ddr-hala-wschod', 4672, 2112, 384, 64, 'bike_path', 'bike');
zone('ciag-zoo', 4960, 2176, 64, 608, 'shared_path', 'sidewalk');
zone('ddr-poludnie', 2592, 1664, 64, 1152, 'bike_path', 'bike');
zone(
  'pas-rowerowy-poludnie',
  centre + 64,
  south + 96,
  east - centre - 128,
  32,
  'bike_lane',
  'bike',
  { direction: 'E' },
);
zone('sluza-poludnie', centre - 96, south, 32, 128, 'bike_lane', 'bike', {
  direction: 'E',
});
zone('ciag-bulwary', 1024, 1568, 1632, 64, 'shared_path', 'sidewalk');
zone('mostek-japonski', 5216, 2112, 64, 320, 'shared_path', 'sidewalk');
zone('chodnik-ostrow', 2784, 1328, 384, 48, 'sidewalk', 'sidewalk');
zone('chodnik-zachod-wyjazd', 1152, 1664, 128, 32, 'sidewalk', 'sidewalk');
sign('C-13', 'ddr-hala-wschod', 'E', 4748, 2192);
sign('C-13', 'ddr-most-tumski', 'S', 2578, 1490);
sign('C-13', 'ddr-bulwary', 'W', 2340, 1496);
sign('C-13/C-16', 'ciag-zoo', 'S', 4944, 2210);
sign('C-13/C-16', 'ciag-bulwary', 'W', 1356, 1612);
sign('P-23', 'pas-rowerowy-poludnie', 'E', 3304, 3056);
sign('D-40', 'ostrow-d40', 'E', 2770, 1240);
sign('D-41', 'ostrow-d40', 'W', 2790, 1268);

function linePoint(j: Junction, side: Side, inlet: boolean): Point {
  const { x, y } = sideVector[side];
  const offset = inlet ? 32 : -32;
  return [
    j.x + 64 * x + offset * y,
    j.y + halfHeight(j) * y - offset * x * (j.y === south ? 2 : 1),
  ];
}
function boundary([x, y]: Point, side: Side): Point {
  if (side === 'N') return [x, 0];
  if (side === 'S') return [x, mapHeight];
  return [side === 'W' ? 0 : mapWidth, y];
}
function neighbour(j: Junction, side: Side) {
  const { x, y } = sideVector[side];
  return network
    .filter(
      (candidate) =>
        (x ? candidate.y === j.y : candidate.x === j.x) &&
        (candidate.x - j.x) * x + (candidate.y - j.y) * y > 0,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y),
    )[0];
}
const parallel = new Map<string, Record<string, string>>([
  ['zachod-stop-S', { parallelShoulder: 'pobocze-zachod' }],
  ['obwodnica-N', { parallelShoulder: 'pobocze-zachod-powrot' }],
  ['rynek-N', { parallelBikeInfra: 'ddr-most-tumski' }],
  ['ostrow-S', { parallelBikeInfra: 'ddr-most-tumski' }],
  ['poludnie-N', { parallelBikeInfra: 'ddr-poludnie' }],
  ['rynek-S', { parallelBikeInfra: 'ddr-poludnie' }],
  ['dworzec-W', { parallelBikeInfra: 'pas-rowerowy-poludnie' }],
]);

function lane(
  j: Junction,
  side: Side,
  points: Point[],
  priorityClass: string,
  turns: string,
  from?: string,
) {
  const id = `${j.id}-${side}`;
  lanes.push(
    polyline(id, points, {
      type: 'car',
      intersection: j.id,
      side,
      priorityClass,
      turns,
      width_px: 64,
      speedLimit: j.kind === 'roundabout' ? 18 : 30,
      ...(from && { from }),
      ...parallel.get(id),
    }),
  );
  return id;
}
function connect(
  j: Junction,
  side: Side,
  priority: string,
  turns: string,
  codes: string[],
) {
  const opposite = otherSide(side, 2);
  const upstream = neighbour(j, side);
  const end = linePoint(j, side, true);
  const start = upstream
    ? linePoint(upstream, opposite, false)
    : boundary(end, side);
  const id = lane(
    j,
    side,
    [start, end],
    priority,
    turns,
    upstream && `${upstream.id}-${opposite}`,
  );
  if (!upstream) {
    const out = linePoint(j, side, false);
    lanes.push(
      polyline(`${id}-out`, [out, boundary(out, side)], {
        role: 'exit',
        intersection: j.id,
        side,
        speedLimit: 30,
      }),
    );
  }
  const [x, y] = end;
  const vector = sideVector[side];
  for (const [i, code] of codes.entries()) {
    const offset = 18 + i * 40;
    sign(
      code,
      id,
      side,
      x + offset * vector.x + 46 * vector.y,
      y + offset * vector.y - 46 * vector.x,
    );
  }
}
const horizontal = (side: Side) => side === 'E' || side === 'W';
for (const j of junctions)
  for (const side of sides) {
    const minor = j.id === 'rynek' ? horizontal(side) : !horizontal(side);
    if (j.kind === 'priority')
      connect(j, side, minor ? 'minor' : 'main', 'straight,left,right', [
        minor
          ? j.id === 'zachod-stop' && side === 'S'
            ? 'B-20'
            : 'A-7'
          : 'D-1',
      ]);
    else
      connect(
        j,
        side,
        j.kind === 'signals' ? 'signal' : 'equal',
        'straight,left,right',
        [],
      );
  }

function mainSignal(
  id: string,
  x: number,
  y: number,
  group: string,
  timing: ReturnType<typeof roadSignalTiming>,
) {
  signals.push(
    rect(`${id}-s1`, x, y, 0, 0, {
      code: 'S-1',
      affects: id,
      group,
      ...timing,
    }),
  );
}
for (const { id, merges } of roundabouts)
  for (const [i, radial] of sides.entries()) {
    const j = merges[i]!;
    connect(j, radial, 'roundabout_in', 'right', ['A-7', 'C-12']);
    const ringIn = otherSide(radial, 1);
    const previous = merges[(i + 1) % sides.length]!;
    const previousExit = otherSide(ringIn, -1);
    const start = linePoint(previous, previousExit, false);
    const end = linePoint(j, ringIn, true);
    const corner: Point = sideVector[previousExit].x
      ? [end[0], start[1]]
      : [start[0], end[1]];
    const bevel = [previousExit, ringIn].map((side): Point => [
      corner[0] - 30 * sideVector[side].x,
      corner[1] - 30 * sideVector[side].y,
    ]);
    lane(
      j,
      ringIn,
      [start, ...bevel, end],
      'roundabout_ring',
      'straight,right',
      `${previous.id}-${previousExit}`,
    );
    if (id === 'rondo-zoo') {
      const [rx, ry] = linePoint(j, radial, true);
      const [ix, iy] = end;
      mainSignal(
        `${j.id}-${radial}`,
        rx,
        ry,
        'zoo-wlot',
        roadSignalTiming(false, i * 4),
      );
      mainSignal(
        `${j.id}-${ringIn}`,
        ix,
        iy,
        'zoo-pierscien',
        roadSignalTiming(true, i * 4),
      );
    }
  }

const stationJunction = junctions.find(({ id }) => id === 'poludnie')!;
for (const side of sides) {
  const [x, y] = linePoint(stationJunction, side, true);
  const { x: dx, y: dy } = sideVector[side];
  mainSignal(
    `poludnie-${side}`,
    x + 12 * dx + 46 * dy,
    y + 12 * dy - 46 * dx,
    horizontal(side) ? 'poludnie-ew' : 'poludnie-ns',
    roadSignalTiming(horizontal(side), startOnRed),
  );
}
signals.push(
  rect('poludnie-s2', centre - 76, south - 129, 0, 0, {
    code: 'S-2',
    affects: 'poludnie-N',
    group: 'poludnie-ns',
    ...sideArrowTiming,
    direction: 'right',
  }),
);

const signalCrossing = (
  id: string,
  x: number,
  y: number,
  timing:
    typeof standaloneCrossingTiming | ReturnType<typeof parallelCrossingTiming>,
) =>
  crossingSignals.push(
    rect(`${id}-sygnal`, x, y, 0, 0, {
      crossing: id,
      ...timing,
      twoWay: true,
    }),
  );
crossings.push(
  rect('rynek-zebra', 3424, 1696, 48, 128, {
    axis: 'y',
    kind: 'pedestrian',
    trafficGroup: 'rynek-sygnaly',
  }),
  rect('rynek-przejazd', 3488, 1696, 32, 128, {
    axis: 'y',
    kind: 'bike',
    trafficGroup: 'rynek-sygnaly',
  }),
  rect('poludnie-przejazd', 2656, 2752, 128, 48, { axis: 'x', kind: 'bike' }),
  rect('hala-przejazd', 4544, 2112, 128, 64, { axis: 'x', kind: 'bike' }),
  rect('hala-przejazd-bulwary', 4864, 1696, 64, 128, {
    axis: 'y',
    kind: 'bike',
  }),
  rect('rynek-przejazd-zachodni', 2592, 1696, 64, 128, {
    axis: 'y',
    kind: 'bike',
  }),
  rect('bulwary-przejazd-zachod', 896, 1504, 128, 64, {
    axis: 'x',
    kind: 'bike',
  }),
  rect('bulwary-przejazd-ostrow', 2656, 1504, 128, 64, {
    axis: 'x',
    kind: 'bike',
  }),
  rect('bulwary-przejazd-hala', 4544, 1504, 128, 64, {
    axis: 'x',
    kind: 'bike',
  }),
  rect('stadion-zebra', 1220, 704, 48, 128, { axis: 'y', kind: 'pedestrian' }),
);
zone('ddr-rynek-polnoc', 3488, 1568, 32, 128, 'bike_path', 'bike');
zone('ddr-rynek-poludnie', 3488, 1824, 32, 64, 'bike_path', 'bike');
zone('ddr-poludnie-wschod', 2784, 2752, 320, 48, 'bike_path', 'bike');
signalCrossing('rynek-zebra', 3408, 1684, standaloneCrossingTiming);
signalCrossing('rynek-przejazd', 3532, 1684, standaloneCrossingTiming);
signalCrossing(
  'poludnie-przejazd',
  2792,
  2784,
  parallelCrossingTiming(startOnRed),
);
sign('D-6a', 'rondo-hala-S-S', 'N', 4528, 2096);

for (const [y, barriers, offset] of [
  [2240, true, 0],
  [2560, false, 11],
] as const) {
  const id = barriers ? 'zachod-kolej-zapory' : 'zachod-kolej-bez-zapor';
  zone(`tor-${id}`, 448, y, 992, 32, 'rail', 'gravel');
  crossings.push(
    rect(id, 864, y - 8, 192, 48, {
      kind: 'rail',
      axis: 'y',
      barriers,
      open_s: 23,
      lowering_s: 3,
      closed_s: 6,
      raising_s: 2,
      offset_s: offset,
      train_from_x: 480,
      train_to_x: 1376,
    }),
  );
  sign(barriers ? 'A-9' : 'A-10', 'zachod-stop-S', 'S', 1036, y + 74);
  if (!barriers) sign('G-3', 'obwodnica-N', 'N', 852, y - 14);
}
sign('D-46', 'wyjazd-magazyn', 'S', 1140, 1650);
sign('D-47', 'wyjazd-magazyn', 'N', 1288, 1679);

const tram = 'tramwaj-poludnie';
const tramPoints: Point[] = [
  [mapWidth, south],
  [east + 64, south],
  [east - 64, south],
  [3792, south],
  [2784, south],
  [2656, south],
  [west + 64, south],
  [west - 64, south],
  [0, south],
];
lanes.push(
  polyline('poludnie-tram-E', tramPoints.slice(2, 5), {
    type: 'tram',
    intersection: 'poludnie',
    side: 'E',
    width_px: 56,
    speedLimit: 35,
    priorityClass: 'signal',
  }),
);
lanes.push(
  polyline('dworzec-tram-E', tramPoints.slice(0, 2), {
    type: 'tram',
    intersection: 'dworzec',
    side: 'E',
    width_px: 56,
    speedLimit: 35,
    priorityClass: 'equal',
  }),
);
lanes.push(
  polyline('obwodnica-tram-E', tramPoints.slice(5, 7), {
    type: 'tram',
    intersection: 'obwodnica',
    side: 'E',
    width_px: 56,
    speedLimit: 35,
    priorityClass: 'main',
  }),
);
mainSignal(
  'poludnie-tram-E',
  2800,
  south - 12,
  'poludnie-ew',
  roadSignalTiming(true, startOnRed),
);
trafficRoutes.push(
  polyline(tram, tramPoints, {
    kind: 'tram',
    speed: 8,
    repeat_s: 11,
    start_s: 1,
  }),
  polyline(
    'pasazer-dworzec',
    [
      [3792, south - 14],
      [3792, south - 148],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'tramwaj-stare-miasto',
    [
      [3136, 1984],
      [3808, 1984],
      [3872, 2048],
      [3872, 2432],
      [3808, 2496],
      [3008, 2496],
      [2944, 2432],
      [2944, 2048],
      [3008, 1984],
      [3136, 1984],
    ],
    { kind: 'tram', speed: 6, loop: true, repeat_s: 0.02, start_s: 1 },
  ),
  polyline(
    'piesi-rynek',
    [
      [3448, 1846],
      [3448, 1674],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'piesi-kamienice',
    [
      [3000, 2356],
      [3712, 2356],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'piesi-zoo',
    [
      [4992, 2224],
      [4992, 2752],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'piesi-ostrow',
    [
      [2796, 1344],
      [3122, 1344],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'rowerzysta-bulwary',
    [
      // Keep the cyclist clear of the swept corners of cars on the ring.
      [0, 1520],
      [mapWidth, 1520],
    ],
    { kind: 'cyclist', speed: 3.1 },
  ),
);
trafficControls.push(
  rect('obwodnica-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'obwodnica-tram-E',
    vertex: 6,
    exit: 7,
  }),
  rect('dworzec-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'dworzec-tram-E',
    vertex: 1,
    exit: 2,
  }),
  rect('poludnie-przystanek-bez-wysepki', 3768, south - 128, 48, 115, {
    kind: 'stop',
    route: tram,
    vertex: 3,
    passenger: 'pasazer-dworzec',
  }),
  rect('poludnie-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'poludnie-tram-E',
    vertex: 4,
    exit: 5,
  }),
);

for (let y = 0; y < mapHeight; y += tile)
  for (const x of columns)
    if (
      !rows.some((cy) => Math.abs(y + 16 - cy) < (cy === south ? 128 : 64)) &&
      !roundabouts.some(
        (r) => x === r.x && Math.abs(y + 16 - r.y) < r.radius + 80,
      )
    )
      mark(x, y, tiles.dashVertical);
for (let x = 0; x < mapWidth; x += tile)
  for (const y of rows)
    if (
      !columns.some((cx) => Math.abs(x + 16 - cx) < 64) &&
      !roundabouts.some(
        (r) => y === r.y && Math.abs(x + 16 - r.x) < r.radius + 80,
      )
    )
      mark(x, y, tiles.dashHorizontal);

const scenery = wroclawScenery(map);
const missions = wroclawMissionSites(map);
scenery.pois.push(...missions.pois);
trafficRoutes.push(...missions.trafficRoutes);
const collisions = [...scenery.collisions];
const waterRuns = new Map<
  string,
  { x: number; y: number; w: number; h: number }
>();
const waterAreas: { x: number; y: number; w: number; h: number }[] = [];
for (let row = 0; row < height; row++) {
  for (let col = 0; col < width;) {
    if (surface[row * width + col] !== 'water') {
      col++;
      continue;
    }
    const start = col;
    while (col < width && surface[row * width + col] === 'water') col++;
    const key = `${start}:${col}`;
    const previous = waterRuns.get(key);
    if (previous && previous.y + previous.h === row * tile) previous.h += tile;
    else {
      const area = {
        x: start * tile,
        y: row * tile,
        w: (col - start) * tile,
        h: tile,
      };
      waterRuns.set(key, area);
      waterAreas.push(area);
    }
  }
}
for (const { x, y, w, h } of waterAreas)
  collisions.push(rect(`woda-${x}-${y}`, x, y, w, h, { kind: 'wall' }));
for (const { id, x, y } of roundabouts)
  for (let strip = -5; strip <= 5; strip++) {
    const dy = strip * 16;
    const half = Math.floor(Math.sqrt(88 ** 2 - dy ** 2));
    collisions.push(
      rect(`${id}-wyspa-${strip}`, x - half, y + dy - 8, 2 * half, 16, {
        kind: 'wall',
      }),
    );
  }

objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer(
  'intersections',
  network.map((j) =>
    rect(j.id, j.x - 64, j.y - halfHeight(j), 128, 2 * halfHeight(j), {
      kind: j.kind,
    }),
  ),
);
objectLayer('crossings', crossings);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer('crossing_signals', crossingSignals);
objectLayer('traffic_routes', trafficRoutes);
objectLayer('traffic_controls', trafficControls);
objectLayer(
  'traffic_islands',
  roundabouts.map(({ id, x, y, radius }) =>
    rect(`${id}-wyspa`, x - 93, y - 93, 186, 186, {
      road_radius: radius + 80,
      corner_radius: 76,
    }),
  ),
);
objectLayer('driveways', [
  rect('wyjazd-magazyn', 1152, 1568, 128, 176, { direction: 'S' }),
]);
objectLayer('parked_cars', [
  rect('autokar-zoo', 5068, 2678, 62, 30),
  rect('parking-stadion', 1208, 826, 50, 26),
]);
objectLayer('spawns', [rect('player', 2912, 2016, 0, 0, { heading: 0 })]);
objectLayer('districts', [
  rect('rynek-stare-miasto', 1920, 1504, 2304, 1120),
  rect('ostrow-tumski-wyspy', 1920, 0, 2304, 1504),
  rect('hala-stulecia-zoo', 4224, 0, 1408, 2816),
  rect('poludnie', 1920, 2624, 3712, 1216),
  rect('zachod', 0, 0, 1920, 3840),
  rect('bulwary-odry', 0, 1504, 5632, 128),
]);
objectLayer('triggers', []);
objectLayer('race_routes', missions.raceRoutes);
for (const [name, objects] of Object.entries(scenery))
  if (name !== 'collisions') objectLayer(name, objects);
objectLayer('collisions', collisions);
await write(
  'wroclaw',
  10,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90, freeRideOnly: true },
  'compact',
);

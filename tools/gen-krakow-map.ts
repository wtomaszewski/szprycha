import { tiles } from '../src/render/artFrames.ts';
import { otherSide, sides } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';
import { krakowScenery } from './krakow-scenery.ts';
import { tiledMap } from './tiled-map.ts';
import { tileTerrain, type Surface } from './tile-terrain.ts';

type Point = readonly [number, number];
type Kind = 'equal' | 'priority' | 'signals' | 'roundabout';
type Junction = { id: string; x: number; y: number; kind: Kind };
type Props = Record<string, string | number | boolean>;
const width = 152;
const height = 112;
const tile = 32;
const mapWidth = width * tile;
const mapHeight = height * tile;
const west = 1024;
const centre = 2432;
const east = 4000;
const north = 1088;
const south = 2496;
const columns = [west, centre, east];
const rows = [north, south];
const map = tiledMap(width, height);
const { rect, polyline, objectLayer, write } = map;
const surface = Array<Surface>(width * height).fill('grass');
const markings = Array<number>(width * height).fill(0);
function paint(x: number, y: number, w: number, h: number, color: Surface) {
  for (let row = y / tile; row < (y + h) / tile; row++)
    for (let col = x / tile; col < (x + w) / tile; col++)
      surface[row * width + col] = color;
}
function mark(x: number, y: number, gid: number) {
  markings[Math.floor(y / tile) * width + Math.floor(x / tile)] = gid;
}
const zones: ReturnType<typeof rect>[] = [];
const lanes: ReturnType<typeof polyline>[] = [];
const signs: ReturnType<typeof rect>[] = [];
const signals: ReturnType<typeof rect>[] = [];
function zone(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: string,
  color: Surface,
  props: Props = {},
) {
  zones.push(rect(id, x, y, w, h, { kind, ...props }));
  paint(x, y, w, h, color);
}
function sign(
  code: string,
  affects: string,
  facing: Side,
  x: number,
  y: number,
  props: Props = {},
) {
  signs.push(
    rect(`${affects}-${code}-${facing}`, x, y, 0, 0, {
      code,
      affects,
      facing,
      ...props,
    }),
  );
}

// The river bends between districts. Paint the approaches after the water so
// its remaining tiles can serve as the source of truth for the collision bank.
for (const [x, w, top, bottom] of [
  [0, 768, 1696, 1952],
  [768, 768, 1760, 2048],
  [1536, 768, 1824, 2112],
  [2304, 1536, 1856, 2112],
  [3840, 1024, 1792, 2048],
] as const)
  paint(x, top, w, bottom - top, 'water');

const junctions: Junction[] = [
  { id: 'targ', x: west, y: north, kind: 'priority' },
  { id: 'aleja', x: centre, y: north, kind: 'signals' },
  { id: 'debnik', x: west, y: south, kind: 'equal' },
  { id: 'most', x: centre, y: south, kind: 'priority' },
  { id: 'ogrody', x: east, y: south, kind: 'equal' },
];
const ring = { x: east, y: north, radius: 160 };
const merges = sides.map((side): Junction => ({
  id: `rondo-${side}`,
  kind: 'roundabout',
  x: ring.x + ring.radius * sideVector[side].x,
  y: ring.y + ring.radius * sideVector[side].y,
}));
const network = [...junctions, ...merges];
const halfWidth = (x: number) => (x === centre ? 128 : 64);
for (const x of columns) {
  const half = halfWidth(x);
  const sidewalkEnd = x === west ? south + 64 : mapHeight;
  zone(
    `chodnik-ns-${x}-w`,
    x - half - 64,
    0,
    64,
    sidewalkEnd,
    'sidewalk',
    'sidewalk',
  );
  zone(
    `chodnik-ns-${x}-e`,
    x + half,
    0,
    64,
    sidewalkEnd,
    'sidewalk',
    'sidewalk',
  );
  zone(
    `jezdnia-ns-${x}`,
    x - half,
    0,
    2 * half,
    mapHeight,
    'roadway',
    'asphalt',
  );
}
for (const y of rows) {
  zone(`chodnik-ew-${y}-n`, 0, y - 128, mapWidth, 64, 'sidewalk', 'sidewalk');
  zone(`chodnik-ew-${y}-s`, 0, y + 64, mapWidth, 64, 'sidewalk', 'sidewalk');
  zone(`jezdnia-ew-${y}`, 0, y - 64, mapWidth, 128, 'roadway', 'asphalt');
}
zone(
  'rondo-kasztany',
  ring.x - 224,
  ring.y - 224,
  448,
  448,
  'roadway',
  'asphalt',
);
paint(ring.x - 96, ring.y - 96, 192, 192, 'grass');

zone('rynek-deptak', 1312, 352, 864, 352, 'pedestrian_zone', 'cobble', {
  surface: 'rough',
});
zone('rynek-dojscie', 1056, 704, 1120, 256, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('rynek-polnoc', 1344, 256, 768, 96, 'sidewalk', 'sidewalk');
zone('rynek-wejscie', 1696, 832, 96, 128, 'sidewalk', 'sidewalk');
zone('wawel-dziedziniec', 1312, 1312, 864, 416, 'park_path', 'cobble');
zone('wawel-kostka-pod-murem', 1312, 1632, 864, 96, 'park_path', 'cobble', {
  surface: 'rough',
});
zone('wawel-dojscie', 1664, 1216, 128, 96, 'park_path', 'sidewalk');
zone('kazimierz-plac', 2720, 1312, 1024, 384, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('kazimierz-dojscie', 2848, 1216, 608, 96, 'living_zone', 'cobble');
zone('kazimierz-chodnik', 2752, 1408, 256, 160, 'sidewalk', 'sidewalk');
zone('lacze-ddr-kazimierz', 2752, 1152, 416, 64, 'bike_path', 'bike');
zone('uliczka-kazimierz', 3040, 1216, 128, 384, 'roadway', 'asphalt', {
  direction: 'S',
});
zone('kontrapas-kazimierz', 3136, 1216, 32, 384, 'bike_lane', 'bike', {
  direction: 'N',
});
for (const [start, end] of [
  [0, 960],
  [1088, 2304],
  [2560, 3936],
  [4064, mapWidth],
] as const)
  zone(
    `ddr-bulwary-${start}`,
    start,
    2112,
    end - start,
    64,
    'bike_path',
    'bike',
  );
zone('ciag-bulwary', 2592, 2208, 1280, 64, 'shared_path', 'sidewalk');
zone('bulwary-wjazd-w', 2560, 2112, 32, 160, 'shared_path', 'sidewalk');
zone('bulwary-wjazd-e', 3744, 2112, 128, 96, 'shared_path', 'sidewalk');
zone('kopiec-alejka', 2624, 2816, 768, 64, 'park_path', 'sidewalk');
zone('kopiec-alejka-zachod', 2624, 2880, 64, 32, 'park_path', 'sidewalk');
zone('kopiec-alejka-wschod', 3296, 2880, 96, 32, 'park_path', 'sidewalk');
zone('kopiec-dojscie', 2816, 2560, 64, 256, 'park_path', 'sidewalk');
zone('kopiec-zakaz', 3392, 2816, 192, 64, 'no_bikes', 'sidewalk');
for (const [side, x] of [
  ['e', west + 64],
  ['w', west - 96],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
  });
zone('wyjazd-z-podworza', 736, 1088, 96, 192, 'roadway', 'gravel');
zone('ddr-przejazd-polnoc', 2752, 864, 64, 160, 'bike_path', 'bike');
zone('ddr-przejazd-poludnie', 2752, 1152, 64, 160, 'bike_path', 'bike');

for (const [id, x, y, w] of [
  ['krk-skrot-rynek', 1472, 800, 544],
  ['krk-skrot-kazimierz', 3200, 1504, 384],
  ['krk-skrot-kopiec', 2688, 2880, 608],
] as const) {
  zone(id, x, y, w, 32, 'park_path', 'cobble');
  sign('B-1', id, 'W', x - 8, y + 28);
}

sign('B-9', 'rynek-deptak', 'S', 1552, 716);
sign('B-9', 'kopiec-zakaz', 'W', 3396, 2884);
sign('D-40', 'rynek-dojscie', 'S', 1696, 950);
sign('D-41', 'rynek-dojscie', 'N', 1800, 954);
sign('D-40', 'kazimierz-plac', 'N', 2852, 1296);
sign('D-41', 'kazimierz-plac', 'S', 2912, 1300);
sign('B-2', 'uliczka-kazimierz', 'S', 3176, 1584, { exceptBicycles: true });
sign('P-23', 'kontrapas-kazimierz', 'S', 3152, 1552);
sign('C-13', 'ddr-bulwary-2560', 'W', 2597, 2179);
sign('C-13', 'ddr-bulwary-2560', 'E', 3740, 2180);
sign('C-13/C-16', 'ciag-bulwary', 'W', 2598, 2277);
sign('C-13/C-16', 'ciag-bulwary', 'E', 3868, 2276);
sign('D-46', 'wyjazd-podworze', 'N', 833, 1248);
sign('D-47', 'wyjazd-podworze', 'S', 735, 1216);
sign('A-9', 'debnik-S', 'S', 1088, 3220);

const horizontal = (side: Side) => side === 'E' || side === 'W';
function linePoint(j: Junction, side: Side, inlet: boolean): Point {
  const { x, y } = sideVector[side];
  const offset = inlet ? 32 : -32;
  return [
    j.x + halfWidth(j.x) * x + offset * y * (j.x === centre ? 2 : 1),
    j.y + 64 * y - offset * x,
  ];
}
function boundary([x, y]: Point, side: Side): Point {
  if (!horizontal(side)) return [x, side === 'N' ? 0 : mapHeight];
  return [side === 'W' ? 0 : mapWidth, y];
}
function neighbour(j: Junction, side: Side) {
  const { x, y } = sideVector[side];
  return network
    .filter(
      (other) =>
        (x ? other.y === j.y : other.x === j.x) &&
        (other.x - j.x) * x + (other.y - j.y) * y > 0,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y),
    )[0];
}
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
      ...(id === 'debnik-S' && { parallelShoulder: 'pobocze-e' }),
    }),
  );
  return id;
}
function connect(
  j: Junction,
  side: Side,
  priority: string,
  turns: string,
  codes: string[] = [],
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
  const { x: dx, y: dy } = sideVector[side];
  const [x, y] = end;
  for (const [i, code] of codes.entries()) {
    const offset = 18 + i * 42;
    sign(code, id, side, x + offset * dx + 48 * dy, y + offset * dy - 48 * dx);
  }
}
function mainSignal(id: string, x: number, y: number, group: 'ew' | 'ns') {
  signals.push(
    rect(`${id}-s1`, x, y, 0, 0, {
      code: 'S-1',
      affects: id,
      group: `aleja-${group}`,
      offset_s: group === 'ew' ? 0 : 32,
      cycle_s: 58,
      green_s: 14,
      yellow_s: 2,
    }),
  );
}
for (const j of junctions)
  for (const side of sides) {
    const turns = 'straight,left,right';
    if (j.kind === 'priority') {
      const main = j.id === 'most' ? !horizontal(side) : horizontal(side);
      connect(j, side, main ? 'main' : 'minor', turns, [
        main ? 'D-1' : side === 'S' ? 'B-20' : 'A-7',
      ]);
    } else if (j.kind === 'equal') connect(j, side, 'equal', turns);
    else {
      connect(j, side, 'signal', turns);
      const [x, y] = linePoint(j, side, true);
      const { x: dx, y: dy } = sideVector[side];
      mainSignal(
        `${j.id}-${side}`,
        x + 12 * dx + 54 * dy,
        y + 12 * dy - 54 * dx,
        horizontal(side) ? 'ew' : 'ns',
      );
    }
  }
for (const [i, radial] of sides.entries()) {
  const j = merges[i]!;
  connect(j, radial, 'roundabout_in', 'right', ['A-7', 'C-12']);
  const ringIn = otherSide(radial, 1);
  const previous = merges[(i + 1) % sides.length]!;
  const previousExit = otherSide(ringIn, -1);
  const start = linePoint(previous, previousExit, false);
  const end = linePoint(j, ringIn, true);
  const corner = horizontal(previousExit)
    ? [end[0], start[1]]
    : [start[0], end[1]];
  const bevel = [previousExit, ringIn].map((side): Point => [
    corner[0]! - 30 * sideVector[side].x,
    corner[1]! - 30 * sideVector[side].y,
  ]);
  lane(
    j,
    ringIn,
    [start, ...bevel, end],
    'roundabout_ring',
    'straight,right',
    `${previous.id}-${previousExit}`,
  );
}
signals.push(
  rect('aleja-strzalka', 2308, 1018, 0, 0, {
    code: 'S-2',
    affects: 'aleja-N',
    group: 'aleja-ns',
    from_s: 53,
    until_s: 56,
    direction: 'right',
  }),
);

const railY = 3104;
zone('tor-kolejowy', 448, railY, 1152, 32, 'rail', 'gravel');
const crossings = [
  ...columns.map((x) =>
    rect(
      `bulwary-przejazd-${x}`,
      x - halfWidth(x),
      2112,
      2 * halfWidth(x),
      64,
      { axis: 'x', kind: 'bike' },
    ),
  ),
  rect('aleja-przejazd', 2752, 1024, 64, 128, {
    axis: 'y',
    kind: 'bike',
    trafficGroup: 'aleja-rower-pieszy',
  }),
  rect('aleja-zebra', 2816, 1024, 32, 128, {
    axis: 'y',
    kind: 'pedestrian',
    trafficGroup: 'aleja-rower-pieszy',
  }),
  rect('targ-zebra', 1408, 1024, 48, 128, { axis: 'y', kind: 'pedestrian' }),
  rect('debnik-kolej', 928, railY - 8, 192, 48, {
    kind: 'rail',
    axis: 'y',
    barriers: true,
    open_s: 23,
    lowering_s: 3,
    closed_s: 6,
    raising_s: 2,
    train_from_x: 448,
    train_to_x: 1600,
  }),
];
sign('D-6a', 'aleja-E', 'E', 2866, 1010);
sign('D-6', 'aleja-E', 'E', 2886, 1010);
const crossingSignals = [
  rect('aleja-przejazd-s6', 2742, 1008, 0, 0, {
    crossing: 'aleja-przejazd',
    stopRoadTraffic: true,
    cycle_s: 58,
    offset_s: 14,
    green_s: 8,
    twoWay: true,
  }),
  rect('aleja-zebra-s5', 2856, 1008, 0, 0, {
    crossing: 'aleja-zebra',
    cycle_s: 58,
    offset_s: 14,
    green_s: 8,
    twoWay: true,
  }),
];

const tramX = centre;
const tramPoints: Point[] = [
  [tramX, 0],
  [tramX, 800],
  [tramX, north - 64],
  [tramX, north + 64],
  [tramX, south - 64],
  [tramX, south + 64],
  [tramX, mapHeight],
];
const tram = 'tramwaj-aleja';
for (const [id, priority, start, stop] of [
  ['aleja', 'signal', 0, 2],
  ['most', 'main', 3, 4],
] as const)
  lanes.push(
    polyline(`${id}-tram-N`, tramPoints.slice(start, stop + 1), {
      type: 'tram',
      intersection: id,
      side: 'N',
      width_px: 48,
      speedLimit: 30,
      priorityClass: priority,
    }),
  );
mainSignal('aleja-tram-N', centre + 16, north - 70, 'ns');
const trafficRoutes = [
  polyline(tram, tramPoints, {
    kind: 'tram',
    speed: 7,
    repeat_s: 8,
    start_s: 1,
  }),
  polyline(
    'pasazer-aleja',
    [
      [centre + 14, 800],
      [centre + 150, 800],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'spacer-rynek',
    [
      [1424, 583],
      [1700, 583],
      [1952, 583],
      [2100, 583],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-kazimierz',
    [
      [2784, 1440],
      [2900, 1440],
      [2976, 1536],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-bulwary',
    [
      [2690, 2240],
      [3150, 2240],
      [3590, 2240],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'rower-bulwary',
    [
      [0, 2144],
      [mapWidth, 2144],
    ],
    { kind: 'cyclist', speed: 3.4 },
  ),
  polyline(
    'pieszy-targ',
    [
      [1432, 1008],
      [1432, 1168],
    ],
    { kind: 'pedestrian', speed: 1.45, event_only: true },
  ),
  polyline(
    'pieszy-zebra',
    [
      [2832, 1000],
      [2832, 1172],
    ],
    { kind: 'pedestrian', speed: 1.45 },
  ),
];
const trafficControls = [
  rect('aleja-przystanek', centre + 12, 774, 112, 52, {
    kind: 'stop',
    route: tram,
    vertex: 1,
    passenger: 'pasazer-aleja',
  }),
  rect('aleja-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'aleja-tram-N',
    vertex: 2,
    exit: 3,
  }),
  rect('most-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'most-tram-N',
    vertex: 4,
    exit: 5,
  }),
];

for (let y = 0; y < mapHeight; y += tile)
  for (const x of [west, east])
    if (
      !rows.some((cy) => Math.abs(y + 16 - cy) < 64) &&
      !(x === east && Math.abs(y + 16 - ring.y) < 224)
    )
      mark(x, y, tiles.dashVertical);
for (const y of rows)
  for (let x = 0; x < mapWidth; x += tile)
    if (
      !columns.some((cx) => Math.abs(x + 16 - cx) < halfWidth(cx)) &&
      !(y === north && Math.abs(x + 16 - ring.x) < 224)
    )
      mark(x, y, tiles.dashHorizontal);
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);
for (let y = 1216; y < 1600; y += tile) mark(3136, y, tiles.solidVertical);
for (let y = 1248; y < 1600; y += 96) mark(3136, y, tiles.bicycle);

const scenery = krakowScenery(map);
for (let row = 0; row < height; row++) {
  for (let col = 0; col < width;) {
    const start = col;
    while (col < width && surface[row * width + col] === 'water') col++;
    if (col > start)
      scenery.collisions.push(
        rect(
          `wisla-${row}-${start}`,
          start * tile,
          row * tile,
          (col - start) * tile,
          tile,
          { kind: 'wall' },
        ),
      );
    else col++;
  }
}
scenery.collisions.push(
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, { kind: 'wall' }),
);
objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer(
  'intersections',
  network.map(({ id, x, y, kind }) =>
    rect(id, x - halfWidth(x), y - 64, 2 * halfWidth(x), 128, { kind }),
  ),
);
objectLayer('crossings', crossings);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer('crossing_signals', crossingSignals);
objectLayer('traffic_routes', trafficRoutes);
objectLayer('traffic_controls', trafficControls);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, {
    road_radius: 224,
    corner_radius: 46,
  }),
]);
objectLayer('driveways', [
  rect('wyjazd-podworze', 736, 1120, 96, 160, { direction: 'N' }),
]);
objectLayer('spawns', [rect('player', 1440, 768, 0, 0, { heading: 0 })]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);
await write(
  'krakow',
  10,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90 },
  'compact',
);

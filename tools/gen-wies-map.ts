import { artHash, tiles } from '../src/render/artFrames.ts';
import { otherSide, sides } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';
import { tiledMap } from './tiled-map.ts';
import { tileTerrain, type Surface } from './tile-terrain.ts';

type Point = readonly [number, number];
type Kind = 'priority' | 'equal' | 'signals' | 'roundabout';
type Junction = { id: string; x: number; y: number; kind: Kind };
type Properties = Parameters<ReturnType<typeof tiledMap>['rect']>[5];

const tile = 32;
const columns = 128;
const rows = 96;
const width = columns * tile;
const height = rows * tile;
const road = 1088;
const village = 1888;
const tramRoad = 2304;
const ring = { x: 3328, y: village, radius: 160 };
const map = tiledMap(columns, rows);
const { rect, polyline, objectLayer } = map;
const terrain = Array<Surface>(columns * rows).fill('grass');
const markings = Array<number>(terrain.length).fill(0);

function paint(x: number, y: number, w: number, h: number, surface: Surface) {
  for (let row = y / tile; row < (y + h) / tile; row++)
    for (let col = x / tile; col < (x + w) / tile; col++)
      terrain[row * columns + col] = surface;
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
  surface: Surface,
  props: Properties = {},
) {
  zones.push(rect(id, x, y, w, h, { kind, ...props }));
  paint(x, y, w, h, surface);
}
function sign(
  code: string,
  affects: string,
  facing: Side,
  x: number,
  y: number,
  props: Properties = {},
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

paint(0, 1536, 1728, 128, 'water');
zone('gminna', road - 96, 0, 192, height, 'roadway', 'asphalt', {
  speedLimit: 60,
  ruralShoulders: 'pobocze-zachod,pobocze-wschod',
});
zone('pobocze-zachod', road - 128, 0, 32, 960, 'shoulder', 'gravel', {
  direction: 'S',
  shoulderUsable: true,
});
zone('pobocze-wschod', road + 96, 0, 32, 960, 'shoulder', 'gravel', {
  direction: 'N',
  shoulderUsable: true,
});
zone('dziedziniec-szkoly', 1216, 256, 192, 192, 'park_path', 'sidewalk');
zone('piaszczysty-skraj', road + 96, 960, 32, 160, 'shoulder', 'gravel', {
  direction: 'N',
  shoulderUsable: false,
  surface: 'rough',
});
zone('droga-przystanku', 576, 0, 128, 736, 'roadway', 'asphalt');
zone('droga-przystanku-luk', 0, 608, 576, 128, 'roadway', 'asphalt');
zone('droga-gruntowa', 3776, 0, 128, 896, 'roadway', 'gravel', {
  surface: 'rough',
});
zone('droga-gruntowa-pole', 3904, 768, width - 3904, 128, 'roadway', 'gravel', {
  surface: 'rough',
});
zone('droga-osadowa', 0, village - 64, width, 128, 'roadway', 'asphalt');
zone('droga-przy-lesie', 0, 2496, 1184, 128, 'roadway', 'asphalt');
zone('droga-przy-lesie-wschod', 1184, 2496, 736, 128, 'roadway', 'asphalt');
zone('luk-lesny', 1696, 2624, 224, height - 2624, 'roadway', 'asphalt');
zone('droga-skansenu', tramRoad - 128, 0, 256, height, 'roadway', 'asphalt');
zone('droga-ronda', ring.x - 64, 0, 128, height, 'roadway', 'asphalt');
zone('rondo-skraj', ring.x - 224, ring.y - 224, 448, 448, 'roadway', 'asphalt');
paint(ring.x - 96, ring.y - 96, 192, 192, 'grass');
// The low-traffic lanes west of the osada have no sidewalks or centre lines.
zone('chodnik-skansenu', tramRoad + 128, 1152, 64, 480, 'sidewalk', 'sidewalk');
zone('chodnik-dziedziniec', 1440, 1952, 64, 224, 'sidewalk', 'sidewalk');
zone('plac-osady', 1504, 2048, 544, 256, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('droga-wewnetrzna', 704, 2176, 288, 96, 'roadway', 'gravel', {
  surface: 'rough',
});
zone('ddr-zagrody', 2624, 1568, 64, 256, 'bike_path', 'bike');
zone('ddr-las', 2624, 1952, 64, 256, 'bike_path', 'bike');
zone('ciag-lesny', 2688, 2144, 368, 64, 'shared_path', 'sidewalk');
zone('kontrapas-osady', 2848, 2304, 32, 192, 'bike_lane', 'bike', {
  direction: 'N',
});
zone('uliczka-osady', 2752, 2304, 96, 192, 'roadway', 'asphalt', {
  direction: 'S',
});
zone('sciezka-rezerwatu', 2720, 2720, 448, 64, 'no_bikes', 'gravel');
zone('skrot-gospodarczy', 896, 2272, 96, 128, 'park_path', 'gravel');
sign('C-13', 'ddr-las', 'S', 2690, 1984);
sign('C-13/C-16', 'ciag-lesny', 'W', 2692, 2214);
sign('B-2', 'uliczka-osady', 'S', 2816, 2488, { exceptBicycles: true });
sign('B-9', 'sciezka-rezerwatu', 'W', 2712, 2786);
sign('B-1', 'skrot-gospodarczy', 'N', 888, 2272);
sign('D-40', 'plac-osady', 'N', 1510, 2040);
sign('D-47', 'wyjazd-gospodarstwo', 'W', 970, 2268);
sign('D-46', 'wyjazd-gospodarstwo', 'E', 988, 2180);
sign('D-15', 'droga-przystanku', 'N', 569, 452);

const railY = 1216;
zone('nasyp', 768, railY, 768, 32, 'rail', 'gravel');
for (let x = 768; x < 1536; x += tile)
  markings[(railY / tile) * columns + x / tile] = tiles.rails;
for (const facing of ['N', 'S'] as const) {
  const north = facing === 'N';
  const x = road + (north ? -108 : 108);
  sign('A-10', 'przejazd-gminny', facing, x, north ? 1064 : 1400);
  sign('G-3', 'przejazd-gminny', facing, x, north ? 1198 : 1268);
}

const horizontal = (side: Side) => side === 'E' || side === 'W';
const junctions: Junction[] = [
  { id: 'gminna-osada', x: road, y: village, kind: 'priority' },
  { id: 'lesne-skrzyzowanie', x: road, y: 2560, kind: 'equal' },
  { id: 'skansen', x: tramRoad, y: village, kind: 'signals' },
];
const merges = sides.map((side): Junction => ({
  id: `rondo-${side}`,
  kind: 'roundabout',
  x: ring.x + ring.radius * sideVector[side].x,
  y: ring.y + ring.radius * sideVector[side].y,
}));
const network = [...junctions, ...merges];
const halfX = (j: Junction) =>
  j.x === road ? 96 : j.x === tramRoad ? 128 : 64;
function linePoint(j: Junction, side: Side, inbound: boolean): Point {
  const { x, y } = sideVector[side];
  const offset = inbound ? 1 : -1;
  const laneOffset = j.id === 'lesne-skrzyzowanie' ? 42 : 32;
  return [
    j.x + halfX(j) * x + (j.x === tramRoad ? 67 : 32) * offset * y,
    j.y + 64 * y - laneOffset * offset * x,
  ];
}
function boundary([x, y]: Point, side: Side): Point {
  if (horizontal(side)) return [side === 'W' ? 0 : width, y];
  return [x, side === 'N' ? 0 : height];
}
function neighbour(j: Junction, side: Side) {
  const v = sideVector[side];
  return network
    .filter(
      (other) =>
        (v.x ? other.y === j.y : other.x === j.x) &&
        (other.x - j.x) * v.x + (other.y - j.y) * v.y > 0,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y),
    )[0];
}
function addLane(
  j: Junction,
  side: Side,
  points: Point[],
  priorityClass: string,
  turns: string,
  from?: string,
) {
  const id = `${j.id}-${side}`;
  const mainRoad = j.x === road && !horizontal(side);
  lanes.push(
    polyline(id, points, {
      type: 'car',
      intersection: j.id,
      side,
      priorityClass,
      turns,
      width_px: mainRoad ? 128 : 64,
      speedLimit:
        id === 'gminna-osada-N' ? 60 : j.kind === 'roundabout' ? 18 : 30,
      ...(from && { from }),
      ...(id === 'gminna-osada-N' && { parallelShoulder: 'pobocze-zachod' }),
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
  const upstream = neighbour(j, side);
  const other = otherSide(side, 2);
  const end = linePoint(j, side, true);
  const start = upstream
    ? linePoint(upstream, other, false)
    : boundary(end, side);
  const forestBend = j.id === 'lesne-skrzyzowanie' && side === 'E';
  const approach: Point[] = forestBend
    ? [[1856, height], [1856, 2570], [1804, 2518], end]
    : [start, end];
  const id = addLane(
    j,
    side,
    approach,
    priority,
    turns,
    upstream && `${upstream.id}-${other}`,
  );
  if (!upstream) {
    const out = linePoint(j, side, false);
    const exit: Point[] = forestBend
      ? [out, [1728, 2602], [1760, 2624], [1760, height]]
      : [out, boundary(out, side)];
    lanes.push(
      polyline(`${id}-out`, exit, {
        role: 'exit',
        intersection: j.id,
        side,
        speedLimit: id === 'gminna-osada-N' ? 60 : 30,
      }),
    );
  }
  const { x: dx, y: dy } = sideVector[side];
  const [x, y] = end;
  for (const [i, code] of codes.entries()) {
    const approach = 20 + 40 * i;
    sign(
      code,
      id,
      side,
      x + approach * dx + 43 * dy,
      y + approach * dy - 43 * dx,
    );
  }
  return id;
}
function signal(id: string, x: number, y: number, group: 'ew' | 'ns') {
  signals.push(
    rect(`${id}-s1`, x, y, 0, 0, {
      code: 'S-1',
      affects: id,
      group: `skansen-${group}`,
      cycle_s: 56,
      offset_s: group === 'ew' ? 0 : 28,
      green_s: group === 'ns' ? 18 : 14,
      yellow_s: 2,
    }),
  );
}

for (const j of junctions) {
  for (const side of sides) {
    const turns = 'straight,left,right';
    if (j.kind === 'priority') {
      const primary = !horizontal(side);
      connect(j, side, primary ? 'main' : 'minor', turns, [
        primary ? 'D-1' : 'B-20',
      ]);
    } else if (j.kind === 'equal') {
      connect(j, side, 'equal', turns);
    } else {
      const id = connect(j, side, 'signal', turns);
      const [x, y] = linePoint(j, side, true);
      const { x: dx, y: dy } = sideVector[side];
      signal(
        id,
        x + 15 * dx + 42 * dy,
        y + 15 * dy - 42 * dx,
        horizontal(side) ? 'ew' : 'ns',
      );
    }
  }
}
for (const [index, radial] of sides.entries()) {
  const j = merges[index]!;
  connect(j, radial, 'roundabout_in', 'right', ['A-7', 'C-12']);
  const ringIn = otherSide(radial, 1);
  const previous = merges[(index + 1) % sides.length]!;
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
  addLane(
    j,
    ringIn,
    [start, ...bevel, end],
    'roundabout_ring',
    'straight,right',
    `${previous.id}-${previousExit}`,
  );
}
signals.push(
  rect('skansen-strzalka', 2188, 1820, 0, 0, {
    code: 'S-2',
    affects: 'skansen-N',
    group: 'skansen-ns',
    from_s: 51,
    until_s: 55,
    direction: 'right',
  }),
);

const tram = 'tramwaj-skansen';
const tramPoints = [
  [tramRoad, 0],
  [tramRoad, 1300],
  [tramRoad, village - 64],
  [tramRoad, village + 64],
  [tramRoad, height],
] as const;
lanes.push(
  polyline('skansen-tram-N', tramPoints.slice(1, 3), {
    type: 'tram',
    intersection: 'skansen',
    side: 'N',
    width_px: 48,
    speedLimit: 25,
    priorityClass: 'signal',
  }),
);
signal('skansen-tram-N', tramRoad + 16, village - 70, 'ns');

objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer(
  'intersections',
  network.map((j) =>
    rect(j.id, j.x - halfX(j), j.y - 64, 2 * halfX(j), 128, { kind: j.kind }),
  ),
);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer('crossings', [
  rect('przejazd-gminny', 992, 1208, 192, 48, {
    kind: 'rail',
    axis: 'y',
    barriers: false,
    passive: true,
    open_s: 17,
    lowering_s: 3,
    closed_s: 7,
    raising_s: 2,
    train_from_x: 768,
    train_to_x: 1536,
  }),
  rect('przejazd-skansen', 2624, village - 64, 64, 128, {
    kind: 'bike',
    axis: 'y',
  }),
  rect('zebra-osada', 1456, village - 64, 32, 128, {
    kind: 'pedestrian',
    axis: 'y',
  }),
]);
objectLayer('crossing_signals', [
  rect('skansen-s6', 2612, village - 72, 0, 0, {
    crossing: 'przejazd-skansen',
    stopRoadTraffic: true,
    twoWay: true,
    cycle_s: 56,
    offset_s: 15,
    green_s: 8,
  }),
]);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, {
    road_radius: 224,
    corner_radius: 46,
  }),
]);
objectLayer('traffic_routes', [
  polyline(tram, tramPoints, {
    kind: 'tram',
    speed: 7,
    repeat_s: 9,
    start_s: 1,
  }),
  polyline(
    'pasazer-skansen',
    [
      [tramRoad + 12, 1300],
      [2480, 1300],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'autobus-regionalny',
    [
      [608, 0],
      [608, 480],
      [608, 608],
      [544, 640],
      [0, 640],
    ],
    {
      kind: 'bus',
      speed: 9,
      repeat_s: 13,
      start_s: 1,
    },
  ),
  polyline(
    'ciagnik-pole',
    [
      [3840, 0],
      [3840, 768],
      [3892, 832],
      [width, 832],
    ],
    {
      kind: 'tractor',
      speed: 4.4,
      repeat_s: 9,
    },
  ),
  polyline(
    'pieszy-pobocze-wschod',
    [
      [1189, 80],
      [1189, 880],
    ],
    {
      kind: 'pedestrian',
      speed: 1.45,
      rural_edge: true,
    },
  ),
  polyline(
    'pieszy-pobocze-zachod',
    [
      [984, 924],
      [984, 192],
    ],
    {
      kind: 'pedestrian',
      speed: 1.35,
      rural_edge: true,
      start_s: 4,
    },
  ),
  polyline(
    'pieszy-bez-pobocza',
    [
      [999, 1800],
      [999, 1492],
    ],
    {
      kind: 'pedestrian',
      speed: 1.4,
      rural_edge: true,
      start_s: 6,
    },
  ),
  polyline(
    'rowerzysta-gminna-polnoc',
    [
      [1208, 924],
      [1208, 12],
    ],
    {
      kind: 'cyclist',
      speed: 4.2,
      rural_edge: true,
      start_s: 3,
    },
  ),
  polyline(
    'rowerzysta-gminna-poludnie',
    [
      [968, 8],
      [968, 916],
    ],
    {
      kind: 'cyclist',
      speed: 3.5,
      rural_edge: true,
      start_s: 8,
    },
  ),
]);
objectLayer('traffic_controls', [
  rect('przystanek-skansen', tramRoad + 10, 1274, 110, 52, {
    kind: 'stop',
    route: tram,
    vertex: 1,
    passenger: 'pasazer-skansen',
  }),
  rect('tramwaj-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'skansen-tram-N',
    vertex: 2,
    exit: 3,
  }),
  rect('przystanek-regionalny', 560, 442, 56, 76, {
    kind: 'platform',
    route: 'autobus-regionalny',
    vertex: 1,
    dwell_s: 4,
  }),
]);
objectLayer('driveways', [
  rect('wyjazd-gospodarstwo', 840, 2176, 152, 96, { direction: 'E' }),
]);
objectLayer('spawns', [
  rect('player', 1207, 886, 0, 0, { heading: -Math.PI / 2 }),
]);
objectLayer('triggers', []);
const poi = (id: string, x: number, y: number, heading: number, size = 36) =>
  rect(id, x - size / 2, y - size / 2, size, size, {
    heading: (heading * Math.PI) / 180,
  });
const finds = [
  ['wie-szyszka-bramka', 1272, 340, 'Q063'],
  ['wie-szyszka-lawka', 1328, 340, 'Q065'],
  ['wie-szyszka-ganek', 1384, 340, 'Q064'],
  ['wie-szyszka-skansen', 2470, 1350, 'Q003'],
] as const;
objectLayer(
  'collectibles',
  finds.map(([id, x, y, question]) =>
    rect(id, x, y, 0, 0, { kind: 'szyszka', question }),
  ),
);
objectLayer('pois', [
  ...finds.map(([id, x, y]) => poi(id, x, y, 0)),
  poi('wie-szkola-dziedziniec', 1224, 340, 0, 16),
  poi('wie-pole-start', 3798, 444, 90, 16),
  poi('wie-pole-pomoc', 3798, 662, 90, 24),
  poi('wie-pobocze-start', 1208, 868, -90, 16),
  poi('wie-widocznosc-kierowcy', 1208, 552, -90, 28),
  poi('wie-pobocze-meta', 1208, 288, -90, 28),
  poi('wie-tory-start', 1170, 1426, -90, 18),
  poi('wie-stop-przed-torami', 1170, 1290, -90),
  poi('wie-za-torami', 1170, 1140, -90),
  poi('wie-noc-start', 1014, 1740, 90, 20),
  poi('wie-noc-meta', 1012, 2106, 90),
  poi('wie-podworze-start', 770, 2240, 0, 24),
  poi('wie-brama', 942, 2240, 0),
  poi('wie-pomoc', 1016, 2384, 90),
]);

const props = [
  rect('lawka-szkolna', 1328, 310, 0, 0, { kind: 'bench' }),
  rect('latarnia-szkola', 1244, 290, 0, 0, { kind: 'lamp' }),
  rect('wiata', 552, 479, 0, 0, { kind: 'shelter', turn: 1 }),
  rect('lawka', 546, 504, 0, 0, { kind: 'bench', turn: 1 }),
  rect('latarnia-przystanek', 566, 422, 0, 0, { kind: 'lamp' }),
  rect('latarnia-skansen', 2492, 1290, 0, 0, { kind: 'lamp' }),
  rect('latarnia-zagroda', 820, 2154, 0, 0, { kind: 'lamp' }),
];
const blocks = [
  rect('szkola-wiejska', 1304, 214, 124, 70, {
    height: 3,
    roof: 'tile',
    wall: 'sand',
  }),
  rect('ganek-szkoly', 1352, 284, 30, 14, {
    height: 2,
    roof: 'tile',
    wall: 'brick',
  }),
  rect('dom-gospodarza', 350, 2112, 108, 72, {
    height: 3,
    roof: 'tile',
    wall: 'sand',
  }),
  rect('stodola', 552, 2130, 140, 100, {
    height: 4,
    roof: 'tile',
    wall: 'brick',
  }),
  rect('spichlerz', 530, 2240, 66, 58, {
    height: 3,
    roof: 'stone',
    wall: 'sand',
  }),
  rect('skansen-zajezdnia', 2096, 1280, 90, 138, {
    height: 4,
    roof: 'tile',
    wall: 'brick',
  }),
  rect('dom-przy-torach', 1238, 1330, 105, 68, {
    height: 3,
    roof: 'tile',
    wall: 'sand',
  }),
  rect('sklep-wiejski', 1552, 2160, 120, 72, {
    height: 3,
    roof: 'tile',
    wall: 'sand',
  }),
  rect('dom-lesniczego', 1470, 680, 100, 80, {
    height: 3,
    roof: 'stone',
    wall: 'brick',
  }),
  rect('szopa-traktor', 3632, 632, 112, 90, {
    height: 4,
    roof: 'tile',
    wall: 'brick',
  }),
];
const collisions = [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, { kind: 'wall' }),
  rect('strumien-zachod', 0, 1536, 992, 128, { kind: 'wall' }),
  rect('strumien-wschod', 1184, 1536, 544, 128, { kind: 'wall' }),
  rect('nasyp-zachod', 768, 1208, 224, 48, { kind: 'wall' }),
  rect('nasyp-wschod', 1184, 1208, 352, 48, { kind: 'wall' }),
];
for (const [startX, startY, endX, endY] of [
  [1248, 80, 2100, 1050],
  [80, 790, 700, 1430],
  [2960, 950, 3220, 1550],
  [1460, 2670, 2120, 2950],
  [3450, 2140, 4010, 2970],
] as const) {
  for (let y = startY; y < endY; y += 92) {
    for (let x = startX; x < endX; x += 79) {
      const n = artHash(x, y);
      if (
        n % 5 === 0 ||
        (y > 2640 && x > 1616 && x < 1950) ||
        (x > 1430 && x < 1600 && y > 630 && y < 775) ||
        (x < 1450 && y > 170 && y < 450)
      )
        continue;
      const px = x + (n % 38);
      const py = y + ((n >>> 8) % 33);
      props.push(
        rect(`drzewo-${x}-${y}`, px, py, 0, 0, { kind: 'tree', turn: n % 4 }),
      );
      collisions.push(
        rect(`pien-${x}-${y}`, px - 7, py - 7, 14, 14, { kind: 'wall' }),
      );
    }
  }
}
objectLayer('blocks', blocks);
objectLayer('props', props);
objectLayer('collisions', collisions);
objectLayer('map_decorations', [
  rect('bramka-szkolna', 1245, 340, 0, 0, { kind: 'school-gate' }),
  rect('rower-na-drodze-gruntowej', 3774, 644, 0, 0, {
    kind: 'fallen-bike',
    mission: 'WIE-A3-01',
  }),
  rect('pole-zachod', 728, 160, 216, 400, { kind: 'field-rows' }),
  rect('pole-za-stodola', 112, 2032, 208, 320, { kind: 'field-rows' }),
  rect('pole-ciagnika', 3440, 352, 240, 256, { kind: 'field-rows' }),
  rect('mostek', 992, 1536, 192, 128, {
    kind: 'truss-bridge',
    color: 0x805b43,
  }),
]);
await map.write(
  'wies',
  7,
  tileTerrain(columns, rows, terrain),
  markings,
  { duskAt: 85, freeRideOnly: true },
  'compact',
  { cyclingClearance: 1, cruiseSpeed: 11 },
);

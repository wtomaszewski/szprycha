import { tiledMap } from './tiled-map.ts';
import {
  duskAt,
  mokotow,
  newWarsawDistricts,
  palace,
} from './warsaw-districts.ts';
import { tileTerrain, type Surface } from './tile-terrain.ts';
import { tiles } from '../src/render/artFrames.ts';
import { sides, otherSide } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';

const width = 156;
const pragaEdge = 2240;
const riverWest = 2816;
const height = 112;
const tile = 32;
const mapWidth = width * tile;
const mapHeight = height * tile;
const street = 128;
const surfaces: Surface[] = [];
const markings: number[] = [];
const map = tiledMap(width, height);
const { rect, polyline, objectLayer, write } = map;
const extension = newWarsawDistricts(map, mapWidth, mapHeight);
type Point = [number, number];
type Junction = {
  id: string;
  x: number;
  y: number;
  kind: 'equal' | 'priority' | 'roundabout' | 'signals';
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
const castle: Junction = { id: 'zamek', x: 3456, y: 448, kind: 'signals' };
const junctions = [
  equalWest,
  stop,
  equalEast,
  equalSouth,
  bazaar,
  ...merges,
  castle,
  palace,
  mokotow,
];

const zones = [
  rect('prog_osiedle', 384, 1280, 128, 32, {
    kind: 'roadway',
    surface: 'rough',
  }),
  ...[448, 1088].map((y) =>
    rect(`road-ew-${y}`, 0, y - 64, y === 448 ? mapWidth : pragaEdge, street, {
      kind: 'roadway',
    }),
  ),
  ...[448, 1088, 1856].map((x) =>
    rect(`road-ns-${x}`, x - 64, 0, street, mapHeight, { kind: 'roadway' }),
  ),
  rect('roundabout-road', 1632, 864, 448, 448, { kind: 'roadway' }),
  rect('gate-walk-north', 512, 352, 512, 32, { kind: 'sidewalk' }),
  rect('gate-walk-south', 512, 992, 512, 32, { kind: 'sidewalk' }),
  rect('bazar-walk-north', 1152, 992, 480, 32, { kind: 'sidewalk' }),
  rect('bazar-walk-south', 1152, 1152, 480, 32, { kind: 'sidewalk' }),
  rect('ddr-most', 1920, 320, 1328, 64, { kind: 'bike_path' }),
  rect('ddr-zamek-zachod', 3248, 320, 144, 40, { kind: 'bike_path' }),
  rect('ddr-zamek-wschod', 3520, 320, 64, 40, { kind: 'bike_path' }),
  rect('road-nabrzeze', 2112, 1024, 128, 512, { kind: 'roadway' }),
  rect('jezdnia-zamkowa', 3392, 0, 128, mapHeight, { kind: 'roadway' }),
  rect('chodnik-zebra-polnoc', 3152, 288, 64, 96, { kind: 'sidewalk' }),
  rect('chodnik-zebra-poludnie', 3152, 512, 64, 64, { kind: 'sidewalk' }),
  rect('uliczka-jednokierunkowa', 2880, 384, 64, 192, { kind: 'park_path' }),
  rect('kocie-lby', 3200, 640, 320, 128, {
    kind: 'living_zone',
    surface: 'rough',
  }),
  rect('starowka-d40', 2976, 640, 928, 448, { kind: 'living_zone' }),
  rect('deptak', 3552, 704, 352, 192, { kind: 'pedestrian_zone' }),
  rect('spacer-turystow', 3264, 704, 288, 192, { kind: 'sidewalk' }),
  rect('pasaz_pierogi', 1152, 280, 128, 72, { kind: 'park_path' }),
  rect('osiedle-ddr-polnoc', 384, 2176, 768, 64, { kind: 'bike_path' }),
  rect('osiedle-ddr-poludnie', 384, 3296, 768, 64, { kind: 'bike_path' }),
  rect('lazienki-poludniowy-lacznik', 2848, 3328, 448, 64, {
    kind: 'bike_path',
  }),
  rect('lazienki-polnocny-lacznik', 2848, 2496, 384, 64, { kind: 'park_path' }),
  rect('bulwar-nierownosci', 2848, 2630, 64, 232, {
    kind: 'bike_path',
    surface: 'rough',
  }),
  rect('starowka-ddr-lacznik', 2848, 608, 64, 576, { kind: 'bike_path' }),
  rect('stadion-ddr-dojazd-zachod', 1568, 1376, 64, 1120, {
    kind: 'bike_path',
  }),
  rect('stadion-ddr-dojazd-wschod', 2016, 1376, 64, 1120, {
    kind: 'bike_path',
  }),
  rect('stadion-ddr-dojazd-polnoc', 1568, 1376, 512, 64, { kind: 'bike_path' }),
  rect('stadion-ddr-zachod', 1568, 2496, 64, 704, { kind: 'bike_path' }),
  rect('stadion-ddr-wschod', 2016, 2496, 64, 704, { kind: 'bike_path' }),
  rect('stadion-ddr-polnoc', 1568, 2496, 512, 64, { kind: 'bike_path' }),
  rect('stadion-ddr-poludnie', 1568, 3136, 512, 64, { kind: 'bike_path' }),
  rect('stadion-skrot', 1792, 2560, 128, 576, { kind: 'roadway' }),
  ...extension.zones,
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
const streetTiles = zones.filter(
  ({ name }) => name.startsWith('road-') || name === 'jezdnia-zamkowa',
);
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
    if (
      zones.some(
        (zone) =>
          /^(stadion|osiedle|starowka)-ddr-/.test(zone.name) &&
          hasTile(x, y, zone),
      )
    ) {
      surfaces.push('bike');
      markings.push(0);
      continue;
    }
    if (
      hasTile(
        x,
        y,
        zones.find(({ name }) => name === 'bulwar-nierownosci')!,
      )
    ) {
      surfaces.push('cobble');
      markings.push(0);
      continue;
    }
    const verge =
      [448, 1088].some((mid) => Math.abs(y - mid) < 96) ||
      [448, 1088, 1856].some((mid) => Math.abs(x - mid) < 96);
    if (x >= riverWest && (y >= 1536 || (x < 3328 && y >= 1184) || x >= 3968)) {
      const [surface, marking] = extension.terrain(x, y, onStreet);
      surfaces.push(surface);
      markings.push(marking);
      continue;
    }
    if (x >= pragaEdge) {
      const water = x < riverWest;
      const deck = y >= 310 && y < 529;
      const cobbles = y >= 544 && y < 1024 && x >= 2848 && x < 3904;
      surfaces.push(
        water && !deck
          ? 'water'
          : onStreet
            ? 'asphalt'
            : cobbles
              ? 'cobble'
              : deck || (!water && y < 640)
                ? 'sidewalk'
                : 'grass',
      );
      markings.push(
        onStreet &&
          !junctions.some(
            (j) => Math.abs(j.x - x) < 64 && Math.abs(j.y - y) < 64,
          )
          ? col * tile === castle.x
            ? tiles.dashVertical
            : row * tile === castle.y
              ? tiles.dashHorizontal
              : 0
          : 0,
      );
      continue;
    }
    surfaces.push(
      hasTile(x, y, hump)
        ? 'cobble'
        : distance < 24
          ? 'water'
          : inRoundabout || onStreet
            ? 'asphalt'
            : paved.some((area) => hasTile(x, y, area))
              ? 'cobble'
              : verge
                ? 'sidewalk'
                : 'grass',
    );
    const junction = junctions.some(
      ({ x: cx, y: cy }) => Math.abs(x - cx) < 64 && Math.abs(y - cy) < 64,
    );
    markings.push(
      !junction && !inRoundabout && onStreet
        ? [448, 1088, 1856].includes(col * 32)
          ? tiles.dashVertical
          : [448, 1088].includes(row * 32)
            ? tiles.dashHorizontal
            : 0
        : 0,
    );
  }

const lanes: ReturnType<typeof polyline>[] = [...extension.lanes];
const signs: ReturnType<typeof rect>[] = [];
function linePoint(junction: Junction, side: Side, inlet: boolean): Point {
  const { x, y } = sideVector[side];
  const offset = inlet ? 32 : -32;
  const broad = junction === palace;
  const lateral =
    broad && side === 'W' && inlet ? 80 : broad ? 2 * offset : offset;
  return [
    junction.x + 64 * x + offset * y,
    junction.y + (broad ? 128 : 64) * y - lateral * x,
  ];
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
      ...(junction === mokotow &&
        side !== 'E' && {
          parallelShoulder:
            side === 'N'
              ? 'pobocze-mokotow-polnoc'
              : 'pobocze-mokotow-poludnie',
        }),
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
  const embankment = junction.id === 'rondo-E' && side === 'E';
  const boulevard = junction === palace && side === 'W';
  const id = approach(
    junction,
    side,
    embankment
      ? [
          [2208, mapHeight],
          [2208, 1104],
          [2204, 1086],
          [2194, 1070],
          [2178, 1060],
          [2160, 1056],
          end,
        ]
      : boulevard
        ? [
            [3184, mapHeight],
            [3184, 2112],
            [3196, 2064],
            [3224, 2018],
            [3264, 2000],
            end,
          ]
        : [start, end],
    priority,
    turns,
    upstream && `${upstream.id}-${opposite}`,
  );
  if (!upstream) {
    const out = linePoint(junction, side, false);
    lanes.push(
      polyline(
        `${id}-out`,
        embankment
          ? [
              out,
              [2088, 1120],
              [2109, 1124],
              [2128, 1136],
              [2140, 1155],
              [2144, 1176],
              [2144, mapHeight],
            ]
          : boulevard
            ? [
                out,
                [3200, 1856],
                [3128, 1876],
                [3064, 1928],
                [3024, 2010],
                [3024, mapHeight],
              ]
            : [out, boundary(out, side)],
        {
          role: 'exit',
          intersection: junction.id,
          side,
          speedLimit: 30,
        },
      ),
    );
  }
  for (const [i, code] of codes.entries())
    roadsideSign(junction, side, code, id, 17 + 37 * i);
}
for (const junction of junctions) {
  if (junction.kind === 'roundabout') continue;
  for (const side of sides) {
    const turns =
      junction === mokotow
        ? { N: 'straight,left', S: 'straight,right', E: 'left,right', W: '' }[
            side
          ]
        : 'straight,left,right';
    if (!turns) continue;
    const minor =
      junction === mokotow ? side === 'E' : side === 'N' || side === 'S';
    connectStreet(
      junction,
      side,
      junction.kind === 'signals'
        ? 'signal'
        : junction.kind === 'equal'
          ? 'equal'
          : minor
            ? 'minor'
            : 'main',
      turns,
      junction.kind === 'equal' || junction.kind === 'signals'
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
signs.push(
  rect('most-c13', 2160, 328, 0, 0, {
    code: 'C-13',
    affects: 'ddr-most',
    facing: 'W',
  }),
  rect('uliczka-b2', 2880, 395, 0, 0, {
    code: 'B-2',
    affects: 'uliczka-jednokierunkowa',
    facing: 'N',
  }),
  rect('starowka-wjazd', 3088, 632, 0, 0, {
    code: 'D-40',
    affects: 'starowka-d40',
    facing: 'W',
  }),
  rect('starowka-wyjazd', 3870, 652, 0, 0, {
    code: 'D-41',
    affects: 'starowka-d40',
    facing: 'E',
  }),
  rect('deptak-b9', 3552, 726, 0, 0, {
    code: 'B-9',
    affects: 'deptak',
    facing: 'W',
  }),
  rect('znak-przestawiony', 3712, 373, 0, 0, {
    code: 'A-7',
    affects: 'zamek-E',
    facing: 'E',
    displayOnly: true,
  }),
);
objectLayer('zones', zones);
objectLayer('signals', [
  ...extension.signals,
  ...sides.map((side) => {
    const [x, y] = linePoint(castle, side, true);
    const group = side === 'E' || side === 'W' ? 'ew' : 'ns';
    return rect(`zamek-${side}-s1`, x, y, 0, 0, {
      code: 'S-1',
      affects: `zamek-${side}`,
      group,
      offset_s: group === 'ew' ? 0 : 27,
      cycle_s: 54,
      green_s: 24,
      yellow_s: 2,
    });
  }),
]);
objectLayer(
  'intersections',
  junctions.map(({ id, x, y, kind }) =>
    rect(
      id,
      x - 64,
      id === palace.id ? y - 128 : y - 64,
      street,
      id === palace.id ? 256 : street,
      { kind },
    ),
  ),
);
objectLayer('lanes', lanes);
objectLayer('signs', [
  ...signs,
  ...extension.signs,
  rect('most-detektyw-c13', 2860, 327, 0, 0, {
    code: 'C-13',
    affects: 'ddr-most',
    facing: 'E',
    displayOnly: true,
  }),
  rect('stadion-skrot-b1', 1810, 2550, 0, 0, {
    code: 'B-1',
    affects: 'stadion-skrot',
    facing: 'N',
  }),
]);
objectLayer('crossing_signals', extension.crossingSignals);
objectLayer('triggers', []);
objectLayer('collectibles', []);
objectLayer('spawns', [rect('player', 550, 1145, 0, 0, { heading: 0 })]);
objectLayer('driveways', [
  rect('brama-kamienicy', 762, 271, 70, 151, { direction: 'S' }),
  rect('brama-podworko', 832, 868, 96, 274, { direction: 'S' }),
  rect('brama-targowa', 1344, 1150, 72, 112, { direction: 'N' }),
]);
objectLayer('pois', [
  ...extension.pois,
  ...(
    [
      ['praga_szkola', 420, 1540, 56, 64, Math.PI / 2],
      ['praga_zjazd_polnoc', 420, 2220, 56, 64, Math.PI / 2],
      ['praga_petla_zachod', 420, 3324, 56, 64, 0],
      ['praga_petla_wschod', 1118, 3324, 60, 60, -Math.PI / 2],
      ['praga_lacznik_srodek', 1118, 2204, 62, 60, Math.PI],
      ['praga_lacznik_zachod', 480, 2204, 60, 60, -Math.PI / 2],
      ['praga_osiedle_powrot', 480, 770, 56, 64, -Math.PI / 2],
      ['praga_warsztat_powrot', 580, 480, 56, 50, 0],
      ['starowka_lacznik', 2880, 642, 52, 52, Math.PI / 2],
      ['park_poludnie', 2880, 3360, 52, 56, -Math.PI / 2],
      ['park_powrot', 3260, 2530, 54, 58, Math.PI / 2],
      ['kolej_wschod', 4810, 2920, 56, 60, Math.PI / 2],
      ['kolej_poludnie', 4670, 3480, 56, 60, Math.PI],
      ['kolej_poludnie_przed', 3488, 3268, 56, 60, -Math.PI / 2],
      ['kolej_poludnie_za', 3488, 3140, 56, 60, -Math.PI / 2],
      ['palac_ddr_wjazd', 3248, 1808, 52, 22, 0],
      ['palac_ddr_przed', 3362, 1808, 38, 22, 0],
      ['palac_ddr_za', 3560, 1808, 56, 22, 0],
      ['palac_sygnal_przed', 3545, 1856, 36, 50, Math.PI],
      ['palac_serwis', 4660, 1808, 64, 22, 0],
      ['palac_strzalka_start', 3424, 1680, 0, 0, Math.PI / 2],
      ['palac_strzalka_przed', 3424, 1761, 42, 30, Math.PI / 2],
      ['palac_strzalka_za', 3305, 1856, 58, 50, Math.PI],
      ['palac_tram_start', 4544, 1862, 0, 0, Math.PI],
      ['palac_tram_przed', 4006, 1862, 42, 45, Math.PI],
      ['palac_tram_stop', 3960, 1862, 32, 45, Math.PI],
      ['palac_tram_meta', 3648, 1862, 60, 45, Math.PI],
      ['bulwar_polnoc', 2880, 1268, 48, 56, Math.PI / 2],
      ['bulwar_srodek', 2880, 2210, 48, 60, Math.PI / 2],
      ['bulwar_poludnie', 2880, 3500, 48, 60, Math.PI / 2],
      ['bulwar_noc_start', 2880, 3456, 48, 54, -Math.PI / 2],
      ['most_detektyw_start', 1968, 346, 0, 0, 0],
      ['most_detektyw_srodek', 2550, 347, 58, 42, 0],
      ['most_detektyw_foto', 2856, 347, 56, 48, 0],
      ['lazienki_ulewa_start', 3260, 2134, 0, 0, Math.PI / 2],
      ['fontanny_poludnie', 3260, 2530, 42, 60, Math.PI / 2],
      ['lazienki_aleja', 3261, 2764, 48, 52, -Math.PI / 2],
      ['lazienki_pawilon', 3500, 2764, 58, 48, Math.PI],
      ['lazienki_frank_start', 3260, 3290, 42, 42, -Math.PI / 2],
      ['lazienki_ciag', 3260, 3110, 42, 48, -Math.PI / 2],
      ['mokotow_kolej_start', 3424, 2144, 0, 0, Math.PI / 2],
      ['mokotow_kolej_przed', 3424, 2358, 48, 40, Math.PI / 2],
      ['mokotow_kolej_za', 3424, 2480, 56, 56, Math.PI / 2],
      ['mokotow_stacja_przed', 3658, 2976, 58, 42, Math.PI / 2],
      ['mokotow_kolej_meta', 4700, 2912, 64, 54, 0],
      ['palac_pomoc_start', 4620, 1808, 0, 0, Math.PI],
      ['palac_pomoc_miejsce', 3552, 1748, 44, 42, -Math.PI / 2],
      ['palac_ola_przed', 3488, 2088, 48, 42, -Math.PI / 2],
      ['palac_ola_za', 3488, 1825, 44, 40, -Math.PI / 2],
      ['stadion_start', 1856, 2528, 0, 0, Math.PI],
      ['stadion_trening_zachod', 1600, 1410, 56, 54, 0],
      ['stadion_trening_wschod', 2048, 1410, 56, 54, Math.PI / 2],
      ['stadion_trening_brama', 2048, 2528, 56, 54, Math.PI],
      ['stadion_wjazd', 1600, 2528, 52, 52, Math.PI / 2],
      ['stadion_mijanka', 1820, 480, 76, 42, Math.PI / 2],
      ['stadion_nawrot', 1600, 3168, 54, 48, 0],
      ['stadion_meta', 1856, 3168, 70, 54, 0],
    ] as const
  ).map(([id, x, y, w, h, heading]) =>
    rect(id, x - w / 2, y - h / 2, w, h, { heading }),
  ),

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
  rect('start_turbo', 1968, 355, 0, 0, { heading: 0 }),
  rect('przed_mostem', 2220, 324, 64, 60),
  rect('most_ddr', 2552, 324, 72, 60, { heading: 0 }),
  rect('przyczolek_mostu', 2848, 324, 104, 60),
  rect('pod_zebra', 3120, 326, 80, 54),
  rect('za_zebra', 3152, 524, 64, 44),
  rect('kolumna', 3000, 553, 85, 66),
  rect('lodziarnia', 3067, 674, 0, 0, { heading: 0 }),
  rect('kamienny_rynek', 3160, 649, 78, 58),
  rect('przed_deptakiem', 3490, 650, 80, 60),
  rect('przewodnik', 3750, 746, 70, 52),
  rect('patrol_start', 3248, 480, 0, 0, { heading: 0 }),
  rect('posterunek_oli', 3300, 456, 51, 54, { heading: 0 }),
  rect('za_skrzyzowaniem', 3540, 452, 60, 58),
  rect('foto_znak', 3678, 366, 62, 18),
  rect('podpis_zakloczacza', 3798, 316, 72, 62),
]);
objectLayer('race_routes', [
  polyline(
    'turbo-stadion',
    [
      [1856, 2528],
      [1600, 2528],
      [1600, 1410],
      [2048, 1410],
      [2048, 2528],
      [1600, 2528],
      [1600, 1410],
      [2048, 1410],
      [2048, 2528],
      [1856, 2528],
      [1856, 2740],
      [1856, 3168],
    ],
    { speed: 7.5 },
  ),
  polyline(
    'turbo-most',
    [
      [1968, 334],
      [2885, 342],
      [2914, 391],
      [2914, 540],
      [2914, 596],
      [2880, 635],
      [2880, 3500],
      [2896, 3460],
      [2896, 638],
      [3030, 580],
    ],
    { speed: 7.5 },
  ),
]);
objectLayer('traffic_routes', [
  ...extension.trafficRoutes,
  polyline(
    'pojazd-na-sygnale-praga',
    [
      [1824, 3584],
      [1824, 416],
      [0, 416],
    ],
    {
      kind: 'emergency',
      speed: 5,
      repeat_s: 120,
      event_only: true,
    },
  ),
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
    'rowerzysta-most',
    [
      [2480, 374],
      [2808, 374],
    ],
    { kind: 'cyclist', speed: 2, event_only: true },
  ),
  polyline(
    'pieszy-zamkowy',
    [
      [3195, 366],
      [3195, 543],
    ],
    { kind: 'pedestrian', speed: 1.65 },
  ),
  polyline(
    'turysci-rynek',
    [
      [3266, 727],
      [3539, 727],
    ],
    { kind: 'pedestrian', speed: 1.65, event_only: true },
  ),
  polyline(
    'spacer-deptak',
    [
      [3570, 805],
      [3875, 805],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'pieszy-bazar',
    [
      [1518, 997],
      [1518, 1182],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
]);
objectLayer('traffic_controls', [
  ...extension.trafficControls,
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
  ...extension.crossings,
  rect('zebra-pasaz', 1259, 384, 43, 128, { kind: 'pedestrian', axis: 'y' }),
  rect('zebra-bazar', 1496, 1024, 44, 128, { kind: 'pedestrian', axis: 'y' }),
  rect('zebra-targowa', 2888, 503, 52, 42, { kind: 'pedestrian', axis: 'y' }),
  rect('zebra-rynek', 3392, 704, 128, 48, { kind: 'pedestrian', axis: 'x' }),
  rect('zebra-za-zamkiem', 3678, 384, 64, 128, {
    kind: 'pedestrian',
    axis: 'y',
  }),
  rect('zebra-zamek', 3152, 384, 64, 128, { kind: 'pedestrian', axis: 'y' }),
  rect('przejazd-przy-moscie', 3392, 320, 128, 40, { kind: 'bike', axis: 'x' }),
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
  ['pylon-mostu', 2528, 519, 18, 18, 5, 0xc0cbdc],
  ['kolumna-cokol', 3068, 534, 38, 32, 1, 0xc0cbdc],
  ['kolumna-trzon', 3081, 543, 12, 13, 5, 0xf4e4ce],
  ['zamek', 3596, 252, 184, 105, 4, 0xd78b62],
  ['wieza-zamkowa', 3601, 316, 32, 38, 7, 0xb96557],
  ['lodziarnia', 2993, 717, 99, 65, 2, 0xe98b95],
  ['kamienica-rynek-1', 3205, 818, 65, 96, 3, 0xe8c39e],
  ['kamienica-rynek-2', 3275, 810, 77, 105, 4, 0x8dc6ad],
  ['kamienica-rynek-3', 3357, 828, 77, 95, 3, 0xf1a15e],
  ['kamienica-rynek-4', 3445, 814, 66, 114, 4, 0xd0a4a8],
  ['barbakan-baszta', 3762, 908, 76, 80, 4, 0xb96557],
  ['barbakan-mur', 3684, 929, 78, 45, 3, 0xdc9a73],
] as const;
objectLayer('blocks', [
  ...extension.blocks,
  rect('stadion-trybuna-poludniowa', 1632, 3232, 352, 64, {
    height: 4,
    roof: 'sand',
    wall: 'brick',
    landmarkId: 'stadion-narodowy',
  }),
  rect('stadion-trybuna-zachodnia', 1504, 2592, 48, 512, {
    height: 4,
    roof: 'stone',
    wall: 'brick',
    landmarkId: 'stadion-narodowy',
  }),
  rect('stadion-trybuna-wschodnia', 2112, 2592, 48, 512, {
    height: 4,
    roof: 'stone',
    wall: 'brick',
    landmarkId: 'stadion-narodowy',
  }),
  ...buildings.map(([id, x, y, w, h, floors, tint]) =>
    rect(id, x, y, w, h, {
      height: floors,
      tint,
      ...(id === 'zamek' || id === 'wieza-zamkowa'
        ? {
            landmarkId: 'zamek-krolewski',
            roof: id === 'zamek' ? 'tile' : 'copper',
            wall: 'plaster',
          }
        : {}),
      ...(id.startsWith('kamienica')
        ? { roof: 'tile', wall: id.endsWith('lewa') ? 'sand' : 'brick' }
        : {}),
      ...(id.startsWith('fabryka')
        ? { roof: 'felt', wall: 'brick', landmarkId: 'fabryka' }
        : {}),
    }),
  ),
]);
objectLayer('collisions', [
  ...extension.collisions,
  rect('wisla-polnoc', pragaEdge, 0, riverWest - pragaEdge, 310, {
    kind: 'wall',
  }),
  rect(
    'wisla-poludnie',
    pragaEdge,
    532,
    riverWest - pragaEdge,
    mapHeight - 532,
    { kind: 'wall' },
  ),
  ...Array.from({ length: 11 }, (_, i) => {
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
]);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', island.x - 93, island.y - 93, 186, 186, {
    road_radius: 224,
    corner_radius: 76,
  }),
]);
objectLayer('districts', [
  rect('praga', 0, 0, pragaEdge, mapHeight),
  rect('wisla', pragaEdge, 0, riverWest - pragaEdge, mapHeight),
  rect('stare-miasto', riverWest, 0, mapWidth - riverWest, 1184),
  ...extension.districts,
]);
const decorations = [
  ...extension.decorations,
  rect('pylon', 2537, 529, 0, 0, { kind: 'bridge' }),
];
objectLayer('map_decorations', decorations);
objectLayer('props', [
  ...extension.props,
  ...(
    [
      ['tree', 594, 322],
      ['tree', 824, 320],
      ['tree', 987, 303],
      ['tree', 578, 533],
      ['tree', 903, 563],
      ['tree', 1201, 308],
      ['tree', 1316, 370],
      ['tree', 1364, 348],
      ['tree', 995, 839],
      ['tree', 1224, 780],
      ['lamp', 554, 379],
      ['lamp', 805, 379],
      ['lamp', 994, 379],
      ['lamp', 1168, 518, 2],
      ['lamp', 882, 518, 2],
      ['bench', 692, 536],
      ['bike-rack', 1020, 549, 1],
      ['kiosk', 965, 546],
      ['cafe', 3100, 749],
      ['bike-rack', 3356, 735],
      ['bench', 1246, 321, 1],
      ['bin', 720, 535],
      ['bollard', 782, 369],
      ['bollard', 843, 369],
      ['shelter', 1472, 530],
      ['bin', 1505, 529],
      ['lamp', 1290, 1008],
      ['bench', 1204, 1006],
      ['bin', 1233, 1006],
      ['tree', 759, 1221],
      ['lamp', 583, 1164, 2],
      ['lamp', 720, 1011],
      ['lamp', 2204, 314],
      ['lamp', 2379, 318],
      ['lamp', 2625, 318],
      ['lamp', 2744, 516, 2],
      ['lamp', 3050, 665],
      ['lamp', 3286, 655],
      ['lamp', 3545, 702],
    ] as const
  ).map(([kind, x, y, turn = 0]) =>
    rect(`prop-${kind}-${x}-${y}`, x, y, 0, 0, { kind, turn }),
  ),
]);
decorations.push(
  rect('neon-brama', 746, 984, 0, 0, { kind: 'neon' }),
  rect('neon-warsztat', 921, 215, 0, 0, { kind: 'neon' }),
  rect('neon-bazar', 1419, 946, 0, 0, { kind: 'neon' }),
);
await write('warszawa', 9, tileTerrain(width, height, surfaces), markings, {
  duskAt,
  freeRideOnly: true,
});

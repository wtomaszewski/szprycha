import {
  roadSignalTiming,
  mainArrowTiming,
  microCityPhaseOffset,
} from './signal-timing.ts';
import { tiles } from '../src/render/artFrames.ts';
import { otherSide, sides } from '../src/rules/world/LaneGraph.ts';
import { sideVector, type Side } from '../src/rules/world/WorldModel.ts';
import { tiledMap } from './tiled-map.ts';
import { type Surface } from './tile-terrain.ts';

type Point = readonly [number, number];
type Kind = 'equal' | 'priority' | 'signals' | 'roundabout';
type Junction = { id: string; x: number; y: number; kind: Kind };
type Props = Record<string, string | number | boolean>;
export const width = 152;
export const height = 112;
export const tile = 32;
export const mapWidth = width * tile;
export const mapHeight = height * tile;
export const west = 1024;
export const centre = 2432;
const east = 4000;
export const north = 1088;
export const south = 2496;
export const columns = [west, centre, east];
const rows = [north, south];

type JunctionNames = {
  market: string;
  avenue: string;
  westSouth: string;
  centralSouth: string;
  eastSouth: string;
  westSignalStopOffset?: number;
};

export function microCityMap(names: JunctionNames) {
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

  const junctions: Junction[] = [
    { id: names.market, x: west, y: north, kind: 'priority' },
    { id: names.avenue, x: centre, y: north, kind: 'signals' },
    { id: names.westSouth, x: west, y: south, kind: 'equal' },
    { id: names.centralSouth, x: centre, y: south, kind: 'priority' },
    { id: names.eastSouth, x: east, y: south, kind: 'equal' },
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

  function drawRoads() {
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
      zone(
        `chodnik-ew-${y}-n`,
        0,
        y - 128,
        mapWidth,
        64,
        'sidewalk',
        'sidewalk',
      );
      zone(
        `chodnik-ew-${y}-s`,
        0,
        y + 64,
        mapWidth,
        64,
        'sidewalk',
        'sidewalk',
      );
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
  }

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
        ...(id === `${names.avenue}-W` &&
          names.westSignalStopOffset && {
            stopOffset_px: names.westSignalStopOffset,
          }),
        ...(id === `${names.westSouth}-S` && { parallelShoulder: 'pobocze-e' }),
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
      sign(
        code,
        id,
        side,
        x + offset * dx + 48 * dy,
        y + offset * dy - 48 * dx,
      );
    }
  }
  function mainSignal(id: string, x: number, y: number, group: 'ew' | 'ns') {
    signals.push(
      rect(`${id}-s1`, x, y, 0, 0, {
        code: 'S-1',
        affects: id,
        group: `${names.avenue}-${group}`,
        ...roadSignalTiming(group === 'ns', microCityPhaseOffset),
      }),
    );
  }
  function connectRoads() {
    for (const j of junctions)
      for (const side of sides) {
        const turns = 'straight,left,right';
        if (j.kind === 'priority') {
          const main =
            j.id === names.centralSouth ? !horizontal(side) : horizontal(side);
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
      rect(`${names.avenue}-strzalka`, 2308, 1018, 0, 0, {
        code: 'S-2',
        affects: `${names.avenue}-N`,
        group: `${names.avenue}-ns`,
        ...mainArrowTiming,
        direction: 'right',
      }),
    );
  }

  function markRoads() {
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
  }

  function waterCollisions(prefix: string) {
    const collisions: ReturnType<typeof rect>[] = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width;) {
        const start = col;
        while (col < width && surface[row * width + col] === 'water') col++;
        if (col > start)
          collisions.push(
            rect(
              `${prefix}-${row}-${start}`,
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
    return collisions;
  }

  return {
    map,
    rect,
    polyline,
    objectLayer,
    write,
    surface,
    markings,
    zones,
    lanes,
    signs,
    signals,
    zone,
    sign,
    paint,
    mark,
    network,
    ring,
    halfWidth,
    drawRoads,
    connectRoads,
    mainSignal,
    markRoads,
    waterCollisions,
  };
}

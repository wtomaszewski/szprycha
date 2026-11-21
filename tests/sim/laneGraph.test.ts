import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WorldModel } from '../../src/rules/world/WorldModel';

const source = readFileSync('maps/miasteczko.tmj', 'utf8');
interface LaneObject {
  name: string;
  x: number;
  polyline: { x: number; y: number }[];
  properties: { name: string; value: unknown }[];
}

function mapFixture() {
  const map = JSON.parse(source) as {
    layers: { name: string; objects: LaneObject[] }[];
  };
  const lanes = map.layers.find(({ name }) => name === 'lanes')!.objects;
  return { map, lanes, lane: lanes.find(({ name }) => name === 'equal-W')! };
}

describe('Tiled lane graph', () => {
  it('connects an inlet to the outgoing polylines by the allowed turns', () => {
    const world = new WorldModel(JSON.parse(source), 1.5);
    const from = world.laneGraph.approach(world.getLane('equal-W')!)!;
    expect(from.from.kind).toBe('boundary');
    expect(from.to.kind).toBe('inlet');
    expect(from.movements.map(({ maneuver, to }) => [maneuver, to.id])).toEqual(
      [
        ['straight', 'yield-W'],
        ['left', 'equal-N-out'],
        ['right', 'stop-N'],
      ],
    );
    const straight = from.movements[0]!;
    expect(straight.path.start).toBe(from.to.pos);
    expect(straight.path.end).toBe(straight.to.from.pos);
    expect(straight.to.from.kind).toBe('outlet');
    expect(world.laneGraph.entries).toContain(from);
  });

  it('follows intermediate polyline points and applies turn restrictions', () => {
    const { map, lane } = mapFixture();
    lane.properties.find(({ name }) => name === 'turns')!.value = 'straight';
    lane.polyline.splice(1, 0, { x: 150, y: -16 });
    const world = new WorldModel(map, 1.5);
    const edge = world.laneGraph.approach(world.getLane(lane.name)!)!;
    expect(edge.movements.map(({ maneuver }) => maneuver)).toEqual([
      'straight',
    ]);
    const pos = { x: 0, y: 0 };
    edge.path.place(edge.path.segments[0]!.length, pos);
    expect(pos).toEqual(edge.path.points[1]);
    expect(edge.path.length).toBeGreaterThan(384 * world.metersPerPixel);
  });

  it.each([
    [
      'repeated point',
      (lane: LaneObject) => lane.polyline.push(lane.polyline[1]!),
      /zero-length segment/,
    ],
    [
      'missed stop line',
      (lane: LaneObject) => {
        lane.polyline[1]!.x--;
      },
      /stop line/,
    ],
    [
      'unknown turn',
      (lane: LaneObject) => {
        lane.properties.find(({ name }) => name === 'turns')!.value = 'u-turn';
      },
      /invalid turns/,
    ],
    [
      'unknown upstream',
      (lane: LaneObject) =>
        lane.properties.push({ name: 'from', value: 'missing-N' }),
      /invalid upstream outlet/,
    ],
    [
      'duplicate name',
      (lane: LaneObject, lanes: LaneObject[]) => lanes.push(lane),
      /Duplicate lane id/,
    ],
    [
      'missing outlet',
      (_lane: LaneObject, lanes: LaneObject[]) =>
        lanes.splice(
          lanes.findIndex(({ name }) => name === 'equal-N-out'),
          1,
        ),
      /missing outlet/,
    ],
  ] as const)('rejects an invalid map: %s', (_name, edit, error) => {
    const { map, lane, lanes } = mapFixture();
    edit(lane, lanes);
    expect(() => new WorldModel(map, 1.5)).toThrow(error);
  });
});

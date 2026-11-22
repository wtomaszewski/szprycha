import { mkdir, writeFile } from 'node:fs/promises';
import { TILE, TILE_COLUMNS, TILE_COUNT } from '../src/render/artFrames.ts';
import type { tileTerrain } from './tile-terrain.ts';

export function tiledMap(width: number, height: number) {
  let id = 1;
  const rect = (
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    properties: Record<string, string | number | boolean> = {},
  ) => ({
    id: id++,
    name,
    type: '',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    visible: true,
    properties: Object.entries(properties).map(([name, value]) => ({
      name,
      type:
        typeof value === 'number'
          ? 'float'
          : typeof value === 'boolean'
            ? 'bool'
            : 'string',
      value,
    })),
  });
  const polyline = (
    name: string,
    points: readonly (readonly [number, number])[],
    props: Record<string, string | number | boolean>,
  ) => {
    const [x, y] = points[0]!;
    return {
      ...rect(name, x, y, 0, 0, props),
      polyline: points.map(([px, py]) => ({ x: px - x, y: py - y })),
    };
  };
  const layers: unknown[] = [];
  const tileLayer = (id: number, name: string, data: number[]) => ({
    id,
    name,
    type: 'tilelayer',
    width,
    height,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data,
  });
  function objectLayer(name: string, objects: unknown[]) {
    layers.push({
      id: layers.length + 3,
      name,
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects,
    });
  }

  async function write(
    name: string,
    trafficCars: number,
    terrain: ReturnType<typeof tileTerrain>,
    markings: number[],
    duskAt?: number,
  ) {
    const mapLayers = [
      tileLayer(1, 'ground', terrain.ground),
      tileLayer(2, 'markings', markings),
      ...layers,
      tileLayer(layers.length + 3, 'verge', terrain.verge),
      tileLayer(layers.length + 4, 'curb', terrain.curb),
    ];
    const mapProperties = [
      { name: 'trafficCars', type: 'int', value: trafficCars },
    ];
    if (duskAt !== undefined)
      mapProperties.push({ name: 'dusk_at_s', type: 'float', value: duskAt });
    await mkdir('maps', { recursive: true });
    await writeFile(
      `maps/${name}.tmj`,
      JSON.stringify(
        {
          type: 'map',
          version: '1.10',
          tiledversion: '1.11.2',
          orientation: 'orthogonal',
          renderorder: 'right-down',
          infinite: false,
          width,
          height,
          tilewidth: TILE,
          tileheight: TILE,
          properties: mapProperties,
          nextlayerid: mapLayers.length + 1,
          nextobjectid: id,
          layers: mapLayers,
          tilesets: [
            {
              firstgid: 1,
              name: 'training',
              tilewidth: TILE,
              tileheight: TILE,
              tilecount: TILE_COUNT,
              columns: TILE_COLUMNS,
              image: '../assets/generated/tiles.png',
              imagewidth: TILE * TILE_COLUMNS,
              imageheight: (TILE_COUNT / TILE_COLUMNS) * TILE,
              margin: 0,
              spacing: 0,
            },
          ],
        },
        null,
        2,
      ) + '\n',
    );
  }
  return { rect, polyline, objectLayer, write };
}

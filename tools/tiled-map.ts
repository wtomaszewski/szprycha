import { mkdir, writeFile } from 'node:fs/promises';

export function tiledMap(
  width: number,
  height: number,
  ground: number[],
  markings: number[],
) {
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
  const layers: unknown[] = [
    {
      id: 1,
      name: 'ground',
      type: 'tilelayer',
      width,
      height,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      data: ground,
    },
    {
      id: 2,
      name: 'markings',
      type: 'tilelayer',
      width,
      height,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      data: markings,
    },
  ];
  function objectLayer(name: string, objects: unknown[]) {
    layers.push({
      id: layers.length + 1,
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
    duskAt?: number,
    tileset = { name: 'training', file: 'tiles.png', count: 8 },
  ) {
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
          tilewidth: 32,
          tileheight: 32,
          properties: mapProperties,
          nextlayerid: layers.length + 1,
          nextobjectid: id,
          layers,
          tilesets: [
            {
              firstgid: 1,
              name: tileset.name,
              tilewidth: 32,
              tileheight: 32,
              tilecount: tileset.count,
              columns: tileset.count,
              image: `../assets/generated/${tileset.file}`,
              imagewidth: tileset.count * 32,
              imageheight: 32,
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

import type { Cameras, GameObjects, Scene, Types } from 'phaser';
import { propKinds, type PropKind } from './artFrames';
import { projectionFactor } from './projection';
import { shadowColor, shadowRise } from './shadows';

const height: Record<PropKind, number> = {
  tree: 4,
  lamp: 3,
  shelter: 2,
  bin: 1,
  bollard: 0,
  bench: 0,
  'bike-rack': 0,
  cafe: 1,
  kiosk: 2,
};

type Prop = {
  x: number;
  y: number;
  kind: PropKind;
  frame: number;
  turn: number;
};

export function readProps(
  objects: readonly Types.Tilemaps.TiledObject[],
): Prop[] {
  return objects.flatMap((obj) => {
    const kind = obj.properties?.find(
      ({ name }: { name: string }) => name === 'kind',
    )?.value as PropKind;
    const frame = propKinds.indexOf(kind);
    if (frame < 0) return [];
    const turn = Number(
      obj.properties?.find(({ name }: { name: string }) => name === 'turn')
        ?.value ?? 0,
    );
    return [{ x: obj.x ?? 0, y: obj.y ?? 0, kind, frame, turn }];
  });
}

const footprint: Record<PropKind, readonly [number, number]> = {
  tree: [19, 13],
  shelter: [20, 9],
  bench: [15, 5],
  lamp: [5, 4],
  bin: [6, 5],
  bollard: [4, 4],
  'bike-rack': [18, 12],
  cafe: [18, 14],
  kiosk: [18, 13],
};

/** Shadows and footings belong to the baked ground; caps slide with the camera. */
export function paintPropShadows(
  ctx: CanvasRenderingContext2D,
  props: readonly Prop[],
  left: number,
  top: number,
  width: number,
  chunkHeight: number,
) {
  for (const { x, y, kind, turn } of props) {
    const [wide, tall] = footprint[kind];
    const rotated = turn % 2 !== 0;
    const rx = rotated ? tall : wide;
    const ry = rotated ? wide : tall;
    const shift = height[kind] * 3 + 2;
    const rise = shadowRise(shift);
    const sx = x + shift;
    const sy = y + rise;
    if (
      x - rx - 1 > left + width ||
      y - ry > top + chunkHeight ||
      sx + rx + 1 < left ||
      sy + ry < top
    )
      continue;

    for (const [outer, alpha] of [
      [1, 0.12],
      [-1, 0.2],
    ] as const) {
      ctx.fillStyle = shadowColor(alpha);
      for (let row = -ry; row <= ry; row++) {
        const span =
          Math.round(rx * Math.sqrt(1 - (row / (ry + 1)) ** 2)) + outer;
        ctx.fillRect(sx - span, sy + row, span * 2, 1);
      }
    }
    if (height[kind] >= 2) {
      ctx.fillStyle = kind === 'tree' ? '#5a3a2e' : '#333c57';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
}

export class CityProps {
  private readonly items;
  readonly lamps: readonly GameObjects.Image[];
  constructor(scene: Scene, props: readonly Prop[]) {
    this.items = props.map((prop) => ({
      ...prop,
      cap: scene.add
        .image(prop.x, prop.y, 'props', prop.frame)
        .setRotation((prop.turn * Math.PI) / 2)
        .setDepth(5),
      stem:
        height[prop.kind] >= 2
          ? scene.add
              .rectangle(
                prop.x,
                prop.y,
                2,
                2,
                prop.kind === 'tree' ? 0x5a3a2e : 0x333c57,
              )
              .setOrigin(0, 0.5)
              .setDepth(4)
          : undefined,
    }));
    this.lamps = this.items
      .filter(({ kind }) => kind === 'lamp')
      .map(({ cap }) => cap);
  }
  update(camera: Cameras.Scene2D.Camera, lite: boolean, cameraHeight: number) {
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    const halfW = camera.width / (2 * camera.zoom) + 70;
    const halfH = camera.height / (2 * camera.zoom) + 70;
    for (const item of this.items) {
      const { x, y, cap, stem, kind } = item;
      const visible = Math.abs(x - cx) < halfW && Math.abs(y - cy) < halfH;
      if (cap.visible !== visible) cap.setVisible(visible);
      if (!visible) {
        if (stem?.visible) stem.setVisible(false);
        continue;
      }
      const factor = lite ? 0 : projectionFactor(height[kind], cameraHeight);
      const dx = Math.round((x - cx) * factor);
      const dy = Math.round((y - cy) * factor);
      if (cap.x !== x + dx || cap.y !== y + dy) cap.setPosition(x + dx, y + dy);
      if (stem) {
        const length = Math.hypot(dx, dy);
        if (length > 3)
          stem
            .setVisible(true)
            .setRotation(Math.atan2(dy, dx))
            .setScale(length / 2, 1);
        else if (stem.visible) stem.setVisible(false);
      }
    }
  }
}

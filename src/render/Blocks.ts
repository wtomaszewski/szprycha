import {
  BlendModes,
  GameObjects,
  type Scene,
  type Cameras,
  type Renderer,
} from 'phaser';
import { artHash } from './artFrames';
import {
  roofTexture,
  visitRoofDetails,
  wallEmissionTexture,
  wallTexture,
} from './BlockArt';
import { sceneDepth } from './effectFrames';
import { CAMERA_HEIGHT_PX, roofOffset, type Block } from './projection';
export type { Block } from './projection';

// Daylight and emissive façades use the same projected quad.
class WallFace extends GameObjects.Image {
  constructor(
    scene: Scene,
    key: string,
    readonly transform: GameObjects.Components.TransformMatrix,
  ) {
    super(scene, 0, 0, key);
    this.setOrigin(0);
    scene.add.existing(this);
  }

  renderCanvas(
    renderer: Renderer.Canvas.CanvasRenderer,
    src: WallFace,
    camera: Cameras.Scene2D.Camera,
  ) {
    camera.addToRenderList(src);
    renderer.batchSprite(src, src.frame, camera, src.transform);
  }

  renderWebGL(
    _renderer: Renderer.WebGL.WebGLRenderer,
    src: WallFace,
    camera: Cameras.Scene2D.Camera,
  ) {
    camera.addToRenderList(src);
    const pipeline = src.pipeline as Renderer.WebGL.Pipelines.MultiPipeline;
    pipeline.batchSprite(src, camera, src.transform);
  }
}

class Wall extends WallFace {
  private emission?: WallFace;
  private readonly createEmission: () => WallFace;
  private readonly lightTexture: string;
  private readonly darkTexture: string;

  constructor(
    scene: Scene,
    key: string,
    block: Block,
    hash: number,
    vertical: boolean,
    floors: number,
    ground: boolean,
  ) {
    const width = vertical ? block.height : block.width;
    const light = wallTexture(
      scene,
      key + '-lit',
      block,
      hash,
      width,
      floors,
      ground,
      true,
    );
    const dark = wallTexture(
      scene,
      key + '-shade',
      block,
      hash,
      width,
      floors,
      ground,
      false,
    );
    super(scene, light.key, new GameObjects.Components.TransformMatrix());
    this.lightTexture = light.key;
    this.darkTexture = dark.key;
    this.createEmission = () =>
      new WallFace(
        scene,
        wallEmissionTexture(
          scene,
          key + '-night',
          block,
          hash,
          width,
          floors,
          ground,
        ).key,
        this.transform,
      )
        .setDepth(sceneDepth.light)
        .setBlendMode(BlendModes.ADD);
  }

  showEmission(visible: boolean) {
    if (!visible && !this.emission) return;
    const emission = (this.emission ??= this.createEmission());
    if (emission.visible !== visible) emission.setVisible(visible);
    if (visible && emission.alpha !== this.alpha) emission.setAlpha(this.alpha);
  }

  project(
    x: number,
    y: number,
    dx: number,
    dy: number,
    vertical: boolean,
    sunny: boolean,
  ) {
    const texture = sunny ? this.lightTexture : this.darkTexture;
    if (this.texture.key !== texture) this.setTexture(texture);
    this.transform.setTransform(
      vertical ? 0 : 1,
      vertical ? 1 : 0,
      -dx / this.height,
      -dy / this.height,
      x,
      y,
    );
  }
}

export class Blocks {
  cameraHeight = CAMERA_HEIGHT_PX;
  private readonly items;
  readonly chimneys: { roof: GameObjects.Image; x: number; y: number }[] = [];
  private night = false;

  constructor(scene: Scene, blocks: Block[], mapId: string) {
    const landmarkTiers = new Map<string, Block>();
    this.items = [...blocks]
      .sort((a, b) => a.floors - b.floors)
      .map((block, i) => {
        const support = block.landmarkId
          ? landmarkTiers.get(block.landmarkId)
          : undefined;
        if (block.landmarkId) landmarkTiers.set(block.landmarkId, block);
        let id = 0;
        for (const ch of block.id ?? String(i))
          id = Math.imul(id, 31) + ch.charCodeAt(0);
        const hash = artHash(id, 30);
        const key = `block-${mapId}-${i}`;
        const depth = 100 + i * 3;
        const floors = Math.max(
          1,
          Math.round(block.floors - (support?.floors ?? 0)),
        );
        const roof = scene.add
          .image(
            block.x,
            block.y,
            roofTexture(scene, key + '-roof', block, hash),
          )
          .setOrigin(0)
          .setDepth(depth + 2)
          .setVisible(false);
        visitRoofDetails(block, hash, (kind, x, y) => {
          if (kind === 0) this.chimneys.push({ roof, x: x + 13, y: y + 9 });
        });
        return {
          block,
          support,
          horizontal: new Wall(
            scene,
            key + '-horizontal',
            block,
            hash,
            false,
            floors,
            !support,
          ).setDepth(depth),
          vertical: new Wall(
            scene,
            key + '-vertical',
            block,
            hash,
            true,
            floors,
            !support,
          ).setDepth(depth + 1),
          roof,
          offset: { x: 0, y: 0 },
          base: { x: 0, y: 0 },
          dx: NaN,
          dy: NaN,
          baseX: NaN,
          baseY: NaN,
          visible: false,
          alpha: 1,
        };
      });
  }

  update(
    camera: Cameras.Scene2D.Camera,
    lite: boolean,
    playerX: number,
    playerY: number,
    night = this.night,
  ) {
    const updateEmission = night || this.night;
    this.night = night;
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const left = cx - halfWidth;
    const right = cx + halfWidth;
    const top = cy - halfHeight;
    const bottom = cy + halfHeight;
    for (const item of this.items) {
      const { block: b, offset, base, horizontal, vertical, roof } = item;
      roofOffset(b, cx, cy, lite, this.cameraHeight, offset);
      if (item.support)
        roofOffset(item.support, cx, cy, lite, this.cameraHeight, base);
      const dx = offset.x - base.x;
      const dy = offset.y - base.y;
      const margin = Math.max(
        Math.abs(offset.x),
        Math.abs(offset.y),
        Math.abs(base.x),
        Math.abs(base.y),
      );
      const visible =
        b.x + b.width + margin > left &&
        b.x - margin < right &&
        b.y + b.height + margin > top &&
        b.y - margin < bottom;
      if (visible !== item.visible) {
        item.visible = visible;
        roof.setVisible(visible);
      }
      const showX = visible && dx !== 0;
      const showY = visible && dy !== 0;
      if (horizontal.visible !== showY) horizontal.setVisible(showY);
      if (vertical.visible !== showX) vertical.setVisible(showX);
      if (!visible) {
        if (updateEmission) {
          horizontal.showEmission(false);
          vertical.showEmission(false);
        }
        continue;
      }
      const alpha =
        playerX > b.x + offset.x - 16 &&
        playerX < b.x + b.width + offset.x + 16 &&
        playerY > b.y + offset.y - 16 &&
        playerY < b.y + b.height + offset.y + 16
          ? 0.35
          : 1;
      if (item.alpha !== alpha) {
        item.alpha = alpha;
        roof.setAlpha(alpha);
        horizontal.setAlpha(alpha);
        vertical.setAlpha(alpha);
      }
      if (updateEmission) {
        horizontal.showEmission(night && showY);
        vertical.showEmission(night && showX);
      }
      if (
        item.dx === offset.x &&
        item.dy === offset.y &&
        item.baseX === base.x &&
        item.baseY === base.y
      )
        continue;
      item.dx = offset.x;
      item.dy = offset.y;
      item.baseX = base.x;
      item.baseY = base.y;
      const x = b.x + offset.x;
      const y = b.y + offset.y;
      if (dx !== 0)
        vertical.project(x + (dx > 0 ? 0 : b.width), y, dx, dy, true, dx > 0);
      if (dy !== 0)
        horizontal.project(
          x,
          y + (dy > 0 ? 0 : b.height),
          dx,
          dy,
          false,
          dy > 0,
        );
      roof.setPosition(x, y);
    }
  }
}

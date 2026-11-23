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
import type { WorldModel } from '../rules/world/WorldModel';
import {
  CAMERA_HEIGHT_PX,
  blockOpacity,
  blockRoadBounds,
  roofOffset,
  supportingTier,
  type Block,
} from './projection';
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
  private readonly roads;
  private readonly mapWidth;
  private readonly mapHeight;
  private readonly silhouette = { left: 0, right: 0, top: 0, bottom: 0 };
  readonly chimneys: { roof: GameObjects.Image; x: number; y: number }[] = [];
  private night = false;

  constructor(scene: Scene, blocks: Block[], mapId: string, world: WorldModel) {
    const scale = 1 / world.metersPerPixel;
    this.roads = world.zones
      .filter(
        ({ kind }) =>
          kind === 'roadway' ||
          kind === 'bike_path' ||
          kind === 'bike_lane' ||
          kind === 'shared_path' ||
          kind === 'shoulder',
      )
      .map(({ x, y, width, height }) => ({
        left: x * scale,
        top: y * scale,
        right: (x + width) * scale,
        bottom: (y + height) * scale,
      }));
    this.mapWidth = world.width * scale;
    this.mapHeight = world.height * scale;
    const landmarkTiers = new Map<string, Block[]>();
    this.items = [...blocks]
      .sort((a, b) => a.floors - b.floors)
      .map((block, i) => {
        let support: Block | undefined;
        if (block.landmarkId) {
          const tiers = landmarkTiers.get(block.landmarkId) ?? [];
          support = supportingTier(block, tiers);
          tiers.push(block);
          landmarkTiers.set(block.landmarkId, tiers);
        }
        const bounds = blockRoadBounds(
          block,
          support,
          this.mapWidth,
          this.mapHeight,
        );
        const nearbyRoads = this.roads.filter(
          (road) =>
            road.left < bounds.right &&
            road.right > bounds.left &&
            road.top < bounds.bottom &&
            road.bottom > bounds.top,
        );
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
          nearbyRoads,
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
    const zoom = camera.zoom;
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    // An oversized viewport can put the camera center beyond the map.
    const withinMap =
      cx >= 0 && cx <= this.mapWidth && cy >= 0 && cy <= this.mapHeight;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const viewX = camera.clampX(camera.scrollX) + camera.width / 2;
    const viewY = camera.clampY(camera.scrollY) + camera.height / 2;
    // Leave room for rounding at the edge of the viewport.
    const left = viewX - halfWidth - 1;
    const right = viewX + halfWidth + 1;
    const top = viewY - halfHeight - 1;
    const bottom = viewY + halfHeight + 1;
    for (const item of this.items) {
      const { block: b, offset, base, horizontal, vertical, roof } = item;
      roofOffset(b, cx, cy, lite, this.cameraHeight, offset, zoom);
      if (item.support)
        roofOffset(item.support, cx, cy, lite, this.cameraHeight, base, zoom);
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
      const x = b.x + offset.x;
      const y = b.y + offset.y;
      const wallX = x + (dx > 0 ? 0 : b.width);
      const wallY = y + (dy > 0 ? 0 : b.height);
      // Each wall spans the shifted roof edge and its corresponding base edge.
      // A visible block can still have an entirely offscreen façade.
      const showX =
        visible &&
        dx !== 0 &&
        wallX + Math.max(0, -dx) > left &&
        wallX + Math.min(0, -dx) < right &&
        y + b.height + Math.max(0, -dy) > top &&
        y + Math.min(0, -dy) < bottom;
      const showY =
        visible &&
        dy !== 0 &&
        x + b.width + Math.max(0, -dx) > left &&
        x + Math.min(0, -dx) < right &&
        wallY + Math.max(0, -dy) > top &&
        wallY + Math.min(0, -dy) < bottom;
      if (horizontal.visible !== showY) horizontal.setVisible(showY);
      if (vertical.visible !== showX) vertical.setVisible(showX);
      if (!visible) {
        if (updateEmission) {
          horizontal.showEmission(false);
          vertical.showEmission(false);
        }
        continue;
      }
      const silhouette = this.silhouette;
      silhouette.left = x - Math.max(0, dx);
      silhouette.right = x + b.width - Math.min(0, dx);
      silhouette.top = y - Math.max(0, dy);
      silhouette.bottom = y + b.height - Math.min(0, dy);
      const alpha = blockOpacity(
        playerX,
        playerY,
        silhouette,
        withinMap ? item.nearbyRoads : this.roads,
      );
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
      if (dx !== 0) vertical.project(wallX, y, dx, dy, true, dx > 0);
      if (dy !== 0) horizontal.project(x, wallY, dx, dy, false, dy > 0);
      roof.setPosition(x, y);
    }
  }
}

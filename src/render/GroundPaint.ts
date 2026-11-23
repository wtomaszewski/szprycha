import type { Types } from 'phaser';
import type { Box, WorldModel } from '../rules/world/WorldModel';
import { artHash, TILE, TILE_COLUMNS, tiles } from './artFrames';

const quarterTurn = Math.PI / 2;
const arrowByTurns: Readonly<Record<string, number>> = {
  straight: tiles.arrowStraight,
  left: tiles.arrowLeft,
  right: tiles.arrowRight,
  'left,straight': tiles.arrowStraightLeft,
  'right,straight': tiles.arrowStraightRight,
  'left,right': tiles.arrowLeftRight,
};

/** Draw a generated tile directly from the atlas, without resampling. */
export function stamp(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  gid: number,
  x: number,
  y: number,
) {
  ctx.drawImage(
    source,
    ((gid - 1) % TILE_COLUMNS) * TILE,
    Math.floor((gid - 1) / TILE_COLUMNS) * TILE,
    TILE,
    TILE,
    x,
    y,
    TILE,
    TILE,
  );
}

/** Static surface paint for markings whose bounds come from semantic objects. */
export function paintRoad(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  world: WorldModel,
  islands: readonly Types.Tilemaps.TiledObject[],
  curbs: readonly Types.Tilemaps.TiledObject[],
  curbAt: ((x: number, y: number, side: number) => boolean) | undefined,
  snow: boolean,
  chunk: Pick<Box, 'x' | 'y' | 'width' | 'height'>,
) {
  const scale = 1 / world.metersPerPixel;
  const overlaps = (x: number, y: number, w: number, h: number, padding = 0) =>
    x - padding < chunk.x + chunk.width &&
    x + w + padding > chunk.x &&
    y - padding < chunk.y + chunk.height &&
    y + h + padding > chunk.y;
  const texture = (gid: number, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let dy = 0; dy < h; dy += TILE)
      for (let dx = 0; dx < w; dx += TILE) {
        const variant =
          gid === tiles.bike
            ? tiles.bikeVariants[artHash(x + dx, y + dy) & 3]!
            : gid;
        stamp(ctx, source, variant, x + dx, y + dy);
      }
    ctx.restore();
  };
  for (const { x = 0, y = 0, width = 0, height = 0, properties } of islands) {
    const road = Number(
      properties?.find(({ name }: { name: string }) => name === 'road_radius')
        ?.value ?? 0,
    );
    const corner = Number(
      properties?.find(({ name }: { name: string }) => name === 'corner_radius')
        ?.value ?? 0,
    );
    const cx = x + width / 2;
    const cy = y + height / 2;
    const radius = Math.max(road + corner + 3, 36);
    if (
      !overlaps(x, y, width, height) &&
      !(road > 0 && overlaps(cx - radius, cy - radius, 2 * radius, 2 * radius))
    )
      continue;
    if (road > 0 && corner > 0) {
      for (const dx of [-1, 1])
        for (const dy of [-1, 1]) {
          ctx.save();
          ctx.translate(cx + dx * road, cy + dy * road);
          ctx.scale(-dx, -dy);
          ctx.beginPath();
          for (let row = 0; row < corner; row++) {
            const w = Math.round(
              corner - Math.sqrt(corner ** 2 - (corner - row - 0.5) ** 2),
            );
            if (w) ctx.rect(0, row, w, 1);
          }
          ctx.save();
          ctx.clip();
          texture(
            snow ? tiles.snowGrass[0] : tiles.grass,
            0,
            0,
            corner,
            corner,
          );
          ctx.restore();
          ctx.fillStyle = '#94b0c2';
          for (let row = 0; row < corner; row++) {
            const w = Math.round(
              corner - Math.sqrt(corner ** 2 - (corner - row - 0.5) ** 2),
            );
            if (w) ctx.fillRect(w - 1, row, 3, 1);
          }
          ctx.restore();
        }
    }
    // Integer scanlines keep the circular curb crisp at logical resolution.
    for (let row = 0; row < height; row++) {
      const inset = Math.ceil(
        (width / 2) *
          (1 - Math.sqrt(1 - ((2 * (row + 0.5)) / height - 1) ** 2)),
      );
      ctx.fillStyle = '#c0cbdc';
      ctx.fillRect(x + inset, y + row, width - inset * 2, 1);
    }
    ctx.save();
    ctx.beginPath();
    for (let row = 4; row < height - 4; row++) {
      const assetWidth = width - 8;
      const inset = Math.ceil(
        (assetWidth / 2) *
          (1 - Math.sqrt(1 - ((2 * (row - 3.5)) / (height - 8) - 1) ** 2)),
      );
      ctx.rect(x + 4 + inset, y + row, assetWidth - inset * 2, 1);
    }
    ctx.clip();
    texture(snow ? tiles.snowGrass[0] : tiles.grass, x, y, width, height);
    ctx.restore();
    if (road > 0) {
      ctx.fillStyle = '#566c86';
      ctx.fillRect(x + width / 2 - 36, y + height / 2 - 36, 72, 72);
      ctx.fillStyle = '#c0cbdc';
      ctx.fillRect(x + width / 2 - 34, y + height / 2 - 34, 68, 68);
    }
  }
  if (!curbAt) {
    ctx.fillStyle = '#c0cbdc';
    for (const { x = 0, y = 0, width = 0, height = 0, properties } of curbs)
      if (
        overlaps(x, y, width, height) &&
        !properties?.some(
          ({ name, value }: { name: string; value: unknown }) =>
            name === 'kind' && value === 'wall',
        )
      )
        ctx.fillRect(x, y, width, height);
  }
  for (const zone of world.zones) {
    if (zone.kind !== 'bike_path' && zone.kind !== 'bike_lane') continue;
    const x = Math.round(zone.x * scale);
    const y = Math.round(zone.y * scale);
    const w = Math.round(zone.width * scale);
    const h = Math.round(zone.height * scale);
    if (!overlaps(x, y, w, h, TILE)) continue;
    texture(tiles.bike, x, y, w, h);
    const vertical = h > w;
    const length = vertical ? h : w;
    const direction = zone.direction;
    const angle =
      direction === 'E'
        ? quarterTurn
        : direction === 'S'
          ? Math.PI
          : direction === 'W'
            ? -quarterTurn
            : 0;
    for (let i = 40; i + 16 < length; i += 96) {
      const px = x + (vertical ? Math.floor(w / 2) : i);
      const py = y + (vertical ? i : Math.floor(h / 2));
      if (
        world.crossings.some(
          (c) =>
            px + 14 > c.x * scale &&
            px - 14 < (c.x + c.width) * scale &&
            py + 14 > c.y * scale &&
            py - 14 < (c.y + c.height) * scale,
        )
      )
        continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      if (zone.kind === 'bike_lane') {
        const u = ((tiles.bicycle - 1) % TILE_COLUMNS) * TILE;
        const v = Math.floor((tiles.bicycle - 1) / TILE_COLUMNS) * TILE;
        ctx.drawImage(source, u, v, TILE, TILE, -10, -11, 20, 20);
      } else stamp(ctx, source, tiles.bicycle, -16, -17);
      ctx.restore();
    }
    if (zone.kind === 'bike_lane') {
      ctx.fillStyle = '#f4f4f4';
      for (let i = 1; i < length; i += 24) {
        const dash = Math.min(12, length - i);
        if (vertical)
          ctx.fillRect(direction === 'N' ? x : x + w - 2, y + i, 2, dash);
        else ctx.fillRect(x + i, direction === 'E' ? y : y + h - 2, dash, 2);
      }
    }
  }
  for (const route of world.trafficRoutes) {
    if (route.kind !== 'tram') continue;
    for (const { start, end } of route.path.segments) {
      const x = Math.round(start.x * scale);
      const y = Math.round(start.y * scale);
      const dx = Math.round(end.x * scale) - x;
      const dy = Math.round(end.y * scale) - y;
      if (
        !overlaps(
          x + Math.min(dx, 0),
          y + Math.min(dy, 0),
          Math.abs(dx),
          Math.abs(dy),
          TILE,
        )
      )
        continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      texture(tiles.rails, 0, -16, Math.ceil(Math.hypot(dx, dy)), 32);
      ctx.restore();
    }
  }
  for (const drive of world.driveways) {
    const x = Math.round(drive.x * scale);
    const y = Math.round(drive.y * scale);
    const w = Math.round(drive.width * scale);
    const h = Math.round(drive.height * scale);
    if (overlaps(x, y, w, h)) texture(tiles.asphalt, x, y, w, h);
  }

  const crossings = [...world.crossings].sort(
    (a, b) => Number(a.kind === 'pedestrian') - Number(b.kind === 'pedestrian'),
  );
  for (const crossing of crossings) {
    const x = Math.round(crossing.x * scale);
    const y = Math.round(crossing.y * scale);
    const width = Math.round(crossing.width * scale);
    const height = Math.round(crossing.height * scale);
    if (!overlaps(x, y, width, height, TILE)) continue;
    if (crossing.kind === 'rail') {
      texture(tiles.asphalt, x, y, width, height);
      texture(tiles.rails, x, y + Math.floor((height - TILE) / 2), width, TILE);
      continue;
    }
    // Local y follows the crossing. P-10 bars run across it, and P-11
    // has two rows of square paint blocks along its sides.
    const vertical = crossing.axis === 'y';
    const w = vertical ? width : height;
    const h = vertical ? height : width;
    ctx.save();
    ctx.translate(x, vertical ? y : y + height);
    if (!vertical) ctx.rotate(-quarterTurn);
    if (crossing.kind === 'bike') texture(tiles.bike, 0, 0, w, h);
    const gid = crossing.kind === 'bike' ? tiles.bikeCrossing : tiles.zebra;
    const u = ((gid - 1) % TILE_COLUMNS) * TILE;
    const v = Math.floor((gid - 1) / TILE_COLUMNS) * TILE;
    for (let i = 0; i < h; i += TILE) {
      const length = Math.min(TILE, h - i);
      if (crossing.kind === 'pedestrian')
        ctx.drawImage(source, u, v, TILE, length, 0, i, w, length);
      else {
        ctx.drawImage(source, u, v, 5, length, 0, i, 5, length);
        ctx.drawImage(source, u + 27, v, 5, length, w - 5, i, 5, length);
      }
    }
    // Crossing endpoints at the road boundary replace only the raised curb lip.
    if (curbAt && h >= 2 * TILE && w <= 2 * TILE) {
      const rampU = ((tiles.ramp - 1) % TILE_COLUMNS) * TILE;
      const rampV = Math.floor((tiles.ramp - 1) / TILE_COLUMNS) * TILE;
      const ramp = (at: number) =>
        ctx.drawImage(source, rampU, rampV, TILE, 6, 0, at, w, 6);
      const start = vertical
        ? curbAt(x + w / 2, y - 1, 4)
        : curbAt(x - 1, y + w / 2, 2);
      const end = vertical
        ? curbAt(x + w / 2, y + h, 1)
        : curbAt(x + h, y + w / 2, 8);
      if (start) {
        ctx.save();
        ctx.scale(1, -1);
        ramp(0);
        ctx.restore();
      }
      if (end) ramp(h);
    }
    ctx.restore();
  }

  for (const lane of world.lanes) {
    const x = Math.round(lane.end.x * scale);
    const y = Math.round(lane.end.y * scale);
    const halfWidth = Math.floor(Math.min(45, (lane.width * scale) / 2 - 3));
    if (halfWidth < 1 || !overlaps(x, y, 0, 0, 72)) continue;
    const angle = Math.atan2(lane.forward.y, lane.forward.x) + quarterTurn;
    if (lane.stopSign || lane.mainSignal) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const yieldSign = lane.stopSign?.code === 'A-7';
      texture(
        yieldSign ? tiles.yield : tiles.stop,
        -halfWidth,
        -16,
        2 * halfWidth,
        TILE,
      );
      if (lane.stopOffset) {
        ctx.translate(0, lane.stopOffset * scale);
        texture(tiles.stop, -halfWidth, -16, 2 * halfWidth, TILE);
      }
      ctx.restore();
    }
    if (lane.type !== 'car' || lane.length * scale < 84 || !lane.turns)
      continue;
    const arrow =
      arrowByTurns[
        lane.turns
          .split(',')
          .map((turn) => turn.trim())
          .sort()
          .join(',')
      ];
    if (!arrow || lane.stopOffset) continue;
    ctx.save();
    ctx.translate(
      Math.round(x - lane.forward.x * 47),
      Math.round(y - lane.forward.y * 47),
    );
    ctx.rotate(angle);
    stamp(ctx, source, arrow, -16, -16);
    ctx.restore();
  }
}

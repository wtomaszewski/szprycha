export interface Block {
  id?: string;
  roof?: string;
  wall?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  landmarkId?: string;
}

export const FLOOR_PX = 12;
export const CAMERA_HEIGHT_PX = 1100;
export const MAX_FACTOR = 0.35;

export function projectionFactor(
  floors: number,
  cameraHeight = CAMERA_HEIGHT_PX,
) {
  return Math.min(MAX_FACTOR, (Math.max(0, floors) * FLOOR_PX) / cameraHeight);
}

export function roofOffset(
  block: Block,
  cx: number,
  cy: number,
  lite = false,
  cameraHeight = CAMERA_HEIGHT_PX,
  out = { x: 0, y: 0 },
  zoom = 1,
) {
  const factor = projectionFactor(block.floors, cameraHeight);
  // Move the projected texture in whole canvas pixels at the current zoom.
  out.x = lite
    ? 0
    : Math.round((block.x + block.width / 2 - cx) * factor * zoom) / zoom + 0;
  out.y = lite
    ? -Math.round(block.floors * 4 * zoom) / zoom
    : Math.round((block.y + block.height / 2 - cy) * factor * zoom) / zoom + 0;
  return out;
}

type Bounds = { left: number; top: number; right: number; bottom: number };

function distance(x: number, y: number, { left, top, right, bottom }: Bounds) {
  return Math.max(left - x, x - right, top - y, y - bottom, 0);
}

function smoothstep(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function blockOpacity(
  riderX: number,
  riderY: number,
  silhouette: Bounds,
  roads: readonly Bounds[],
) {
  const distanceToBlock = distance(riderX, riderY, silhouette);
  if (distanceToBlock >= 160) return 1;
  let fade = 1 - smoothstep(distanceToBlock, 12, 40);
  for (let i = 0; fade < 1 && i < roads.length; i++) {
    const road = roads[i]!;
    const left = Math.max(silhouette.left, road.left);
    const top = Math.max(silhouette.top, road.top);
    const right = Math.min(silhouette.right, road.right);
    const bottom = Math.min(silhouette.bottom, road.bottom);
    const overlap = Math.min(right - left, bottom - top);
    if (overlap <= 0) continue;
    const distanceToRoad = Math.max(
      left - riderX,
      riderX - right,
      top - riderY,
      riderY - bottom,
      0,
    );
    // Fade the obstruction as it extends into the nearby road, including on approach.
    fade = Math.max(
      fade,
      smoothstep(overlap, 0, 16) * (1 - smoothstep(distanceToRoad, 64, 160)),
    );
  }
  return 1 - 0.72 * fade;
}

export function supportingTier(block: Block, lowerTiers: readonly Block[]) {
  for (let i = lowerTiers.length - 1; i >= 0; i--) {
    const tier = lowerTiers[i]!;
    if (
      tier.floors < block.floors &&
      tier.x <= block.x &&
      tier.y <= block.y &&
      tier.x + tier.width >= block.x + block.width &&
      tier.y + tier.height >= block.y + block.height
    )
      return tier;
  }
  return undefined;
}

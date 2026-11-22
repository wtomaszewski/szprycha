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
) {
  const factor = projectionFactor(block.floors, cameraHeight);
  out.x = lite ? 0 : Math.round((block.x + block.width / 2 - cx) * factor) + 0;
  out.y = lite
    ? -Math.round(block.floors * 4)
    : Math.round((block.y + block.height / 2 - cy) * factor) + 0;
  return out;
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

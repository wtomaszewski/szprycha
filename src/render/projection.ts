export interface Block {
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
) {
  if (lite) return { x: 0, y: -Math.round(block.floors * 4) };
  const factor = projectionFactor(block.floors, cameraHeight);
  return {
    x: Math.round((block.x + block.width / 2 - cx) * factor) + 0,
    y: Math.round((block.y + block.height / 2 - cy) * factor) + 0,
  };
}

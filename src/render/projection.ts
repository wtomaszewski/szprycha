export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  landmark?: boolean;
}
export function roofOffset(block: Block, cx: number, cy: number, lite = false) {
  const factor = 0.03 * block.floors;
  return {
    x: lite ? 0 : Math.round((block.x + block.width / 2 - cx) * factor),
    y: lite
      ? -Math.round(block.floors * 4)
      : Math.round((block.y + block.height / 2 - cy) * factor),
  };
}

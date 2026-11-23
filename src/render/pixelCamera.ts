/** Move the map in whole canvas pixels while the camera pans at a fixed zoom. */
export function pixelScroll(
  scroll: number,
  viewport: number,
  zoom: number,
  mapSize: number,
) {
  const half = viewport / 2;
  // Phaser rounds the viewport pivot before applying the zoom about its center.
  const pivot = Math.round(half);
  const offset = pivot - half * zoom;
  const first = Math.ceil(pivot + half - mapSize * zoom);
  const last = Math.floor(pivot - half);
  if (first > last) return scroll;
  const pixel = Math.min(
    last,
    Math.max(first, Math.round(offset - scroll * zoom)),
  );
  // At fractional zoom some sample centers land exactly on a texel boundary.
  // Use a fixed subpixel bias so rounding in the renderer breaks ties consistently.
  const bias = Number.isInteger(zoom)
    ? 0
    : Math.min(1 / 64, pivot - half - pixel);
  return (offset - pixel - bias) / zoom;
}

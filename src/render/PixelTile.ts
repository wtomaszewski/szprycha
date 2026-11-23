type Pixels = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};

function pixel(
  png: Pixels,
  x: number,
  y: number,
  color: number,
  alpha: number,
) {
  const offset = (y * png.width + x) * 4;
  png.data[offset] = (color >>> 16) & 255;
  png.data[offset + 1] = (color >>> 8) & 255;
  png.data[offset + 2] = color & 255;
  png.data[offset + 3] = alpha;
}

export class PixelTile<Image extends Pixels = Pixels> {
  constructor(readonly image: Image) {}

  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 255,
  ) {
    for (
      let py = Math.max(0, y);
      py < Math.min(y + height, this.image.height);
      py++
    )
      for (
        let px = Math.max(0, x);
        px < Math.min(x + width, this.image.width);
        px++
      )
        pixel(this.image, px, py, color, alpha);
  }

  oval(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 255,
  ) {
    for (let dy = Math.floor(y); dy < y + height; dy++)
      for (let dx = Math.floor(x); dx < x + width; dx++) {
        const u = ((dx + 0.5 - x) * 2) / width - 1;
        const v = ((dy + 0.5 - y) * 2) / height - 1;
        if (u * u + v * v <= 1) this.rect(dx, dy, 1, 1, color, alpha);
      }
  }

  stroke(
    x: number,
    y: number,
    toX: number,
    toY: number,
    radius: number,
    color: number,
  ) {
    const steps = Math.max(Math.ceil(Math.hypot(toX - x, toY - y)), 1);
    for (let i = 0; i <= steps; i++)
      this.oval(
        x + ((toX - x) * i) / steps - radius + 0.5,
        y + ((toY - y) * i) / steps - radius + 0.5,
        2 * radius,
        2 * radius,
        color,
      );
  }

  bevel(x: number, y: number, width: number, height: number, color: number) {
    this.rect(x + 1, y, width - 2, height, color);
    this.rect(x, y + 1, width, height - 2, color);
  }

  line(
    x: number,
    y: number,
    toX: number,
    toY: number,
    color: number,
    wide = 1,
  ) {
    const steps = Math.max(Math.abs(toX - x), Math.abs(toY - y), 1);
    for (let i = 0; i <= steps; i++)
      this.rect(
        Math.round(x + ((toX - x) * i) / steps),
        Math.round(y + ((toY - y) * i) / steps),
        wide,
        wide,
        color,
      );
  }
}

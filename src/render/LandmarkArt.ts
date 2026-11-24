import type { Cameras, GameObjects, Scene } from 'phaser';

type Bounds = { x: number; y: number; width: number; height: number };

export function drawNationalStadium(
  art: GameObjects.Graphics,
  { x, y, width, height }: Bounds,
) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const roofY = cy - 28;
  const rx = width / 2;
  const ry = height / 2;
  art
    .fillStyle(0x254c44, 0.32)
    .fillEllipse(cx + 10, cy + 9, width, height, 96)
    .fillStyle(0x566c86)
    .fillEllipse(cx, cy, width, height, 96)
    .fillStyle(0x333c57)
    .fillEllipse(cx, cy - 5, width, height, 96);

  // Raked panels wrap around the visible half of the bowl.
  const edge = (i: number, offset: number) => {
    const angle = (i * Math.PI) / 40;
    return {
      x: Math.round(cx + rx * Math.cos(angle)),
      y: Math.round(roofY + ry * Math.sin(angle) + offset),
    };
  };
  for (let i = 0; i < 40; i++) {
    art
      .fillStyle(i % 2 === 0 ? 0xffffff : 0xe43b44)
      .fillPoints(
        [edge(i, 0), edge(i + 1, 0), edge(i + 2, 23), edge(i + 1, 23)],
        true,
      );
  }

  for (const [inset, tone] of [
    [0, 0x94b0c2],
    [4, 0xffffff],
    [11, 0xc0cbdc],
    [14, 0xf4f4f4],
    [31, 0xc0cbdc],
    [37, 0x333c57],
    [45, 0xb13e53],
    [50, 0xe43b44],
    [54, 0xb13e53],
    [62, 0xe43b44],
    [66, 0x333c57],
    [76, 0x3e8948],
  ] as const)
    art
      .fillStyle(tone)
      .fillEllipse(cx, roofY, width - 2 * inset, height - 2 * inset, 96);

  const pitchWidth = 148;
  const pitchHeight = 220;
  const left = cx - pitchWidth / 2;
  const top = roofY - pitchHeight / 2;
  for (let i = 0; i < 10; i++)
    art
      .fillStyle(i % 2 === 0 ? 0x559859 : 0x3e8948)
      .fillRect(left, top + i * 22, pitchWidth, 22);
  art
    .lineStyle(2, 0xc1e4cb)
    .strokeRect(left, top, pitchWidth, pitchHeight)
    .lineBetween(left, roofY, left + pitchWidth, roofY)
    .strokeCircle(cx, roofY, 20)
    .strokeRect(cx - 39, top, 78, 27)
    .strokeRect(cx - 39, top + pitchHeight - 27, 78, 27)
    .strokeRect(cx - 14, top - 7, 28, 7)
    .strokeRect(cx - 14, top + pitchHeight, 28, 7);

  const mastTop = roofY - 82;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const anchorX = Math.round(cx + (rx - 19) * Math.cos(angle));
    const anchorY = Math.round(roofY + (ry - 19) * Math.sin(angle));
    art
      .lineStyle(2, 0x566c86, 0.75)
      .lineBetween(cx, mastTop + 1, anchorX, anchorY)
      .lineStyle(1, 0xf4f4f4)
      .lineBetween(cx, mastTop, anchorX, anchorY - 1)
      .fillStyle(0x566c86)
      .fillRect(anchorX - 2, anchorY - 2, 4, 4);
  }
  art
    .fillStyle(0x254c44, 0.6)
    .fillEllipse(cx + 6, roofY + 4, 20, 9)
    .fillStyle(0x333c57)
    .fillRect(cx - 4, mastTop - 9, 8, 95)
    .fillStyle(0xffffff)
    .fillRect(cx - 3, mastTop - 7, 4, 92)
    .fillStyle(0xe43b44)
    .fillRect(cx - 3, mastTop - 5, 4, 7);
}

export function pergolaPosts({ x, y, width, height }: Bounds) {
  return Array.from({ length: 9 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    return {
      x: Math.round(x + (width / 2) * (1 - Math.cos(angle))),
      y: Math.round(y + height * (1 - Math.sin(angle))),
    };
  });
}

export function drawCentennialPergola(
  art: GameObjects.Graphics,
  bounds: Bounds,
) {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const basinY = y + height - 47;
  art
    .fillStyle(0xc0cbdc)
    .fillEllipse(cx, basinY, width - 92, 46, 48)
    .fillStyle(0x257179)
    .fillEllipse(cx, basinY - 1, width - 102, 36, 48);
  for (const [dx, dy, length] of [
    [-58, -4, 21],
    [-16, 5, 36],
    [35, -9, 25],
    [48, 8, 13],
  ])
    art.fillStyle(0x73eff7, 0.5).fillRect(cx + dx!, basinY + dy!, length!, 2);

  const posts = pergolaPosts(bounds);
  for (const [i, post] of posts.entries()) {
    const { x, y } = post;
    art
      .fillStyle(0x254c44, 0.35)
      .fillRect(x - 9, y - 3, 24, 14)
      .fillStyle(0x8b6d5c)
      .fillRect(x - 8, y - 18, 16, 25)
      .fillStyle(0xe8c39e)
      .fillRect(x - 7, y - 18, 9, 22)
      .fillStyle(0xf0dca8)
      .fillRect(x - 10, y - 23, 20, 8);
    const next = posts[i + 1];
    if (!next) continue;
    art
      .lineStyle(13, 0x8b6d5c)
      .lineBetween(x, y - 18, next.x, next.y - 18)
      .lineStyle(9, 0xe8c39e)
      .lineBetween(x, y - 23, next.x, next.y - 23);
    for (let step = 1; step <= 4; step++) {
      const px = Math.round(x + ((next.x - x) * step) / 5);
      const py = Math.round(y + ((next.y - y) * step) / 5) - 24;
      art
        .fillStyle(0xc1a486)
        .fillRect(px - 2, py - 6, 4, 12)
        .fillStyle((i + step) % 2 === 0 ? 0x3e8948 : 0x559859)
        .fillRect(px - 3, py - 6 - (step % 2) * 3, 7, 6);
    }
  }
}

export function drawPlantedBed(
  art: GameObjects.Graphics,
  { x, y, width, height }: Bounds,
) {
  art
    .fillStyle(0x254c44, 0.38)
    .fillRect(x + 3, y + 5, width, height)
    .fillStyle(0x9b7352)
    .fillRect(x, y, width, height)
    .fillStyle(0xd9b48a)
    .fillRect(x, y, width, 3)
    .fillRect(x, y, 3, height)
    .fillStyle(0x5a3a2e)
    .fillRect(x + 4, y + 4, width - 8, height - 8);
  for (let i = 0; i < 5; i++) {
    const px = x + 11 + Math.round(((width - 22) * i) / 4);
    const py = y + height / 2 + ((i * 7) % 13) - 7;
    art
      .fillStyle(0x254c44)
      .fillEllipse(px, py + 2, 17, 15, 12)
      .fillStyle(0x559859)
      .fillEllipse(px - 2, py, 12, 10, 12)
      .fillStyle(i % 2 === 0 ? 0xffcd75 : 0xe98b95)
      .fillRect(px - 4, py - 3, 3, 3)
      .fillRect(px + 1, py + 1, 2, 2);
  }
}

export class PalaceReflection {
  private readonly art;
  private phase = -1;

  constructor(
    scene: Scene,
    private readonly bounds: Bounds,
  ) {
    this.art = scene.add.graphics().setPosition(bounds.x, bounds.y).setDepth(4);
  }

  update(camera: Cameras.Scene2D.Camera, at: number, reduced: boolean) {
    const { x, y, width, height } = this.bounds;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    const visible =
      x < cx + halfWidth &&
      x + width > cx - halfWidth &&
      y < cy + halfHeight &&
      y + height > cy - halfHeight;
    this.art.setVisible(visible);
    const phase = reduced ? 0 : Math.floor(at * 8) % 32;
    if (!visible || phase === this.phase) return;
    this.phase = phase;

    const art = this.art.clear();
    // Mirrored entablature, columns and central portico dissolve into the ripples.
    for (let row = 0; row < height; row += 2) {
      const ripple = Math.round(
        3 * Math.sin(((row + phase * 2) * Math.PI) / 16),
      );
      const inset = 4 + Math.round(row / 5);
      const opacity = 0.7 * (1 - row / height);
      art
        .fillStyle(0x94b0c2, opacity * 0.5)
        .fillRect(inset, row, width - inset * 2, 2);
      art.fillStyle(0xf4f4f4, opacity);
      if (row < 4 || (row >= 20 && row < 24)) {
        art.fillRect(inset + ripple, row, width - 2 * inset, 2);
      } else if (row < 20) {
        for (let col = 6; col < width - 6; col += 16)
          art.fillRect(col + ripple, row, 5, 2);
      } else {
        const half = 33 - (row - 24) * 3;
        art.fillRect(width / 2 - half + ripple, row, half * 2, 2);
      }
      if ((row + phase) % 8 < 2) {
        art
          .fillStyle(0x73eff7, opacity * 0.75)
          .fillRect(18 + ((row * 13 + phase * 3) % (width - 70)), row, 37, 2);
      }
    }
  }
}

export function paintAfrykariumGlass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = '#333c57';
  ctx.fillRect(x, y, width, height);
  for (let pane = 5; pane + 12 < width; pane += 24) {
    const left = x + pane;
    const span = Math.min(21, width - pane - 3);
    const waterline = Math.round(height * 0.45 + 3 * Math.sin(pane / 24));
    ctx.fillStyle = pane % 48 === 5 ? '#257179' : '#3b5dc9';
    ctx.fillRect(left, y + 3, span, height - 6);
    for (let row = 5; row < height - 4; row += 2) {
      const shift = ((pane + row * 3) % 12) - 4;
      ctx.fillStyle = row < waterline ? '#41a6f6' : '#0099db';
      ctx.fillRect(left, y + row, span, 2);
      ctx.fillStyle = row % 6 === 5 ? '#73eff7' : '#41a6f6';
      ctx.fillRect(left + 5 + Math.max(0, shift), y + row, span - 13, 1);
    }
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(left, y + 3, 2, height - 6);
  }
}

export function paintAfrykariumRoof(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  for (let x = 0; x < width; x += 2) {
    const wave = Math.round(9 * Math.cos((x / width) * 3 * Math.PI));
    const taper = Math.max(0, 18 - Math.min(x, width - x)) * 0.75;
    const north = 9 + wave + Math.round(taper);
    const south = height - 14 + wave - Math.round(taper);
    ctx.fillStyle = '#333c57';
    ctx.fillRect(x, north, 2, south - north);
    if (x < 4 || x >= width - 4) continue;
    ctx.fillStyle = x % 40 < 20 ? '#708892' : '#819aa6';
    ctx.fillRect(x, north + 3, 2, south - north - 27);
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(x, north + 3, 2, 4);
    ctx.fillStyle = '#566c86';
    ctx.fillRect(x, north + 57, 2, 2);
    ctx.fillRect(x, south - 42, 2, 2);
  }
  // The glazed entrance is recessed into the northern overhang.
  paintAfrykariumGlass(ctx, 12, 38, width - 24, 34);
  ctx.fillStyle = '#29366f';
  ctx.fillRect(56, 48, 30, 24);
  ctx.fillStyle = '#73eff7';
  ctx.fillRect(69, 51, 2, 21);
  ctx.fillStyle = '#c0cbdc';
  ctx.fillRect(56, 47, 30, 3);
  ctx.fillRect(12, 72, width - 24, 3);
}

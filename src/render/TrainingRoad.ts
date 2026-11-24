import { arcadeFont, readingFont } from '../core/fonts';
import type { Cameras, GameObjects, Scene } from 'phaser';
import { cacheMapGraphics } from './MapGround';
import { ui } from '../core/presentation';
import type { EnvState, Vec2 } from '../rules/types';
import type { Box, WorldModel } from '../rules/world/WorldModel';
import { vehicleFrame } from './spriteFrames';

const lightColor = {
  red: 0xe43b44,
  green: 0xa7f070,
  yellow: 0xfeae34,
  off: 0x566c86,
};

const countdownTexture = 'signal-countdown-digits';
const digitWidth = 8;
const digitHeight = 10;

function loadCountdownDigits(scene: Scene) {
  if (scene.textures.exists(countdownTexture)) return;
  const texture = scene.textures.createCanvas(
    countdownTexture,
    digitWidth * 10,
    digitHeight,
  )!;
  const ctx = texture.context;
  ctx.font = `8px "${arcadeFont}"`;
  ctx.fillStyle = '#fff1ce';
  for (let digit = 0; digit < 10; digit++) {
    const left = digit * digitWidth;
    texture.add(digit, 0, left, 0, digitWidth, digitHeight);
    ctx.fillText(String(digit), left, digitHeight - 2);
  }
  // Canvas text has no antialiasing switch. Quantize alpha once for this atlas.
  const pixels = ctx.getImageData(0, 0, texture.width, texture.height);
  for (let i = 3; i < pixels.data.length; i += 4) {
    pixels.data[i] = pixels.data[i]! >= 128 ? 255 : 0;
  }
  ctx.putImageData(pixels, 0, 0);
  texture.refresh();
}

function bicyclePictogram(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  size: number,
) {
  art
    .lineStyle(1.5, color)
    .strokeCircle(x - 5 * size, y + 3 * size, 3 * size)
    .strokeCircle(x + 5 * size, y + 3 * size, 3 * size)
    .lineBetween(x - 5 * size, y + 3 * size, x, y - 3 * size)
    .lineBetween(x, y - 3 * size, x + 5 * size, y + 3 * size)
    .lineBetween(x - 5 * size, y + 3 * size, x + 5 * size, y + 3 * size);
}

function pedestrianPictogram(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
) {
  art
    .fillStyle(color)
    .fillCircle(x, y - 4, 2)
    .lineStyle(1, color)
    .lineBetween(x, y - 2, x, y + 2)
    .lineBetween(x - 2, y, x + 2, y)
    .lineBetween(x, y + 2, x - 2, y + 5)
    .lineBetween(x, y + 2, x + 2, y + 5);
}

export class TrainingRoad {
  readonly staticChunks: GameObjects.Image[] = [];
  private readonly lights: GameObjects.Graphics;
  private readonly countdownDigits: GameObjects.Blitter;
  private readonly countdownBobs: GameObjects.Bob[] = [];
  private digitCount = 0;
  private lastLightFrame = -1;
  private lastCountdowns = false;
  private lastReducedEffects = false;
  private lightAt = 0;
  private readonly lightView = {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity,
  };

  constructor(
    scene: Scene,
    private readonly world: WorldModel,
    staticMap?: { key: string; width: number; height: number },
  ) {
    this.lights = scene.add.graphics().setDepth(7);
    loadCountdownDigits(scene);
    this.countdownDigits = scene.add
      .blitter(0, 0, countdownTexture)
      .setDepth(7);
    const marks = scene.add.graphics().setDepth(3);
    const markCenters: Vec2[] = [];
    const scale = 1 / world.metersPerPixel;
    for (const route of world.trafficRoutes) {
      if (route.kind !== 'tram') continue;
      for (const stop of route.stops) {
        const x = (stop.x + stop.width / 2) * scale;
        const y = (stop.y + stop.height) * scale + 10;
        markCenters.push({ x, y });
        marks.fillStyle(0xf4f4f4).fillRect(x - 10, y - 10, 20, 20);
        marks.fillStyle(0x3b5dc9).fillRect(x - 9, y - 9, 18, 18);
        marks
          .fillStyle(0xf4f4f4)
          .fillRoundedRect(x - 5, y - 6, 10, 10, 2)
          .fillRect(x - 5, y + 6, 10, 1);
        marks.fillStyle(0x29366f).fillRect(x - 3, y - 4, 6, 3);
      }
    }
    for (const [index, car] of world.parkedCars.entries())
      this.drawParkedCar(scene, car, scale, index);
    const signs = scene.add.graphics().setDepth(6);
    const signCenters: Vec2[] = [];
    for (const sign of world.signs) {
      if (sign.code === 'P-23') continue; // Surface paint is drawn by GroundPaint.
      const x = sign.x * scale;
      const y = sign.y * scale;
      signCenters.push({ x, y });
      signs.fillStyle(0x1a1c2c).fillRect(x - 2, y, 4, 19);
      if (sign.displayOnly) {
        const graffiti = scene.add.graphics().setDepth(7);
        graffiti
          .lineStyle(2, 0x29366f)
          .beginPath()
          .moveTo(x + 3, y - 7)
          .lineTo(x - 4, y)
          .lineTo(x + 2, y)
          .lineTo(x - 2, y + 6)
          .strokePath();
      }
      if (sign.code === 'A-7') {
        signs
          .fillStyle(0xe43b44)
          .fillTriangle(x - 17, y - 11, x + 17, y - 11, x, y + 14);
        signs
          .fillStyle(0xfeae34)
          .fillTriangle(x - 11, y - 7, x + 11, y - 7, x, y + 10);
      } else if (sign.code === 'B-20') {
        for (const [radius, color] of [
          [17, 0xf4f4f4],
          [15, 0xe43b44],
          [12, 0xb13e53],
        ] as const) {
          const points = Array.from({ length: 8 }, (_, i) => {
            const angle = Math.PI / 8 + (i * Math.PI) / 4;
            return {
              x: x + radius * Math.cos(angle),
              y: y + radius * Math.sin(angle),
            };
          });
          signs.fillStyle(color).fillPoints(points, true);
        }
        scene.add
          .text(x, y, 'STOP', { fontFamily: readingFont, fontSize: '16px' })
          .setOrigin(0.5)
          .setDepth(7);
      } else if (sign.code === 'B-2') {
        signs
          .fillStyle(0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 9, y - 2, 18, 4);
        if (sign.exceptBicycles) {
          signs.fillStyle(0xf4f4f4).fillRect(x - 13, y + 15, 26, 13);
          bicyclePictogram(signs, x, y + 20, 0x1a1c2c, 0.65);
        }
      } else if (sign.code === 'C-13/C-16') {
        const divided = world.zones.some(
          ({ id, sharedSide }) => id === sign.affects && sharedSide,
        );
        signs
          .fillStyle(0xf4f4f4)
          .fillCircle(x, y, 16)
          .fillStyle(0x3b5dc9)
          .fillCircle(x, y, 14);
        if (divided) {
          signs.lineStyle(1, 0xf4f4f4).lineBetween(x, y - 12, x, y + 12);
          pedestrianPictogram(signs, x - 6, y, 0xf4f4f4);
          bicyclePictogram(signs, x + 7, y, 0xf4f4f4, 0.65);
        } else {
          signs
            .lineStyle(1, 0xf4f4f4)
            .lineBetween(x - 11, y + 1, x + 11, y + 1);
          pedestrianPictogram(signs, x, y - 6, 0xf4f4f4);
          bicyclePictogram(signs, x, y + 7, 0xf4f4f4, 0.65);
        }
      } else if (
        sign.code === 'D-17' ||
        sign.code === 'D-6a' ||
        sign.code === 'D-6'
      ) {
        signs
          .fillStyle(0xf4f4f4)
          .fillRect(x - 14, y - 13, 28, 26)
          .fillStyle(0x3b5dc9)
          .fillRect(x - 12, y - 11, 24, 22);
        if (sign.code !== 'D-17') {
          signs
            .fillStyle(0xf4f4f4)
            .fillTriangle(x, y - 10, x - 10, y + 9, x + 10, y + 9);
          if (sign.code === 'D-6a')
            bicyclePictogram(signs, x, y + 3, 0x1a1c2c, 0.57);
          else pedestrianPictogram(signs, x, y + 3, 0x1a1c2c);
        } else {
          signs
            .fillStyle(0xf4f4f4)
            .fillRect(x - 8, y - 8, 16, 16)
            .fillStyle(0x1a1c2c)
            .fillRect(x - 5, y - 4, 10, 9)
            .lineStyle(1, 0x1a1c2c)
            .lineBetween(x - 3, y - 4, x + 3, y - 8);
          signs.fillStyle(0xf4f4f4).fillRect(x - 3, y - 3, 6, 3);
        }
      } else if (sign.code === 'G-1a') {
        signs.fillStyle(0xf4f4f4).fillRect(x - 5, y - 18, 10, 32);
        signs.lineStyle(2, 0xe43b44);
        for (const dy of [-13, -5, 3]) {
          const direction = sign.facing === 'S' ? -1 : 1;
          signs.lineBetween(
            x - 4 * direction,
            y + dy + 3,
            x + 4 * direction,
            y + dy,
          );
        }
      } else if (sign.code === 'D-15') {
        signs
          .fillStyle(0x3b5dc9)
          .fillRect(x - 12, y - 14, 24, 25)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 9, y - 11, 18, 19)
          .fillStyle(0x1a1c2c)
          .fillRect(x - 7, y - 7, 14, 11)
          .fillCircle(x - 4, y + 4, 2)
          .fillCircle(x + 4, y + 4, 2)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 5, y - 5, 10, 4);
      } else if (sign.code === 'G-3') {
        for (const [width, color] of [
          [6, 0xe43b44],
          [3, 0xf4f4f4],
        ] as const)
          signs
            .lineStyle(width, color)
            .lineBetween(x - 11, y - 7, x + 11, y + 7)
            .lineBetween(x + 11, y - 7, x - 11, y + 7);
      } else if (sign.code === 'C-13' || sign.code === 'B-9') {
        const cyclePath = sign.code === 'C-13';
        signs
          .fillStyle(cyclePath ? 0xf4f4f4 : 0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(cyclePath ? 0x3b5dc9 : 0xf4f4f4)
          .fillCircle(x, y, 11)
          .lineStyle(1.5, cyclePath ? 0xf4f4f4 : 0x1a1c2c)
          .strokeCircle(x - 5, y + 3, 3)
          .strokeCircle(x + 5, y + 3, 3)
          .lineBetween(x - 5, y + 3, x, y - 3)
          .lineBetween(x, y - 3, x + 5, y + 3)
          .lineBetween(x - 5, y + 3, x + 5, y + 3)
          .lineBetween(x + 2, y - 4, x + 5, y + 3);
      } else if (sign.code === 'D-40' || sign.code === 'D-41') {
        signs
          .fillStyle(0xf4f4f4)
          .fillRect(x - 20, y - 12, 40, 24)
          .fillStyle(0x3b5dc9)
          .fillRect(x - 18, y - 10, 36, 20)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 15, y, 13, 4)
          .fillRect(x - 12, y - 3, 7, 4)
          .fillCircle(x, y - 4, 2)
          .fillTriangle(x + 6, y - 2, x + 11, y - 8, x + 16, y - 2)
          .fillRect(x + 7, y - 2, 8, 7)
          .lineStyle(1.5, 0xf4f4f4)
          .lineBetween(x, y - 1, x, y + 2)
          .lineBetween(x, y + 2, x - 2, y + 6)
          .lineBetween(x, y + 2, x + 2, y + 6);
        if (sign.code === 'D-41')
          signs
            .lineStyle(3, 0xe43b44)
            .lineBetween(x - 18, y + 9, x + 18, y - 9);
      } else if (sign.code === 'B-1') {
        signs
          .fillStyle(0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(0xf4f4f4)
          .fillCircle(x, y, 10);
      } else if (sign.code === 'C-12') {
        signs
          .fillStyle(0xf4f4f4)
          .fillCircle(x, y, 14)
          .fillStyle(0x3b5dc9)
          .fillCircle(x, y, 12)
          .lineStyle(2, 0xf4f4f4)
          .strokeCircle(x, y, 6);
        for (let i = 0; i < 3; i++) {
          const theta = (i * 2 * Math.PI) / 3;
          const at = (dx: number, dy: number) =>
            [
              x + dx * Math.cos(theta) - dy * Math.sin(theta),
              y + dx * Math.sin(theta) + dy * Math.cos(theta),
            ] as const;
          signs
            .fillStyle(0xf4f4f4)
            .fillTriangle(...at(7, -4), ...at(4, 1), ...at(9, 1));
        }
      } else if (sign.code === 'D-46' || sign.code === 'D-47') {
        signs.fillStyle(0xf4f4f4).fillRect(x - 27, y - 10, 54, 20);
        signs.lineStyle(1, 0x333c57).strokeRect(x - 26, y - 9, 52, 18);
        scene.add
          .text(x, y, ui.driving.internalRoadSign.replace(' ', '\n'), {
            fontFamily: readingFont,
            fontSize: '12px',
            align: 'center',
            lineSpacing: -4,
            color: '#1a1c2c',
          })
          .setOrigin(0.5)
          .setDepth(6);
        if (sign.code === 'D-47')
          scene.add
            .graphics()
            .setDepth(7)
            .lineStyle(2, 0xe43b44)
            .lineBetween(x - 25, y + 8, x + 25, y - 8);
      } else if (['A-9', 'A-10', 'A-11a', 'A-17'].includes(sign.code)) {
        signs
          .fillStyle(0xe43b44)
          .fillTriangle(x, y - 14, x - 17, y + 12, x + 17, y + 12);
        signs
          .fillStyle(0xfeae34)
          .fillTriangle(x, y - 9, x - 12, y + 9, x + 12, y + 9);
        if (sign.code === 'A-9')
          signs
            .lineStyle(1, 0x1a1c2c)
            .lineBetween(x - 7, y + 1, x + 7, y + 1)
            .lineBetween(x - 7, y + 5, x + 7, y + 5)
            .lineBetween(x - 5, y, x - 5, y + 8)
            .lineBetween(x + 5, y, x + 5, y + 8);
        else if (sign.code === 'A-10')
          signs
            .fillStyle(0x1a1c2c)
            .fillRect(x - 6, y + 1, 12, 5)
            .fillRect(x - 5, y - 3, 5, 6)
            .fillRect(x + 3, y - 2, 2, 5)
            .fillCircle(x - 4, y + 6, 2)
            .fillCircle(x + 3, y + 6, 2);
        else if (sign.code === 'A-11a')
          signs.fillStyle(0x1a1c2c).fillEllipse(x, y + 5, 15, 5);
        else {
          signs
            .fillStyle(0x1a1c2c)
            .fillCircle(x - 3, y - 2, 2)
            .fillCircle(x + 4, y + 1, 2);
          signs
            .lineStyle(2, 0x1a1c2c)
            .lineBetween(x - 3, y, x - 3, y + 7)
            .lineBetween(x + 4, y + 3, x + 4, y + 8);
        }
      } else if (sign.code === 'D-1') {
        signs.fillStyle(0xf4f4f4).fillPoints(
          [
            { x, y: y - 13 },
            { x: x + 13, y },
            { x, y: y + 13 },
            { x: x - 13, y },
          ],
          true,
        );
        signs.fillStyle(0xffcd75).fillPoints(
          [
            { x, y: y - 9 },
            { x: x + 9, y },
            { x, y: y + 9 },
            { x: x - 9, y },
          ],
          true,
        );
      }
    }
    if (staticMap) {
      const { key, width, height } = staticMap;
      this.staticChunks.push(
        ...cacheMapGraphics(
          scene,
          marks,
          `${key}-marks`,
          width,
          height,
          markCenters,
          10,
        ),
        ...cacheMapGraphics(
          scene,
          signs,
          `${key}-signs`,
          width,
          height,
          signCenters,
          32,
        ),
      );
    }
  }

  updateLights(
    camera: Cameras.Scene2D.Camera,
    at: number,
    environment: EnvState,
    countdowns: boolean,
    reducedEffects: boolean,
  ) {
    const cx = camera.clampX(camera.scrollX) + camera.width / 2;
    const cy = camera.clampY(camera.scrollY) + camera.height / 2;
    const halfW = camera.width / (2 * camera.zoom);
    const halfH = camera.height / (2 * camera.zoom);
    const view = this.lightView;
    const moved =
      cx - halfW < view.left ||
      cx + halfW > view.right ||
      cy - halfH < view.top ||
      cy + halfH > view.bottom;
    const frame = Math.floor(at * 10);
    if (
      !moved &&
      this.lastLightFrame === frame &&
      this.lastCountdowns === countdowns &&
      this.lastReducedEffects === reducedEffects
    )
      return;
    this.lastCountdowns = countdowns;
    this.lastReducedEffects = reducedEffects;
    if (frame !== this.lastLightFrame) {
      this.lastLightFrame = frame;
      this.lightAt = at;
    }
    if (moved) {
      // The margin keeps the command buffer valid while the camera scrolls.
      view.left = cx - halfW - 64;
      view.right = cx + halfW + 64;
      view.top = cy - halfH - 64;
      view.bottom = cy + halfH + 64;
    }
    const visible = (x: number, y: number, width = 0, height = 0) =>
      x - 16 <= view.right &&
      x + width + 16 >= view.left &&
      y - 16 <= view.bottom &&
      y + height + 16 >= view.top;
    const scale = 1 / this.world.metersPerPixel;
    this.lights.clear();
    const previousDigitCount = this.digitCount;
    this.digitCount = 0;
    for (const crossing of this.world.crossings) {
      if (
        visible(
          crossing.x * scale,
          crossing.y * scale,
          crossing.width * scale,
          crossing.height * scale,
        )
      ) {
        const rail = this.world.railState(crossing, this.lightAt, environment);
        if (rail && !crossing.rail?.passive)
          this.drawRailSignals(
            crossing,
            rail.flashing,
            rail.barrier === 'closed',
            scale,
            this.lightAt,
            reducedEffects,
          );
      }
      const trainX = this.world.railTrainX(crossing, this.lightAt);
      const trainY = (crossing.y + crossing.height / 2) * scale;
      if (
        trainX !== undefined &&
        visible(trainX * scale - 100, trainY - 14, 200, 28)
      )
        this.drawTrain(Math.round(trainX * scale), Math.round(trainY));
      const { signal } = crossing;
      if (!signal) continue;
      const pedestrian = crossing.kind === 'pedestrian';
      const x = signal.x * scale;
      const y = signal.y * scale;
      const oppositeX =
        crossing.axis === 'x'
          ? (2 * crossing.x + crossing.width - signal.x) * scale
          : x;
      const oppositeY =
        crossing.axis === 'y'
          ? (2 * crossing.y + crossing.height - signal.y) * scale
          : y;
      const firstVisible = visible(x, y);
      const secondVisible =
        (pedestrian || signal.twoWay) && visible(oppositeX, oppositeY);
      if (!firstVisible && !secondVisible) continue;
      const phase = this.world.crossingPhase(
        crossing,
        this.lightAt,
        environment,
      );
      const flashing = phase === 'flashing-green';
      const open = phase === 'green' || phase === 'off' || flashing;
      const color =
        flashing && !reducedEffects && Math.floor(this.lightAt * 4) % 2
          ? lightColor.off
          : lightColor[open ? 'green' : 'red'];
      const seconds = countdowns
        ? this.world.crossingCountdown(crossing, this.lightAt, environment)
        : undefined;
      if (firstVisible) {
        this.drawCrossingSignal(x, y, color, pedestrian, open);
        this.drawCountdown(x, y + 16, seconds);
      }
      if (secondVisible) {
        this.drawCrossingSignal(oppositeX, oppositeY, color, pedestrian, open);
        this.drawCountdown(oppositeX, oppositeY + 16, seconds);
      }
    }
    for (const signal of this.world.signals) {
      const x = signal.x * scale;
      const y = signal.y * scale;
      if (!visible(x, y)) continue;
      const lane = this.world.getLane(signal.affects)!;
      const phase = this.world.phase(lane, this.lightAt, environment);
      this.lights.fillStyle(0x1a1c2c).fillRect(x - 8, y - 12, 16, 24);
      if (lane.type === 'tram') {
        this.lights.lineStyle(3, 0xf4f4f4);
        if (phase === 'green') this.lights.lineBetween(x, y - 5, x, y + 5);
        else if (phase !== 'off') this.lights.lineBetween(x - 5, y, x + 5, y);
      } else if (signal.code === 'S-1') {
        for (const [index, lamp] of (
          ['red', 'yellow', 'green'] as const
        ).entries()) {
          const active =
            lamp === phase ||
            (phase === 'arrow' && lamp === 'red') ||
            (phase === 'red-yellow' && lamp !== 'green');
          const lampY = y + (index - 1) * 7;
          if (active)
            this.lights.fillStyle(lightColor[lamp]).fillCircle(x, lampY, 3);
          else
            this.lights.lineStyle(1, lightColor.off).strokeCircle(x, lampY, 2);
        }
      } else if (phase === 'arrow') {
        const d = signal.direction === 'right' ? 1 : -1;
        this.lights
          .lineStyle(2, 0xa7f070)
          .lineBetween(x - 5 * d, y, x + 5 * d, y)
          .lineBetween(x + 5 * d, y, x, y - 5)
          .lineBetween(x + 5 * d, y, x, y + 5);
      }
      if (countdowns && lane.type !== 'tram') {
        const seconds = this.world.signalCountdown(
          lane,
          signal.code,
          this.lightAt,
          environment,
        );
        if (signal.code === 'S-2') this.drawCountdown(x + 18, y, seconds);
        else if (lane.arrow) this.drawCountdown(x - 18, y, seconds);
        else this.drawCountdown(x, y - 19, seconds);
      }
    }
    for (let i = this.digitCount; i < previousDigitCount; i++)
      this.countdownBobs[i]!.setVisible(false);
  }

  private drawCountdown(x: number, y: number, seconds: number | undefined) {
    if (seconds === undefined) return;
    const value =
      seconds >= 1e21 ? BigInt(seconds).toString() : String(seconds);
    const width = Math.max(18, value.length * digitWidth + 4);
    const left = Math.round(x) - width / 2;
    const top = Math.round(y) - 7;
    this.lights
      .fillStyle(0x566c86)
      .fillRect(left, top, width, 14)
      .fillStyle(0x1a1c2c)
      .fillRect(left + 1, top + 1, width - 2, 12);
    let digitX = Math.round(x) - (value.length * digitWidth) / 2;
    for (const digit of value) {
      const frame = Number(digit);
      const bob = this.countdownBobs[this.digitCount++];
      if (bob)
        bob
          .setPosition(digitX, top + 2)
          .setFrame(frame)
          .setVisible(true);
      else
        this.countdownBobs.push(
          this.countdownDigits.create(digitX, top + 2, frame),
        );
      digitX += digitWidth;
    }
  }

  private drawParkedCar(scene: Scene, car: Box, scale: number, index: number) {
    const width = car.width * scale;
    const height = car.height * scale;
    const horizontal = width > height;
    scene.add
      .image(
        (car.x + car.width / 2) * scale,
        (car.y + car.height / 2) * scale,
        'traffic-car',
        vehicleFrame(3 + (index % 3), false, undefined, false),
      )
      .setDepth(3)
      .setDisplaySize(
        ((horizontal ? height : width) * 32) / 25,
        ((horizontal ? width : height) * 48) / 38,
      )
      .setRotation(horizontal ? Math.PI / 2 : 0);
  }

  private drawTrain(x: number, y: number) {
    for (const [offset, length] of [
      [-100, 64],
      [-34, 64],
      [32, 68],
    ] as const) {
      const start = x + offset;
      this.lights
        .fillStyle(0x1a1c2c)
        .fillRect(start, y - 14, length, 28)
        .fillStyle(0x257179)
        .fillRect(start + 2, y - 12, length - 4, 24)
        .fillStyle(0xc0cbdc)
        .fillRect(start + 3, y - 10, length - 6, 3)
        .fillStyle(0x41a6f6);
      for (let window = 6; window < length - 7; window += 13) {
        this.lights.fillRect(start + window, y - 5, 8, 4);
        this.lights.fillRect(start + window, y + 3, 8, 4);
      }
    }
    this.lights
      .fillStyle(0xf4f4f4)
      .fillRect(x + 96, y - 8, 3, 3)
      .fillRect(x + 96, y + 5, 3, 3);
  }

  private drawRailSignals(
    box: Box,
    flashing: boolean,
    closed: boolean,
    scale: number,
    at: number,
    reducedEffects: boolean,
  ) {
    const x = box.x * scale;
    const y = box.y * scale;
    const width = box.width * scale;
    const height = box.height * scale;
    for (const south of [false, true]) {
      const postX = south ? x + width : x;
      const postY = south ? y + height + 8 : y - 8;
      const direction = south ? -1 : 1;
      if (closed) {
        this.lights
          .lineStyle(5, 0xf4f4f4)
          .lineBetween(postX, postY, postX + direction * width * 0.48, postY);
        this.lights.lineStyle(5, 0xe43b44);
        for (let i = 10; i < width * 0.44; i += 20)
          this.lights.lineBetween(
            postX + direction * i,
            postY,
            postX + direction * (i + 10),
            postY,
          );
      }
      this.lights
        .fillStyle(0x1a1c2c)
        .fillRoundedRect(postX - 12, postY - 7, 24, 14, 3);
      const phase = Math.floor(at * 2) % 2;
      for (const [index, offset] of [-5, 5].entries()) {
        const lampX = postX + offset;
        if (flashing && (reducedEffects || phase === index))
          this.lights.fillStyle(lightColor.red).fillCircle(lampX, postY, 3);
        else
          this.lights
            .lineStyle(1, lightColor.off)
            .strokeCircle(lampX, postY, 2);
      }
      if (flashing) {
        this.lights
          .lineStyle(1, 0xf4f4f4)
          .lineBetween(postX - 7, postY + 5, postX + 7, postY + 5);
      }
    }
  }

  private drawCrossingSignal(
    x: number,
    y: number,
    color: number,
    pedestrian: boolean,
    open: boolean,
  ) {
    this.lights.fillStyle(0x1a1c2c).fillRoundedRect(x - 8, y - 9, 16, 18, 2);
    if (!open) {
      this.lights.lineStyle(2, color).lineBetween(x - 5, y - 6, x + 5, y - 6);
    }
    if (pedestrian) {
      this.lights.fillStyle(color).fillCircle(x, y - 4, 2);
      this.lights
        .lineStyle(2, color)
        .lineBetween(x, y - 2, x, y + 2)
        .lineBetween(x, y, x - 3, y + 1)
        .lineBetween(x, y, x + 3, y + 1)
        .lineBetween(x, y + 2, x - 2, y + 5)
        .lineBetween(x, y + 2, x + 2, y + 5);
    } else {
      this.lights
        .lineStyle(1, color)
        .strokeCircle(x - 3, y + 1, 2)
        .strokeCircle(x + 3, y + 1, 2)
        .lineBetween(x - 3, y + 1, x, y - 3)
        .lineBetween(x, y - 3, x + 3, y + 1);
    }
  }
}

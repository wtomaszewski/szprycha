import { Scene, GameObjects } from 'phaser';
import mapUrl from '../../maps/miasteczko.tmj?url';
import tilesUrl from '../../assets/generated/tiles.png?url';
import riderUrl from '../../assets/generated/rider.png?url';
import {
  canRide,
  FIXED_STEP,
  METERS_PER_PIXEL,
  stepRider,
  type Obstacle,
  type Rider,
} from '../gameplay/bicycle';
import { Blocks, type Block } from '../render/Blocks';
import { DrivingControls } from '../ui/DrivingControls';
import { ui, showError } from '../core/presentation';

import type { GameContent } from '../content/schemas';
import { RuleDebugOverlay } from '../render/RuleDebugOverlay';
import { TrainingRoad } from '../render/TrainingRoad';
import { IntersectionManager } from '../rules/priority/IntersectionManager';
import { RuleEngine } from '../rules/RuleEngine';
import type { AgentState, EnvState, RiderState } from '../rules/types';
import { WorldModel } from '../rules/world/WorldModel';
import { CAR_RADIUS_PX, TrafficSimulation } from '../sim/TrafficSimulation';
import {
  PEDESTRIAN_RADIUS_PX,
  TrainingPedestrians,
} from '../sim/TrainingPedestrians';
import { RuleFeedback } from '../ui/RuleFeedback';

const environment: EnvState = {
  time: 'day',
  weather: 'clear',
  visibilityLow: false,
};

export class City extends Scene {
  private rider!: Rider;
  private sprite!: GameObjects.Image;
  private actionArt!: GameObjects.Graphics;
  private pedestrian!: GameObjects.Arc;
  private controls!: DrivingControls;
  private blocks!: Blocks;
  private obstacles: Obstacle[] = [];
  private accumulator = 0;
  private worldWidth = 0;
  private worldHeight = 0;
  private spawn = { x: 512, y: 1024 };
  private hudAt = 0;
  private messageUntil = 0;
  private world!: WorldModel;
  private rules!: RuleEngine;
  private intersectionManager!: IntersectionManager;
  private traffic!: TrafficSimulation;
  private pedestrians!: TrainingPedestrians;
  private agents!: readonly AgentState[];
  private actorObstacles!: Obstacle[];
  private actors!: (GameObjects.Arc | GameObjects.Image)[];
  private road!: TrainingRoad;
  private debug!: RuleDebugOverlay;
  private feedback!: RuleFeedback;
  private content!: GameContent;
  private readonly rulesRider: RiderState = {
    id: 'player',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
    mode: 'riding',
    ageBand: '10to15',
    signal: 'none',
    helmet: { worn: true, fastened: true },
  };
  constructor() {
    super('City');
  }
  preload() {
    this.load.tilemapTiledJSON('training-map', mapUrl);
    this.load.image('training', tilesUrl);
    this.load.image('rider', riderUrl);
    this.load.once('loaderror', showError);
  }
  create() {
    this.obstacles = [];
    this.accumulator = 0;
    this.hudAt = 0;
    this.messageUntil = 0;
    this.content = this.registry.get('content') as GameContent;
    const cached = this.cache.tilemap.get('training-map') as { data: unknown };
    this.world = new WorldModel(
      cached.data,
      this.content.balans.silnik.kafel_m,
    );
    this.road = new TrainingRoad(this, this.world);
    this.intersectionManager = new IntersectionManager(this.world);
    this.traffic = new TrafficSimulation(
      this.world,
      this.intersectionManager,
      this.content.balans.silnik,
    );
    this.pedestrians = new TrainingPedestrians(this.world);
    const map = this.make.tilemap({ key: 'training-map' });
    const tiles = map.addTilesetImage('training', 'training');
    if (!tiles) throw new Error('Missing training tiles');
    map.createLayer('ground', tiles);
    map.createLayer('markings', tiles)?.setDepth(1);
    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;
    const spawn = map
      .getObjectLayer('spawns')
      ?.objects.find((o) => o.name === 'player');
    this.spawn = { x: spawn?.x ?? 512, y: spawn?.y ?? 1024 };
    const buildings: Block[] = [];
    for (const obj of map.getObjectLayer('blocks')?.objects ?? []) {
      const b = {
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        width: obj.width ?? 0,
        height: obj.height ?? 0,
      };
      this.obstacles.push({ ...b, kind: 'wall' });
      const properties = obj.properties as
        { name: string; value: unknown }[] | undefined;
      const floors = Number(
        properties?.find((p) => p.name === 'height')?.value ?? 1,
      );
      const landmarkId = properties?.find(
        (p) => p.name === 'landmarkId',
      )?.value;
      buildings.push({
        ...b,
        floors,
        landmarkId: typeof landmarkId === 'string' ? landmarkId : undefined,
      });
    }
    const curbArt = this.add.graphics().setDepth(2).fillStyle(0xc0cbdc);
    for (const o of map.getObjectLayer('collisions')?.objects ?? []) {
      const curb: Obstacle = {
        x: o.x ?? 0,
        y: o.y ?? 0,
        width: o.width ?? 0,
        height: o.height ?? 0,
        kind: 'curb',
      };
      this.obstacles.push(curb);
      curbArt.fillRect(curb.x, curb.y, curb.width, curb.height);
    }
    // Extract one roof tile so artists can replace the tilesheet without renderer changes.
    if (!this.textures.exists('roof')) {
      const roof = this.textures.createCanvas('roof', 32, 32);
      roof?.context.drawImage(
        this.textures.get('training').getSourceImage() as HTMLImageElement,
        128,
        0,
        32,
        32,
        0,
        0,
        32,
        32,
      );
      roof?.refresh();
    }
    this.blocks = new Blocks(this, buildings);
    this.agents = [...this.traffic.agents, ...this.pedestrians.agents];
    this.actorObstacles = this.agents.map(({ kind }) => {
      const diameter =
        (kind === 'car' ? CAR_RADIUS_PX : PEDESTRIAN_RADIUS_PX) * 2;
      return { x: 0, y: 0, width: diameter, height: diameter, kind: 'wall' };
    });
    this.obstacles.push(...this.actorObstacles);
    if (!this.textures.exists('traffic-car')) {
      const car = this.make.graphics({});
      car.fillStyle(0x1a1c2c).fillRoundedRect(0, 0, 26, 16, 3);
      car.fillStyle(0x41a6f6).fillRoundedRect(1, 2, 24, 12, 3);
      car.fillStyle(0x29366f).fillRect(8, 4, 10, 8);
      car.fillStyle(0x73eff7).fillRect(16, 4, 2, 8);
      car.fillStyle(0xffcd75).fillRect(23, 3, 2, 3).fillRect(23, 10, 2, 3);
      car.fillStyle(0xe43b44).fillRect(1, 3, 2, 3).fillRect(1, 10, 2, 3);
      car.generateTexture('traffic-car', 26, 16);
      car.destroy();
    }
    this.actors = this.agents.map(({ kind }) =>
      (kind === 'car'
        ? this.add.image(0, 0, 'traffic-car')
        : this.add
            .circle(0, 0, PEDESTRIAN_RADIUS_PX, 0xffcd75)
            .setStrokeStyle(2, 0x1a1c2c)
      ).setDepth(17),
    );
    this.syncActorObstacles();
    this.rider = {
      ...this.spawn,
      heading: -Math.PI / 2,
      speed: 0,
      walking: false,
    };
    this.sprite = this.add
      .image(this.rider.x, this.rider.y, 'rider')
      .setScale(2)
      .setDepth(20);
    this.pedestrian = this.add
      .circle(0, 0, 8, 0xffcd75)
      .setStrokeStyle(2, 0x1a1c2c)
      .setDepth(21)
      .setVisible(false);
    this.cameras.main
      .setZoom(0.75)
      .setBounds(0, 0, this.worldWidth, this.worldHeight)
      .centerOn(this.rider.x, this.rider.y);
    this.controls = new DrivingControls(
      () => this.toggleMode(),
      () => this.reset(),
      () => this.scene.start('MainMenu'),
      (height) => {
        this.blocks.cameraHeight = height;
        this.blocks.update(
          this.cameras.main,
          this.controls.lite,
          this.rider.x,
          this.rider.y,
        );
      },
      (visible) => {
        this.debug.setVisible(visible);
        this.debug.update(
          this.rules,
          this.world,
          environment,
          this.traffic.agents,
          this.rulesRider.pos,
        );
      },
    );
    this.feedback = new RuleFeedback(
      this.controls.root,
      this.content.przepisy.przepisy,
    );
    this.resetRules();
    this.debug = new RuleDebugOverlay(this, this.world, this.controls.root);
    this.actionArt = this.add.graphics().setDepth(22);
    this.controls.setWalking(false);
    const onShutdown = () => {
      this.debug.destroy();
      this.controls.destroy();
      const c = this.game.canvas;
      delete c.dataset.x;
      delete c.dataset.y;
      delete c.dataset.speed;
      delete c.dataset.walking;
    };
    this.events.once('shutdown', onShutdown);
    this.game.canvas.dataset.scene = 'City';
    this.game.canvas.setAttribute('aria-label', ui.driving.title);
  }
  private message(text: string) {
    this.controls.notice.textContent = text;
    this.messageUntil = this.time.now + 2600;
  }
  private toggleMode() {
    if (this.controls.paused) return;
    if (this.rider.speed > 5) {
      this.message(ui.driving.slowDown);
      return;
    }
    if (this.rider.walking && !canRide(this.rider, this.obstacles)) {
      this.message(ui.driving.blocked);
      return;
    }
    this.rider.walking = !this.rider.walking;
    this.rider.speed = 0;
    this.controls.setWalking(this.rider.walking);
    if (this.rider.walking) this.message(ui.driving.walkingHint);
  }
  private reset() {
    Object.assign(this.rider, this.spawn, {
      speed: 0,
      heading: -Math.PI / 2,
      walking: false,
    });
    this.traffic.reset();
    this.pedestrians.reset();
    this.syncActorObstacles();
    this.resetRules();
    this.accumulator = 0;
    this.controls.clear();
    Object.assign(this.controls.actions, {
      signal: null,
      looking: false,
      bell: false,
      lights: false,
    });
    this.controls.setWalking(false);
    this.cameras.main.centerOn(this.rider.x, this.rider.y);
  }
  private resetRules() {
    const engine = (this.rules = new RuleEngine(
      this.world,
      this.content.balans,
      this.intersectionManager,
    ));
    this.feedback.reset(engine.counts);
    engine.onVerdict((verdict) =>
      this.feedback.receive(verdict, engine.counts),
    );
  }
  private syncActorObstacles() {
    const scale = 1 / this.world.metersPerPixel;
    for (let i = 0; i < this.agents.length; i++) {
      const { pos } = this.agents[i]!;
      const obstacle = this.actorObstacles[i]!;
      obstacle.x = pos.x * scale - obstacle.width / 2;
      obstacle.y = pos.y * scale - obstacle.height / 2;
    }
  }

  private stepWorld() {
    const source = this.rider;
    const rider = this.rulesRider;
    const scale = this.world.metersPerPixel;
    rider.pos.x = source.x * scale;
    rider.pos.y = source.y * scale;
    rider.speed = source.speed * scale;
    rider.heading = source.heading;
    rider.mode = source.walking ? 'walking_bike' : 'riding';
    rider.signal = this.controls.actions.signal ?? 'none';
    this.traffic.step(environment, rider, this.pedestrians.agents);
    this.pedestrians.step(rider.pos, this.traffic.agents);
    this.syncActorObstacles();
    this.rules.step(rider, this.agents, environment);
  }
  update(time: number, delta: number) {
    if (!this.controls) return;
    const input = this.controls.read();
    if (
      this.controls.paused ||
      matchMedia('(pointer: coarse) and (orientation: portrait)').matches
    ) {
      this.accumulator = 0;
      return;
    }
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator >= FIXED_STEP) {
      if (
        stepRider(
          this.rider,
          input,
          this.obstacles,
          this.worldWidth,
          this.worldHeight,
        )
      )
        this.message(ui.driving.collision);
      this.stepWorld();
      this.accumulator -= FIXED_STEP;
    }
    const r = this.rider;
    const a = this.controls.actions;
    const signal = this.rules.signal;
    const art = this.actionArt
      .clear()
      .setPosition(Math.round(r.x), Math.round(r.y))
      .setRotation(r.heading);
    if (signal !== 'none')
      art
        .lineStyle(5, 0xffcd75)
        .lineBetween(0, 0, 0, signal === 'left' ? -30 : 30);
    if (a.looking) art.fillStyle(0x73eff7).fillCircle(-12, -8, 5);
    if (a.bell)
      art
        .lineStyle(2, 0xffcd75)
        .strokeCircle(0, 0, 28 + (Math.floor(time / 100) % 6));
    if (a.lights) {
      art.fillStyle(0xffcd75, 0.3).fillTriangle(16, 0, 65, -20, 65, 20);
      art.fillStyle(0xe43b44).fillRect(-23, -3, 5, 6);
    }
    this.sprite
      .setPosition(Math.round(r.x), Math.round(r.y))
      .setRotation(r.heading + Math.PI / 2);
    this.pedestrian
      .setVisible(r.walking)
      .setPosition(
        Math.round(r.x + Math.cos(r.heading + Math.PI / 2) * 24),
        Math.round(r.y + Math.sin(r.heading + Math.PI / 2) * 24),
      );
    const camera = this.cameras.main,
      look = r.speed * 0.5;
    const targetX = r.x + Math.cos(r.heading) * look - camera.width / 2,
      targetY = r.y + Math.sin(r.heading) * look - camera.height / 2;
    const blend = 1 - Math.exp(-delta / 160);
    camera.setScroll(
      Math.round(camera.scrollX + (targetX - camera.scrollX) * blend),
      Math.round(camera.scrollY + (targetY - camera.scrollY) * blend),
    );
    this.blocks.update(camera, this.controls.lite, r.x, r.y);
    const scale = 1 / this.world.metersPerPixel;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom) + CAR_RADIUS_PX + 2;
    const halfHeight = camera.height / (2 * camera.zoom) + CAR_RADIUS_PX + 2;
    for (let index = 0; index < this.agents.length; index++) {
      const agent = this.agents[index]!;
      const x = Math.round(agent.pos.x * scale);
      const y = Math.round(agent.pos.y * scale);
      const visible =
        Math.abs(x - centerX) <= halfWidth &&
        Math.abs(y - centerY) <= halfHeight;
      const actor = this.actors[index]!.setVisible(visible);
      if (visible) actor.setPosition(x, y).setRotation(agent.heading);
    }
    this.road.updateLights(this.rules.at, environment);
    this.feedback.update(this.rules.at);
    if (time - this.hudAt > 100) {
      this.hudAt = time;
      this.debug.update(
        this.rules,
        this.world,
        environment,
        this.traffic.agents,
        this.rulesRider.pos,
      );
      this.controls.speed.textContent = `${Math.round(r.speed * METERS_PER_PIXEL * 3.6)} ${ui.driving.unit}`;
      const canvas = this.game.canvas;
      canvas.dataset.x = String(Math.round(r.x));
      canvas.dataset.y = String(Math.round(r.y));
      canvas.dataset.speed = String(r.speed);
      canvas.dataset.actions = JSON.stringify({
        ...a,
        signal: signal === 'none' ? null : signal,
      });
      canvas.dataset.walking = String(r.walking);
      if (time > this.messageUntil)
        this.controls.notice.textContent = ui.driving.prototype;
    }
  }
}

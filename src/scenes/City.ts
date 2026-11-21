import { Scene, GameObjects } from 'phaser';
import trainingUrl from '../../maps/miasteczko.tmj?url';
import warsawUrl from '../../maps/warszawa.tmj?url';
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
import { drawMapGround } from '../render/MapGround';
import { DrivingControls } from '../ui/DrivingControls';
import { showError, translate, ui } from '../core/presentation';

import { MissionSystem, type MissionSpawn } from '../gameplay/MissionSystem';
import {
  canOpenPhone,
  missionLines,
  missionProgress,
} from '../gameplay/MissionProgress';
import type { GameContent } from '../content/schemas';
import { RuleDebugOverlay } from '../render/RuleDebugOverlay';
import { TrainingRoad } from '../render/TrainingRoad';
import { IntersectionManager } from '../rules/priority/IntersectionManager';
import { RuleEngine } from '../rules/RuleEngine';
import type { AgentState, EnvState, RiderState, Verdict } from '../rules/types';
import { WorldModel } from '../rules/world/WorldModel';
import {
  actorRadiusPx,
  TrafficParticipants,
  type RoutedAgent,
} from '../sim/TrafficParticipants';
import type { RoadTrafficAgent } from '../sim/TrafficSimulation';
import { trafficSprite, trafficTextures } from '../render/TrafficArt';
import { emergencyLightPhase } from '../render/emergencyLights';
import { EmergencySiren } from '../audio/EmergencySiren';
import { RuleFeedback } from '../ui/RuleFeedback';
import { MissionHud } from '../ui/MissionHud';
import { MissionPhone } from '../ui/MissionPhone';
import { DialogueWindow } from '../ui/DialogueWindow';
import { ReplayBuffer, type ReplayFrame } from '../gameplay/ReplayBuffer';
import { TrafficEvents, propIds } from '../gameplay/TrafficEvents';
import { ReplayDialog } from '../ui/ReplayDialog';
import { TrafficEventNotice } from '../ui/TrafficEventNotice';
import { EventArt } from '../render/EventArt';
import { ReplayHighlight } from '../render/ReplayHighlight';
import type { ForcedMissionEvent } from '../content/missions';
import type { Box } from '../rules/world/WorldModel';

const drivingZoom = 0.75;
const reviewIntroMs = 300;

const defaultMap = 'miasteczko';

export class City extends Scene {
  private readonly environment: EnvState = {
    time: 'day',
    weather: 'clear',
    visibilityLow: false,
  };
  private readonly renderEnvironment = { ...this.environment };
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
  private spawn = { x: 512, y: 1024, heading: -Math.PI / 2 };
  private hudAt = 0;
  private messageUntil = 0;
  private world!: WorldModel;
  private rules!: RuleEngine;
  private stopListeningForVerdicts?: () => void;
  private intersectionManager!: IntersectionManager;
  private traffic!: TrafficParticipants;
  private siren!: EmergencySiren;
  private sirenArt!: GameObjects.Graphics;
  private readonly activeAgents: AgentState[] = [];
  private agents!: readonly (RoadTrafficAgent | RoutedAgent)[];
  private actorObstacles!: Obstacle[];
  private actors!: GameObjects.Image[];
  private road!: TrainingRoad;
  private debug!: RuleDebugOverlay;
  private feedback!: RuleFeedback;
  private content!: GameContent;
  private mission?: MissionSystem;
  private phone!: MissionPhone;
  private dialogue!: DialogueWindow;
  private phoneFeedback!: string;
  private missionHud?: MissionHud;
  private missionMarker?: GameObjects.Graphics;
  private displayedTarget?: MissionSystem['target'];
  private missionInterrupted = false;
  private checkpointHint?: string;
  private replay!: ReplayBuffer;
  private replayDialog!: ReplayDialog;
  private highlight!: ReplayHighlight;
  private eventArt!: EventArt;
  private eventNotice!: TrafficEventNotice;
  private trafficEvents!: TrafficEvents;
  private eventObstacles!: Obstacle[];
  private phoneAnsweredSafely = false;
  private readonly reviewedMinor = new Set<string>();
  private review?: {
    verdict: Verdict;
    elapsed: number;
    playback?: number;
    shown: boolean;
  };
  private readonly portraitTouch = matchMedia(
    '(pointer: coarse) and (orientation: portrait)',
  );
  private readonly reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  private readonly startForced = (event: ForcedMissionEvent, area: Box) =>
    this.trafficEvents.force(event, area, this.rulesRider);
  private readonly forcedPending = () => this.trafficEvents.hasPendingForced;
  private readonly tickVerdicts: Verdict[] = [];
  private readonly rulesRider: RiderState = {
    id: 'player',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
    mode: 'riding',
    ageBand: '10to15',
    signal: 'none',
    helmet: { worn: true, fastened: true },
    shoulderCheck: { lastLeftAt: -Infinity },
    lights: { front: false, rear: false },
  };
  constructor() {
    super('City');
  }
  preload() {
    for (const [id, url] of [
      [defaultMap, trainingUrl],
      ['warszawa', warsawUrl],
    ] as const) {
      if (!this.cache.tilemap.exists(id)) this.load.tilemapTiledJSON(id, url);
    }
    if (!this.textures.exists('training'))
      this.load.image('training', tilesUrl);
    if (!this.textures.exists('rider')) this.load.image('rider', riderUrl);
    this.load.on('loaderror', showError);
    this.load.once('complete', () => this.load.off('loaderror', showError));
  }

  create({ missionId, map }: { missionId?: string; map?: string } = {}) {
    this.obstacles = [];
    this.accumulator = 0;
    this.hudAt = 0;
    this.messageUntil = 0;
    this.content = this.registry.get('content') as GameContent;
    const definition = this.availableOrders().find(
      ({ id }) => id === missionId,
    );
    const mapId = definition?.mapa ?? definition?.miasto ?? map ?? defaultMap;
    const cached = this.cache.tilemap.get(mapId) as { data: unknown };
    this.world = new WorldModel(
      cached.data,
      this.content.balans.silnik.kafel_m,
    );
    this.phoneFeedback = this.content.przepisy.przepisy.find(
      ({ id }) => id === 'MAN-11',
    )!.feedback;
    this.mission = definition
      ? new MissionSystem(
          definition,
          this.world,
          this.content.balans.misja.major_do_porazki,
        )
      : undefined;
    const ambientTraffic = definition?.ruch_ai !== false;
    this.review = undefined;
    this.phoneAnsweredSafely = false;
    this.missionInterrupted = false;
    this.checkpointHint = undefined;
    this.missionHud = undefined;
    this.missionMarker = undefined;
    this.displayedTarget = undefined;
    this.rulesRider.helmet.fastened = definition?.start.kask_zapiety ?? true;
    this.road = new TrainingRoad(this, this.world);
    this.intersectionManager = new IntersectionManager(this.world);
    this.traffic = new TrafficParticipants(
      this.world,
      this.intersectionManager,
      this.content.balans.silnik,
      undefined,
      ambientTraffic ? 'scheduled' : 'mission-only',
    );
    this.trafficEvents = new TrafficEvents(
      this.world,
      this.traffic,
      undefined,
      undefined,
      ambientTraffic,
      this.traffic.road.agents,
    );
    this.siren = new EmergencySiren();
    const tilemap = this.make.tilemap({ key: mapId });
    const tiles = tilemap.addTilesetImage('training', 'training');
    if (!tiles) throw new Error('Missing training tiles');
    if (mapId === 'warszawa') drawMapGround(this, tilemap, tiles, mapId);
    else {
      tilemap.createLayer('ground', tiles);
      tilemap.createLayer('markings', tiles)?.setDepth(1);
    }
    this.worldWidth = tilemap.widthInPixels;
    this.worldHeight = tilemap.heightInPixels;
    const spawn = tilemap
      .getObjectLayer('spawns')
      ?.objects.find((o) => o.name === 'player');
    const heading = spawn?.properties?.find(
      (p: { name: string; value: unknown }) => p.name === 'heading',
    )?.value;
    this.spawn = {
      x: spawn?.x ?? 512,
      y: spawn?.y ?? 1024,
      heading: typeof heading === 'number' ? heading : -Math.PI / 2,
    };
    const buildings: Block[] = [];
    for (const obj of tilemap.getObjectLayer('blocks')?.objects ?? []) {
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
        tint: properties?.find((p) => p.name === 'tint')?.value as
          number | undefined,
        landmarkId: typeof landmarkId === 'string' ? landmarkId : undefined,
      });
    }
    const curbArt = this.add.graphics().setDepth(2).fillStyle(0xc0cbdc);
    for (const o of tilemap.getObjectLayer('collisions')?.objects ?? []) {
      const curb: Obstacle = {
        x: o.x ?? 0,
        y: o.y ?? 0,
        width: o.width ?? 0,
        height: o.height ?? 0,
        kind: o.properties?.some(
          (p: { name: string; value: unknown }) =>
            p.name === 'kind' && p.value === 'wall',
        )
          ? 'wall'
          : 'curb',
      };
      this.obstacles.push(curb);
      if (curb.kind === 'curb')
        curbArt.fillRect(curb.x, curb.y, curb.width, curb.height);
    }
    for (const {
      x = 0,
      y = 0,
      width = 0,
      height = 0,
    } of tilemap.getObjectLayer('traffic_islands')?.objects ?? []) {
      this.add
        .ellipse(x + width / 2, y + height / 2, width, height, 0x346856)
        .setStrokeStyle(5, 0xc0cbdc)
        .setDepth(2);
    }
    for (const car of this.world.parkedCars) {
      const scale = 1 / this.world.metersPerPixel;
      this.obstacles.push({
        x: car.x * scale,
        y: car.y * scale,
        width: car.width * scale,
        height: car.height * scale,
        kind: 'wall',
      });
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
    this.agents = [...this.traffic.road.agents, ...this.traffic.routed];
    this.replay = new ReplayBuffer(this.agents.length, propIds.length);
    this.actorObstacles = this.agents.map(({ kind }) => {
      const diameter = actorRadiusPx[kind] * 2;
      return { x: 0, y: 0, width: diameter, height: diameter, kind: 'wall' };
    });
    this.eventObstacles = propIds.map((id) => {
      const size = id === 'rowerzysta_pod_prad' ? 16 : 10;
      return { x: -1000, y: -1000, width: size, height: size, kind: 'wall' };
    });
    this.obstacles.push(...this.actorObstacles, ...this.eventObstacles);
    trafficTextures(this);
    this.actors = this.agents.map(({ kind }) => trafficSprite(this, kind));
    this.sirenArt = this.add.graphics().setDepth(23);
    this.eventArt = new EventArt(this);
    this.highlight = new ReplayHighlight(this, this.world, this.agents);
    this.syncActorObstacles();
    this.rider = {
      ...this.spawn,
      speed: 0,
      walking: false,
    };
    if (this.mission) this.placeRider(this.mission.start);
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
      .setZoom(drivingZoom)
      .setBounds(0, 0, this.worldWidth, this.worldHeight)
      .centerOn(this.rider.x, this.rider.y);
    const areaTitle =
      mapId === 'warszawa' ? ui.driving.pragaTitle : ui.driving.title;
    this.controls = new DrivingControls(
      areaTitle,
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
          this.environment,
          this.traffic,
          this.rulesRider.pos,
        );
      },
      {
        keyboard: (event) => this.overlayKeyboard(event),
        gamepad: (pressed, justPressed) =>
          this.overlayGamepad(pressed, justPressed),
      },
    );
    this.phone = new MissionPhone(
      this.controls.root,
      () => this.togglePhone(),
      (id) => {
        if (
          this.phone.open &&
          canOpenPhone(this.rider.speed) &&
          (!this.mission || this.mission.result) &&
          this.availableOrders().some((order) => order.id === id)
        )
          this.scene.restart({ missionId: id });
      },
    );
    this.replayDialog = new ReplayDialog(
      this.controls.root,
      () => this.playReplay(),
      () => this.closeReview(true),
      () => this.closeReview(false),
    );
    this.eventNotice = new TrafficEventNotice(this.controls.root, () =>
      this.respondToEvent(),
    );
    this.dialogue = new DialogueWindow(
      this.controls.root,
      this.content.dialogi,
    );
    if (this.mission) this.controls.notice.textContent = '';
    this.feedback = new RuleFeedback(
      this.controls.root,
      this.content.przepisy.przepisy,
    );
    if (this.mission) {
      this.missionMarker = this.add.graphics().setDepth(8);
      this.missionHud = new MissionHud(
        this.controls.root,
        () => {
          this.rulesRider.helmet.fastened = true;
          this.updateMissionHud();
        },
        () => {
          this.controls.setLights(true);
          this.updateMissionHud();
        },
        () => {
          this.missionInterrupted = false;
          this.checkpointHint = undefined;
          this.controls.clear();
          this.updateMissionHud();
        },
        () => this.reset(),
        () => this.scene.start('MainMenu'),
      );
      this.updateMissionHud();
    }
    this.resetRules();
    this.recordFrame(-FIXED_STEP);
    this.debug = new RuleDebugOverlay(this, this.world, this.controls.root);
    this.actionArt = this.add.graphics().setDepth(22);
    this.controls.setWalking(false);
    const onShutdown = () => {
      this.stopListeningForVerdicts?.();
      this.stopListeningForVerdicts = undefined;
      this.game.canvas.classList.remove('training-dusk');
      this.renderEnvironment.time = 'day';
      this.siren.destroy();
      this.debug.destroy();
      this.replayDialog.close();
      this.dialogue.destroy();
      this.eventNotice.destroy();
      this.phone.close();
      this.controls.destroy();
      const c = this.game.canvas;
      delete c.dataset.map;
      delete c.dataset.mission;
      delete c.dataset.x;
      delete c.dataset.y;
      delete c.dataset.speed;
      delete c.dataset.walking;
    };
    this.events.once('shutdown', onShutdown);
    this.game.canvas.dataset.scene = 'City';
    this.game.canvas.dataset.map = mapId;
    if (definition) this.game.canvas.dataset.mission = definition.id;
    this.game.canvas.setAttribute('aria-label', areaTitle);
    this.controls.speed.textContent = `0 ${ui.driving.unit}`;
    this.blocks.update(
      this.cameras.main,
      this.controls.lite,
      this.rider.x,
      this.rider.y,
    );
    this.openMissionDialogue();
  }

  private availableOrders() {
    return this.content.misje.filter(
      (mission) =>
        this.cache.tilemap.exists(mission.mapa ?? mission.miasto) &&
        missionProgress.isAvailable(mission, this.content),
    );
  }

  private togglePhone() {
    if (this.phone.open) {
      this.phone.close();
      return;
    }
    if (this.dialogue.open || this.review) return;
    if (!canOpenPhone(this.rider.speed)) {
      this.message(this.phoneFeedback);
      return;
    }
    this.controls.clear();
    this.controls.notice.textContent = '';
    this.phone.show(
      this.availableOrders(),
      Boolean(this.mission && !this.mission.result),
    );
  }

  private overlayKeyboard(event: KeyboardEvent) {
    if (this.phone.open || this.dialogue.open || this.review) return true;
    if (event.code === 'KeyG' && !event.repeat && this.respondToEvent()) {
      event.preventDefault();
      return true;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    const onControl =
      event.target instanceof Element &&
      event.target.matches('button,input,select,textarea,a[href]');
    const toggle =
      event.code === 'KeyM' ||
      (event.code === 'Tab' && !event.shiftKey && !onControl);
    if (!toggle) return false;
    event.preventDefault();
    if (!event.repeat) this.togglePhone();
    return true;
  }

  private overlayGamepad(
    pressed: (button: number) => boolean,
    justPressed: (button: number) => boolean,
  ) {
    if (this.review) {
      if (this.review.shown) this.replayDialog.gamepad(justPressed);
      return true;
    }
    if (
      !this.phone.open &&
      !this.dialogue.open &&
      justPressed(3) &&
      this.respondToEvent()
    )
      return true;
    if (this.dialogue.open) {
      if (justPressed(1)) this.dialogue.skip();
      else {
        if (justPressed(12)) this.dialogue.scroll(-1);
        if (justPressed(13)) this.dialogue.scroll(1);
        this.dialogue.gamepad(pressed(0), justPressed(0));
      }
      return true;
    }
    if (justPressed(8)) {
      this.togglePhone();
      return true;
    }
    if (!this.phone.open) return false;
    if (justPressed(1)) this.phone.close();
    else if (justPressed(0)) this.phone.activate();
    else if (justPressed(12)) this.phone.focusOrder(-1);
    else if (justPressed(13)) this.phone.focusOrder(1);
    return true;
  }

  private openMissionDialogue() {
    if (!this.mission) return;
    const lines = missionProgress.opening(
      this.mission.definition,
      this.content.dialogi,
    );
    this.dialogue.show(lines, () => this.missionHud?.focusEquipment());
  }

  private finishMissionDialogue() {
    if (this.mission?.result?.status !== 'completed') return;
    this.rider.speed = 0;
    this.controls.clear();
    missionProgress.complete(this.mission.definition);
    this.dialogue.show(
      missionLines(this.content.dialogi, this.mission.definition.dialog_koniec),
      () => this.missionHud?.focusResult(),
    );
  }
  private message(text: string) {
    this.controls.notice.textContent = text;
    this.messageUntil = this.time.now + 2600;
  }
  private toggleMode() {
    if (
      this.controls.paused ||
      this.review ||
      this.mission?.result ||
      this.missionInterrupted
    )
      return;
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
      walking: false,
    });
    if (this.mission) {
      this.mission = new MissionSystem(
        this.mission.definition,
        this.world,
        this.content.balans.misja.major_do_porazki,
      );
      this.missionInterrupted = false;
      this.checkpointHint = undefined;
      this.controls.notice.textContent = '';
      this.rulesRider.helmet.fastened =
        this.mission.definition.start.kask_zapiety ?? true;
      this.placeRider(this.mission.start);
      this.updateMissionHud();
    }
    this.traffic.reset();
    this.trafficEvents.reset();
    this.phoneAnsweredSafely = false;
    this.eventNotice.update(undefined, false);
    this.siren.update(0, 0);
    this.syncActorObstacles();
    this.resetRules();
    this.accumulator = 0;
    this.controls.clear();
    Object.assign(this.controls.actions, {
      signal: null,
      looking: false,
      bell: false,
    });
    this.controls.setLights(false);
    this.controls.setWalking(false);
    this.cameras.main.centerOn(this.rider.x, this.rider.y);
    this.replay.clear();
    this.recordFrame(-FIXED_STEP);
    this.openMissionDialogue();
  }
  private resetRules() {
    this.environment.time = 'day';
    this.rulesRider.shoulderCheck!.lastLeftAt = -Infinity;
    this.rulesRider.phoneInHand = false;
    this.stopListeningForVerdicts?.();
    this.rules = new RuleEngine(
      this.world,
      this.content,
      this.intersectionManager,
    );
    this.feedback.reset(this.rules.counts);
    this.listenForVerdicts();
  }

  private listenForVerdicts() {
    const engine = this.rules;
    this.stopListeningForVerdicts = engine.onVerdict((verdict) => {
      this.tickVerdicts.push(verdict);
      if (verdict.ruleId === 'MAN-11' && verdict.kind === 'good')
        this.phoneAnsweredSafely = true;
    });
  }

  private respondToEvent() {
    if (
      this.controls.paused ||
      this.review ||
      this.dialogue.open ||
      this.phone.open ||
      this.missionInterrupted ||
      this.mission?.result
    )
      return false;
    const response = this.trafficEvents.respond(this.rulesRider);
    if (response && this.rulesRider.phoneInHand)
      this.phoneAnsweredSafely = false;
    return response;
  }

  private placeRider(spawn: MissionSpawn) {
    const scale = this.world.metersPerPixel;
    Object.assign(this.rider, {
      x: spawn.x / scale,
      y: spawn.y / scale,
      heading: spawn.heading,
      speed: 0,
      walking: false,
    });
  }

  private updateMissionHud() {
    if (!this.mission) return;
    const scale = this.world.metersPerPixel;
    const target = this.mission.target;
    if (target !== this.displayedTarget) {
      this.displayedTarget = target;
      const marker = this.missionMarker!.clear();
      if (target) {
        const x = target.position.x / scale;
        const y = target.position.y / scale;
        marker
          .lineStyle(5, 0x1a1c2c)
          .strokeRect(x - 16, y - 16, 32, 32)
          .lineStyle(2, 0xffcd75)
          .strokeRect(x - 16, y - 16, 32, 32);
      }
    }
    this.missionHud?.update(
      this.mission,
      { x: this.rider.x * scale, y: this.rider.y * scale },
      this.rulesRider.helmet.fastened,
      this.controls.actions.lights,
      this.missionInterrupted,
      this.checkpointHint,
    );
  }

  private syncActorObstacles() {
    const scale = 1 / this.world.metersPerPixel;
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i]!;
      const { pos } = agent;
      const obstacle = this.actorObstacles[i]!;
      if ('active' in agent && !agent.active) {
        obstacle.x = obstacle.y = -1000;
        continue;
      }
      obstacle.x = pos.x * scale - obstacle.width / 2;
      obstacle.y = pos.y * scale - obstacle.height / 2;
    }
    for (let i = 0; i < this.eventObstacles.length; i++) {
      const obstacle = this.eventObstacles[i]!;
      const prop = this.trafficEvents.props[i]!;
      const doorReach = i === 1 ? 19 : 0;
      obstacle.x = prop.active
        ? prop.x * scale +
          doorReach * Math.cos(prop.heading) -
          obstacle.width / 2
        : -1000;
      obstacle.y = prop.active
        ? prop.y * scale +
          doorReach * Math.sin(prop.heading) -
          obstacle.height / 2
        : -1000;
    }
  }

  private recordFrame(at = this.rules.at) {
    const actions = this.controls.actions;
    this.replay.record(
      at,
      this.environment.time === 'dusk',
      this.rider,
      actions,
      this.agents,
      this.trafficEvents.props,
      this.rules.signal === 'none' ? null : this.rules.signal,
    );
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
    if (this.controls.actions.looking)
      rider.shoulderCheck!.lastLeftAt = this.rules.at;
    rider.lights!.front = rider.lights!.rear = this.controls.actions.lights;
    rider.handsOnBar = rider.signal === 'none' ? 2 : 1;
    this.environment.time =
      this.mission?.definition.start.zmrok === true ||
      this.rules.at + FIXED_STEP >= this.world.duskAt
        ? 'dusk'
        : 'day';
    this.trafficEvents.step(rider);
    const cyclist = this.trafficEvents.wrongWayCyclist;
    this.traffic.step(this.environment, rider, cyclist);
    this.activeAgents.length = 0;
    for (const agent of this.agents)
      if (!('active' in agent) || agent.active) this.activeAgents.push(agent);
    if (cyclist) this.activeAgents.push(cyclist);
    this.tickVerdicts.length = 0;
    this.rules.step(
      rider,
      this.activeAgents,
      this.environment,
      this.trafficEvents.hazards,
    );
    this.trafficEvents.resolvePhoneResponse(
      this.phoneAnsweredSafely,
      rider.speed > 0.1 && rider.mode === 'riding',
      rider,
    );
    rider.phoneInHand = false;
    const effects = this.mission?.step(
      rider.pos,
      this.tickVerdicts,
      this.startForced,
      this.forcedPending,
      this.mission.preparingBike
        ? {
            helmet: rider.helmet.worn && rider.helmet.fastened,
            lights: rider.lights!.front && rider.lights!.rear,
          }
        : undefined,
    );
    this.syncActorObstacles();
    this.recordFrame();

    if (effects?.events)
      for (const event of effects.events)
        this.events.emit('mission:forced-event', event);

    const major = this.tickVerdicts.find(({ kind }) => kind === 'major');
    const minor =
      !major &&
      !effects?.respawn &&
      !this.mission?.result &&
      this.tickVerdicts.find(
        ({ kind, ruleId }) =>
          kind === 'minor' && !this.reviewedMinor.has(ruleId),
      );
    const lesson = major || minor;
    for (const verdict of this.tickVerdicts)
      this.feedback.receive(
        verdict,
        this.rules.counts,
        verdict === lesson || verdict.kind === 'major',
      );
    if (lesson) {
      if (lesson.kind === 'minor') this.reviewedMinor.add(lesson.ruleId);
      this.review = { verdict: lesson, elapsed: 0, shown: false };
      this.controls.clear();
      return;
    }
    if (effects?.respawn) {
      this.returnToCheckpoint(effects.respawn);
      const hint = effects.missingHabit;
      this.checkpointHint = hint?.hintKey
        ? translate(hint.hintKey)
        : ui.missionUi.checkpointHint;
      this.missionInterrupted = true;
    }
  }

  private returnToCheckpoint(spawn?: MissionSpawn) {
    if (spawn) this.placeRider(spawn);
    else
      Object.assign(this.rider, this.spawn, {
        speed: 0,
        walking: false,
      });
    this.controls.clear();
    this.controls.setWalking(false);
    this.rulesRider.shoulderCheck!.lastLeftAt = -Infinity;
    this.stopListeningForVerdicts?.();
    this.rules = this.rules.afterCheckpoint();
    this.listenForVerdicts();
    this.cameras.main.centerOn(this.rider.x, this.rider.y);
    this.replay.clear();
    this.recordFrame();
  }

  private playReplay() {
    const review = this.review;
    if (!review?.shown) return;
    review.playback = review.playback === undefined ? 0 : undefined;
    this.replayDialog.setPlaying(review.playback !== undefined);
  }

  private closeReview(retry: boolean) {
    const review = this.review;
    if (!review) return;
    this.review = undefined;
    this.replayDialog.close();
    this.highlight.clear();
    this.cameras.main.setZoom(drivingZoom);
    this.controls.clear();
    if (retry && !this.mission?.result)
      this.returnToCheckpoint(this.mission?.rewindCheckpoint());
    else this.cameras.main.centerOn(this.rider.x, this.rider.y);
    this.feedback.reset(this.rules.counts);
    this.renderFrame(this.replay.frame(this.replay.size - 1)!, 0);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.updateMissionHud();
    if (this.mission?.result) this.missionHud?.focusResult();
    else this.missionHud?.focusEquipment();
  }

  private updateReview(delta: number) {
    const review = this.review!;
    const reduced = this.reducedMotion.matches;
    review.elapsed += Math.min(delta, 100);
    const intro = reduced ? 1 : Math.min(1, review.elapsed / reviewIntroMs);
    const camera = this.cameras.main;
    if (!review.shown && intro >= 1) {
      review.shown = true;
      this.feedback.reset(this.rules.counts);
      this.replayDialog.show(
        this.feedback.explanation(review.verdict),
        review.verdict.kind === 'minor',
        this.replay.size > 1,
        Boolean(this.mission?.result),
      );
    }
    const duration = this.replay.durationMs;
    const playing = review.playback !== undefined;
    const elapsed = playing
      ? review.playback!
      : Math.max(0, duration - ((1 - intro) * reviewIntroMs) / 4);
    const frame = this.replay.frameAt(elapsed)!;
    const focus = playing ? frame.rider : this.highlight.focus(review.verdict);
    camera.setZoom(drivingZoom * (playing || reduced ? 1 : 1 + intro / 2));
    camera.centerOn(focus.x, focus.y);
    this.renderFrame(frame, 0, true);
    this.highlight.draw(
      review.verdict,
      frame,
      playing ? elapsed : review.elapsed,
      reduced,
    );
    if (playing) {
      review.playback = Math.min(duration, elapsed + Math.min(delta, 100));
      if (elapsed >= duration) {
        review.playback = undefined;
        this.replayDialog.setPlaying(false);
      }
    }
  }

  update(time: number, delta: number) {
    if (!this.controls) return;
    const input = this.controls.read();
    if (this.review) {
      this.updateReview(delta);
      return;
    }
    if (
      this.controls.paused ||
      this.phone.open ||
      this.dialogue.open ||
      this.missionInterrupted ||
      this.mission?.result ||
      this.portraitTouch.matches
    ) {
      this.accumulator = 0;
      this.siren.update(0, this.rules.at);
      return;
    }
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator >= FIXED_STEP) {
      if (
        !this.mission?.preparingBike &&
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
      if (this.review || this.missionInterrupted || this.mission?.result) {
        this.accumulator = 0;
        if (!this.review) this.finishMissionDialogue();
        break;
      }
    }
    if (this.review) {
      this.updateReview(delta);
      return;
    }
    const sirenVolume = this.renderFrame(
      this.replay.frame(this.replay.size - 1)!,
      delta,
    );
    this.feedback.update(this.rules.at);
    this.eventNotice.update(
      this.trafficEvents.notice,
      this.phoneAnsweredSafely,
    );
    this.updateMissionHud();
    if (
      time - this.hudAt > 100 ||
      this.missionInterrupted ||
      this.mission?.result
    ) {
      this.hudAt = time;
      this.debug.update(
        this.rules,
        this.world,
        this.environment,
        this.traffic,
        this.rulesRider.pos,
      );
      this.updateDrivingHud(this.rider, this.controls.actions);
      if (time > this.messageUntil) {
        const notice =
          sirenVolume > 0
            ? ui.rules.emergencyApproaching
            : this.mission
              ? ''
              : ui.driving.prototype;
        if (this.controls.notice.textContent !== notice)
          this.controls.notice.textContent = notice;
      }
    }
  }

  private updateDrivingHud(r: Rider, actions: typeof this.controls.actions) {
    const speed = `${Math.round(r.speed * METERS_PER_PIXEL * 3.6)} ${ui.driving.unit}`;
    if (this.controls.speed.textContent !== speed)
      this.controls.speed.textContent = speed;
    const canvas = this.game.canvas;
    const x = String(Math.round(r.x));
    const y = String(Math.round(r.y));
    const pxPerSecond = String(r.speed);
    if (canvas.dataset.x !== x) canvas.dataset.x = x;
    if (canvas.dataset.y !== y) canvas.dataset.y = y;
    if (canvas.dataset.speed !== pxPerSecond)
      canvas.dataset.speed = pxPerSecond;
    const signal = this.rules.signal;
    const inputs = JSON.stringify({
      ...actions,
      signal: signal === 'none' ? null : signal,
    });
    const walking = String(r.walking);
    if (canvas.dataset.actions !== inputs) canvas.dataset.actions = inputs;
    if (canvas.dataset.walking !== walking) canvas.dataset.walking = walking;
  }

  private renderFrame(frame: ReplayFrame, delta: number, reviewing = false) {
    const { rider: r, actions: a, at, dusk } = frame;
    const signal = a.signal;
    const art = this.actionArt
      .clear()
      .setPosition(Math.round(r.x), Math.round(r.y))
      .setRotation(r.heading);
    if (signal)
      art
        .lineStyle(5, 0xffcd75)
        .lineBetween(0, 0, 0, signal === 'left' ? -30 : 30);
    if (a.looking) art.fillStyle(0x73eff7).fillCircle(-12, -8, 5);
    if (a.bell)
      art
        .lineStyle(2, 0xffcd75)
        .strokeCircle(0, 0, 28 + (Math.floor(Math.max(at, 0) * 10) % 6));
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
    const halfWidth = camera.width / (2 * camera.zoom) + actorRadiusPx.tram + 2;
    const halfHeight =
      camera.height / (2 * camera.zoom) + actorRadiusPx.tram + 2;
    const sirenArt = this.sirenArt.clear();
    const flash = emergencyLightPhase(Math.max(at, 0));
    let sirenVolume = 0;
    let bearing = 0;
    for (let index = 0; index < this.agents.length; index++) {
      const agent = this.agents[index]!;
      const pose = frame.actors[index]!;
      const x = Math.round(pose.x * scale);
      const y = Math.round(pose.y * scale);
      const visible =
        pose.active &&
        Math.abs(x - centerX) <= halfWidth &&
        Math.abs(y - centerY) <= halfHeight;
      const actor = this.actors[index]!.setVisible(visible);
      if (visible) actor.setPosition(x, y).setRotation(pose.heading);
      if (pose.active && agent.kind === 'emergency' && pose.signalActive) {
        if (visible)
          sirenArt
            .fillStyle(flash ? 0x41a6f6 : 0x73eff7)
            .fillCircle(x - 1, y, 4)
            .fillCircle(x - 1, y + (flash ? -7 : 7), 3);
        const volume = Math.max(0, 1 - Math.hypot(x - r.x, y - r.y) / 560);
        if (volume > sirenVolume) {
          sirenVolume = volume;
          bearing = Math.atan2(y - r.y, x - r.x);
        }
      }
    }
    this.siren.update(reviewing ? 0 : sirenVolume, at);
    if (sirenVolume > 0) {
      const dx = Math.cos(bearing);
      const dy = Math.sin(bearing);
      const x = r.x + dx * 38;
      const y = r.y + dy * 38;
      sirenArt
        .fillStyle(0x73eff7)
        .fillTriangle(
          x + dx * 9,
          y + dy * 9,
          x + dy * 5,
          y - dx * 5,
          x - dy * 5,
          y + dx * 5,
        );
    }
    this.eventArt.draw(frame.props, scale);
    const lighting = this.renderEnvironment;
    const time = dusk ? 'dusk' : 'day';
    if (lighting.time !== time) {
      lighting.time = time;
      this.game.canvas.classList.toggle('training-dusk', dusk);
    }
    this.road.updateLights(Math.max(0, at), lighting);
    return sirenVolume;
  }
}

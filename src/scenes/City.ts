import { Scene, GameObjects } from 'phaser';
import trainingUrl from '../../maps/miasteczko.tmj?url';
import warsawUrl from '../../maps/warszawa.tmj?url';
import blockWallsUrl from '../../assets/generated/walls.png?url';
import blockRoofsUrl from '../../assets/generated/roofs.png?url';
import roofDetailsUrl from '../../assets/generated/roof-details.png?url';
import propsUrl from '../../assets/generated/props.png?url';
import tilesUrl from '../../assets/generated/tiles.png?url';
import {
  canRide,
  FIXED_STEP,
  METERS_PER_PIXEL,
  stepRider,
  type Obstacle,
  type Rider,
} from '../gameplay/bicycle';
import {
  createTrafficObstacles,
  placeTrafficObstacles,
} from '../gameplay/trafficObstacles';
import { Blocks, type Block } from '../render/Blocks';
import { CityProps, readProps } from '../render/CityProps';
import { cullMapChunks, drawMapGround } from '../render/MapGround';
import { DrivingControls } from '../ui/DrivingControls';
import { showError, translate, ui } from '../core/presentation';

import { MissionRace } from '../gameplay/MissionRace';
import { MissionSystem, type MissionSpawn } from '../gameplay/MissionSystem';
import {
  canOpenPhone,
  missionLines,
  type MissionProgress,
} from '../gameplay/MissionProgress';
import type { GameContent } from '../content/schemas';
import { RuleDebugOverlay } from '../render/RuleDebugOverlay';
import { TrainingRoad } from '../render/TrainingRoad';
import { IntersectionManager } from '../rules/priority/IntersectionManager';
import { RuleEngine } from '../rules/RuleEngine';
import type { AgentState, EnvState, RiderState, Verdict } from '../rules/types';
import { WorldModel } from '../rules/world/WorldModel';
import {
  TrafficParticipants,
  type RoutedAgent,
} from '../sim/TrafficParticipants';
import type { RoadTrafficAgent } from '../sim/TrafficSimulation';
import { drawCyclist, loadTrafficArt, TrafficArt } from '../render/TrafficArt';
import { RiderArt } from '../render/RiderArt';
import { readHelmetColor } from '../core/helmetColor';
import { EmergencySiren } from '../audio/EmergencySiren';
import { RuleFeedback } from '../ui/RuleFeedback';
import { ProgressionHud } from '../ui/ProgressionHud';
import { ControlQuestionDialog } from '../ui/ControlQuestionDialog';
import { RoadAttention } from '../progression/RoadAttention';
import { SafetySeries } from '../progression/SafetySeries';
import { MissionHud } from '../ui/MissionHud';
import { MissionPhone } from '../ui/MissionPhone';
import { DialogueWindow } from '../ui/DialogueWindow';
import { ReplayBuffer, type ReplayFrame } from '../gameplay/ReplayBuffer';
import { TrafficEvents, propIds } from '../gameplay/TrafficEvents';
import { ReplayDialog } from '../ui/ReplayDialog';
import { TrafficEventNotice } from '../ui/TrafficEventNotice';
import { EventArt } from '../render/EventArt';
import { ReplayHighlight } from '../render/ReplayHighlight';
import type {
  ForcedMissionEvent,
  MissionDefinition,
} from '../content/missions';
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
  private riderArt!: RiderArt;
  private controls!: DrivingControls;
  private blocks!: Blocks;
  private props!: CityProps;
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
  private actorObstacles!: Obstacle[][];
  private actors!: TrafficArt[];
  private road!: TrainingRoad;
  private debug!: RuleDebugOverlay;
  private feedback!: RuleFeedback;
  private content!: GameContent;
  private progress!: MissionProgress;
  private mapChunks: GameObjects.Image[] = [];
  private mission?: MissionSystem;
  private series!: SafetySeries;
  private attention!: RoadAttention;
  private questionDialog!: ControlQuestionDialog;
  private progressionHud!: ProgressionHud;
  private freeRidePoints = 0;
  private missionTokens = 0;
  private resultPresented = false;
  private rivalSprite?: GameObjects.Image;
  private rivalLabel?: GameObjects.Text;
  private phone!: MissionPhone;
  private dialogue!: DialogueWindow;
  private phoneFeedback!: string;
  private missionHud?: MissionHud;
  private missionHudAt = -Infinity;
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
    for (const [key, url] of [
      ['training', tilesUrl],
      ['block-walls', blockWallsUrl],
      ['block-roofs', blockRoofsUrl],
      ['roof-details', roofDetailsUrl],
    ] as const)
      if (!this.textures.exists(key)) this.load.image(key, url);
    if (!this.textures.exists('props'))
      this.load.spritesheet('props', propsUrl, {
        frameWidth: 48,
        frameHeight: 48,
      });
    loadTrafficArt(this);
    this.load.on('loaderror', showError);
    this.load.once('complete', () => this.load.off('loaderror', showError));
  }

  create({ missionId, map }: { missionId?: string; map?: string } = {}) {
    this.obstacles = [];
    this.accumulator = 0;
    this.hudAt = 0;
    this.messageUntil = 0;
    this.content = this.registry.get('content') as GameContent;
    this.progress = this.registry.get('missionProgress') as MissionProgress;
    this.series ??= new SafetySeries(
      this.content.balans.combo,
      0,
      this.progress.longestSeries,
    );
    this.attention ??= new RoadAttention(
      this.content.balans.uwaga_drogowki,
      this.content.pytania.pytania,
    );
    this.missionTokens = 0;
    this.resultPresented = false;
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
    this.mission = definition ? this.createMission(definition) : undefined;
    const ambientTraffic = definition?.ruch_ai !== false;
    this.review = undefined;
    this.phoneAnsweredSafely = false;
    this.missionInterrupted = false;
    this.checkpointHint = undefined;
    this.missionHud = undefined;
    this.missionHudAt = -Infinity;
    this.missionMarker = undefined;
    this.displayedTarget = undefined;
    this.rulesRider.helmet.fastened = definition?.start.kask_zapiety ?? true;
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
      (rules) =>
        rules.reduce(
          (sum, ruleId) =>
            sum +
            this.progress.eventWeight(ruleId, this.content.balans.mastery),
          0,
        ) / rules.length,
      ambientTraffic,
      this.traffic.road.agents,
    );
    this.siren = new EmergencySiren();
    const tilemap = this.make.tilemap({ key: mapId });
    for (const { x = 0, y = 0 } of tilemap.getObjectLayer('map_decorations')
      ?.objects ?? []) {
      const bridge = this.add.graphics().setDepth(4);
      const top = { x: x - 40, y: y - 168 };
      bridge.lineStyle(2, 0xc0cbdc, 0.85);
      for (const offset of [-240, -156, -78, 78, 156, 240]) {
        bridge.lineBetween(top.x, top.y + Math.abs(offset) / 9, x + offset, y);
      }
      bridge.lineStyle(10, 0xf4f4f4).lineBetween(x, y, top.x, top.y);
      bridge.lineStyle(3, 0x94b0c2).lineBetween(x + 4, y, top.x + 4, top.y);
      bridge.lineStyle(4, 0xc0cbdc).lineBetween(x - 296, y, x + 278, y);
    }
    this.worldWidth = tilemap.widthInPixels;
    this.worldHeight = tilemap.heightInPixels;
    this.road = new TrainingRoad(
      this,
      this.world,
      mapId === 'warszawa'
        ? { key: mapId, width: this.worldWidth, height: this.worldHeight }
        : undefined,
    );
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
        id: obj.name || String(obj.id),
        roof: properties?.find((p) => p.name === 'roof')?.value as
          string | undefined,
        wall: properties?.find((p) => p.name === 'wall')?.value as
          string | undefined,
        landmarkId: typeof landmarkId === 'string' ? landmarkId : undefined,
      });
    }
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
    const props = readProps(tilemap.getObjectLayer('props')?.objects ?? []);
    this.mapChunks = [
      ...drawMapGround(this, tilemap, mapId, this.world, buildings, props),
      ...this.road.staticChunks,
    ];
    this.props = new CityProps(this, props);
    this.blocks = new Blocks(this, buildings, mapId);
    this.agents = [...this.traffic.road.agents, ...this.traffic.routed];
    this.replay = new ReplayBuffer(this.agents.length, propIds.length);
    this.actorObstacles = this.agents.map((agent) =>
      createTrafficObstacles(agent, this.world.metersPerPixel),
    );
    this.eventObstacles = propIds.map((id) => {
      const size = id === 'rowerzysta_pod_prad' ? 16 : 10;
      return { x: -1000, y: -1000, width: size, height: size, kind: 'wall' };
    });
    this.obstacles.push(...this.actorObstacles.flat(), ...this.eventObstacles);
    const variants = {
      car: 0,
      tram: 0,
      pedestrian: 0,
      cyclist: 0,
      emergency: 0,
    };
    this.actors = this.agents.map(
      ({ kind }) => new TrafficArt(this, kind, variants[kind]++, mapId),
    );
    this.rivalSprite = this.mission?.race
      ? this.add
          .image(0, 0, 'traffic-cyclist', 0)
          .setDepth(17)
          .setTint(0xef7d57)
      : undefined;
    this.rivalLabel = this.mission?.race
      ? this.add
          .text(0, 0, ui.dialogi.postacie.turbo, {
            color: '#ffd4ae',
            fontSize: '14px',
            backgroundColor: '#1a1c2c',
          })
          .setOrigin(0.5, 1)
          .setDepth(24)
      : undefined;
    this.updateRival();
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
    this.riderArt = new RiderArt(this, readHelmetColor());
    this.cameras.main
      .setZoom(drivingZoom)
      .setBounds(0, 0, this.worldWidth, this.worldHeight)
      .centerOn(this.rider.x, this.rider.y);
    cullMapChunks(this.mapChunks, this.cameras.main);
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
    this.progressionHud = new ProgressionHud(
      this.controls.root,
      this.content.balans.uwaga_drogowki.max,
      this.series.glowing,
    );
    this.questionDialog = new ControlQuestionDialog(
      this.controls.root,
      (index) => {
        const answer = this.attention.answer(index);
        if (!answer) return;
        this.progress.recordControlAnswer(
          answer.ruleId,
          answer.correct,
          this.content.balans.mastery,
        );
        if (this.mission) this.mission.answerQuestion(answer.points);
        else this.freeRidePoints += answer.points;
        this.updateProgressionHud();
        return answer;
      },
      () => {
        this.controls.clear();
        this.presentMissionResult();
        this.updateMissionHud();
        if (!this.mission?.result) this.missionHud?.focusEquipment();
      },
    );
    this.updateProgressionHud();
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
        () => this.takePhoto(),
        () => this.reset(),
        () => this.scene.start('MainMenu'),
      );
      this.updateMissionHud();
    }
    this.resetRules();
    this.recordFrame(-FIXED_STEP);
    this.debug = new RuleDebugOverlay(this, this.world, this.controls.root);
    this.controls.setWalking(false);
    const onShutdown = () => {
      this.missionHud?.destroy();
      this.stopListeningForVerdicts?.();
      this.stopListeningForVerdicts = undefined;
      this.game.canvas.classList.remove('training-dusk');
      this.renderEnvironment.time = 'day';
      this.siren.destroy();
      this.debug.destroy();
      this.replayDialog.close();
      this.questionDialog.close();
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
      delete c.dataset.stopReady;
      delete c.dataset.drivewayStopReady;
      delete c.dataset.signalReady;
      delete c.dataset.trafficEvent;
      delete c.dataset.officerCleared;
    };
    this.events.once('shutdown', onShutdown);
    this.game.canvas.dataset.scene = 'City';
    this.game.canvas.dataset.map = mapId;
    if (definition) this.game.canvas.dataset.mission = definition.id;
    this.game.canvas.setAttribute('aria-label', areaTitle);
    this.controls.speed.textContent = `0 ${ui.driving.unit}`;
    this.publishRiderPosition(this.rider);
    this.renderFrame(this.replay.frame(0)!, 0);
    this.openMissionDialogue();
  }

  private availableOrders() {
    return this.content.misje.filter(
      (mission) =>
        this.cache.tilemap.exists(mission.mapa ?? mission.miasto) &&
        this.progress.isAvailable(mission, this.content),
    );
  }

  private togglePhone() {
    if (this.phone.open) {
      this.phone.close();
      return;
    }
    if (this.dialogue.open || this.review || this.questionDialog.open) return;
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
    if (
      this.phone.open ||
      this.dialogue.open ||
      this.review ||
      this.questionDialog.open
    )
      return true;
    if (event.code === 'KeyG' && !event.repeat && this.respondToEvent()) {
      event.preventDefault();
      return true;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    if (event.code === 'KeyP' && !event.repeat && this.takePhoto()) {
      event.preventDefault();
      return true;
    }
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
    if (this.questionDialog.open) {
      this.questionDialog.gamepad(justPressed);
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
    if (!this.phone.open) return justPressed(0) && this.takePhoto();
    if (justPressed(1)) this.phone.close();
    else if (justPressed(0)) this.phone.activate();
    else if (justPressed(12)) this.phone.focusOrder(-1);
    else if (justPressed(13)) this.phone.focusOrder(1);
    return true;
  }

  private openMissionDialogue() {
    if (!this.mission) return;
    const lines = this.progress.opening(
      this.mission.definition,
      this.content.dialogi,
    );
    this.dialogue.show(lines, () => this.missionHud?.focusEquipment());
  }

  private presentMissionResult() {
    const mission = this.mission;
    const result = mission?.result;
    if (!result || this.resultPresented) return;
    this.resultPresented = true;
    this.rider.speed = 0;
    this.controls.clear();
    if (result.status === 'completed') {
      const { definition } = mission;
      this.missionTokens = this.progress.complete(definition, {
        points: result.points,
        stars: result.stars,
        balance: this.content.balans.gwiazdki,
      });
      this.updateMissionHud();
      this.dialogue.show(
        missionLines(this.content.dialogi, definition.dialog_koniec),
        () => this.missionHud?.focusResult(),
      );
    } else {
      this.updateMissionHud();
      this.missionHud?.focusResult();
    }
  }

  private updateProgressionHud() {
    const { multiplier, longest, glowing } = this.series;
    this.progressionHud.update(
      Math.max(0, this.mission?.points ?? this.freeRidePoints),
      multiplier,
      longest,
      glowing,
      this.attention.level,
      this.time.now,
    );
  }

  private showControlQuestion() {
    const question = this.attention.pending;
    if (!question) return false;
    this.rider.speed = 0;
    this.controls.clear();
    this.publishRiderPosition(this.rider);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.updateProgressionHud();
    this.updateMissionHud();
    this.questionDialog.show(question);
    return true;
  }

  private message(text: string) {
    this.controls.notice.textContent = text;
    this.messageUntil = this.time.now + 2600;
  }
  private toggleMode() {
    if (
      this.controls.paused ||
      this.review ||
      this.questionDialog.open ||
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
      this.mission = this.createMission(this.mission.definition);
      this.missionTokens = 0;
      this.resultPresented = false;
      this.updateProgressionHud();
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
    this.environment.officerOrders = undefined;
    this.updateRival();
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
      this.questionDialog.open ||
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

  private createMission(definition: MissionDefinition) {
    return new MissionSystem(
      definition,
      this.world,
      this.content.balans,
      definition.wyscig &&
        new MissionRace(
          definition.wyscig.trasa_rywala,
          definition,
          this.world,
          this.content,
        ),
      this.series.consecutive,
    );
  }

  private takePhoto() {
    if (
      this.dialogue.open ||
      this.review ||
      this.phone.open ||
      this.controls.paused ||
      this.missionInterrupted
    )
      return false;
    const scale = this.world.metersPerPixel;
    const captured = this.mission?.photograph(
      { x: this.rider.x * scale, y: this.rider.y * scale },
      this.rider.speed,
    );
    if (captured) this.updateMissionHud();
    return Boolean(captured);
  }

  private updateRival() {
    const rival = this.mission?.race?.rider;
    if (!rival) return;
    const scale = 1 / this.world.metersPerPixel;
    const x = rival.pos.x * scale;
    const y = rival.pos.y * scale;
    if (this.rivalSprite) {
      this.rivalSprite.setPosition(x, y);
      drawCyclist(this.rivalSprite, rival.heading, 1, 2);
    }
    this.rivalLabel?.setPosition(x, y - 12);
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
      this.rider.speed,
      this.missionTokens,
      this.progress.tokens,
    );
  }

  private syncActorObstacles() {
    const scale = 1 / this.world.metersPerPixel;
    for (let i = 0; i < this.agents.length; i++) {
      placeTrafficObstacles(
        this.actorObstacles[i]!,
        this.agents[i]!,
        this.world.metersPerPixel,
      );
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
    this.environment.officerOrders = this.trafficEvents.officerOrders;
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
    for (const verdict of this.tickVerdicts) this.series.receive(verdict.kind);
    if (this.tickVerdicts.length)
      this.progress.recordRide(
        this.tickVerdicts,
        this.series.longest,
        this.content.balans.mastery,
      );
    this.attention.step(this.tickVerdicts, rider.speed > 0);
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
      rider.speed,
      Boolean(this.attention.pending),
    );
    this.updateRival();
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
      !this.mission?.waitingForQuestion &&
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
      this.updateProgressionHud();
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
    if (retry && !this.mission?.result && !this.mission?.waitingForQuestion)
      this.returnToCheckpoint(this.mission?.rewindCheckpoint());
    else this.cameras.main.centerOn(this.rider.x, this.rider.y);
    this.feedback.reset(this.rules.counts);
    this.renderFrame(this.replay.frame(this.replay.size - 1)!, 0);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.updateMissionHud();
    if (this.showControlQuestion()) return;
    this.presentMissionResult();
    if (!this.mission?.result) this.missionHud?.focusEquipment();
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
        Boolean(this.mission?.result || this.mission?.waitingForQuestion),
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
      this.questionDialog.open ||
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
      if (
        this.review ||
        this.attention.pending ||
        this.missionInterrupted ||
        this.mission?.result
      ) {
        this.accumulator = 0;
        if (!this.review && !this.showControlQuestion())
          this.presentMissionResult();
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
    this.updateProgressionHud();
    this.feedback.update(this.rules.at);
    this.eventNotice.update(
      this.trafficEvents.notice,
      this.phoneAnsweredSafely,
    );
    if (
      this.missionHud &&
      (time - this.missionHudAt >= 50 ||
        this.missionInterrupted ||
        this.mission?.result)
    ) {
      this.missionHudAt = time;
      this.updateMissionHud();
    }
    this.publishRiderPosition(this.rider);
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

  private publishRiderPosition(r: Rider) {
    const canvas = this.game.canvas;
    const x = String(Math.round(r.x));
    const y = String(Math.round(r.y));
    const pxPerSecond = String(r.speed);
    if (canvas.dataset.x !== x) canvas.dataset.x = x;
    if (canvas.dataset.y !== y) canvas.dataset.y = y;
    if (canvas.dataset.speed !== pxPerSecond)
      canvas.dataset.speed = pxPerSecond;
    const walking = String(r.walking);
    if (canvas.dataset.walking !== walking) canvas.dataset.walking = walking;
  }

  private updateDrivingHud(r: Rider, actions: typeof this.controls.actions) {
    const speed = `${Math.round(r.speed * METERS_PER_PIXEL * 3.6)} ${ui.driving.unit}`;
    if (this.controls.speed.textContent !== speed)
      this.controls.speed.textContent = speed;
    const canvas = this.game.canvas;
    const signalReady = String(this.rules.signalReady);
    if (canvas.dataset.signalReady !== signalReady)
      canvas.dataset.signalReady = signalReady;
    const drivewayStopReady = String(this.rules.drivewayStopReady);
    if (canvas.dataset.drivewayStopReady !== drivewayStopReady)
      canvas.dataset.drivewayStopReady = drivewayStopReady;
    const stopReady = String(this.rules.stopReady);
    if (canvas.dataset.stopReady !== stopReady)
      canvas.dataset.stopReady = stopReady;
    const notice = this.trafficEvents.notice;
    const trafficEvent = notice?.id ?? '';
    if (canvas.dataset.trafficEvent !== trafficEvent)
      canvas.dataset.trafficEvent = trafficEvent;
    const officerCleared = String(Boolean(notice?.officerCleared));
    if (canvas.dataset.officerCleared !== officerCleared)
      canvas.dataset.officerCleared = officerCleared;
    const signal = this.rules.signal;
    const inputs = JSON.stringify({
      ...actions,
      signal: signal === 'none' ? null : signal,
    });
    if (canvas.dataset.actions !== inputs) canvas.dataset.actions = inputs;
  }

  private renderFrame(frame: ReplayFrame, delta: number, reviewing = false) {
    const { rider: r, at, dusk } = frame;
    const camera = this.cameras.main,
      look = r.speed * 0.5;
    const targetX = r.x + Math.cos(r.heading) * look - camera.width / 2,
      targetY = r.y + Math.sin(r.heading) * look - camera.height / 2;
    const blend = 1 - Math.exp(-delta / 160);
    camera.setScroll(
      Math.round(camera.scrollX + (targetX - camera.scrollX) * blend),
      Math.round(camera.scrollY + (targetY - camera.scrollY) * blend),
    );
    cullMapChunks(this.mapChunks, camera);
    this.blocks.update(camera, this.controls.lite, r.x, r.y);
    this.props.update(camera, this.controls.lite, this.blocks.cameraHeight);
    const scale = 1 / this.world.metersPerPixel;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const sirenArt = this.sirenArt.clear();
    let reflected = false;
    let sirenVolume = 0;
    let bearing = 0;
    for (let index = 0; index < this.agents.length; index++) {
      const agent = this.agents[index]!;
      const pose = frame.actors[index]!;
      const art = this.actors[index]!;
      const x = Math.round(pose.x * scale);
      const y = Math.round(pose.y * scale);
      const visible =
        pose.active &&
        Math.abs(x - centerX) <= halfWidth + art.reach &&
        Math.abs(y - centerY) <= halfHeight + art.reach;
      art.draw(x, y, visible, pose, at);
      if (
        dusk &&
        visible &&
        !reflected &&
        (agent.kind === 'car' ||
          agent.kind === 'emergency' ||
          agent.kind === 'tram')
      ) {
        const dx = r.x - x;
        const dy = r.y - y;
        if (Math.abs(dx) < 85 && Math.abs(dy) < 85) {
          const distance = Math.hypot(dx, dy);
          reflected =
            distance <= 85 &&
            dx * Math.cos(pose.heading) + dy * Math.sin(pose.heading) >
              distance * 0.94 &&
            dx * Math.cos(r.heading) + dy * Math.sin(r.heading) >
              distance * 0.7;
        }
      }
      if (pose.active && agent.kind === 'emergency' && pose.signalActive) {
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
    this.riderArt.draw(frame, reflected, !reviewing && this.series.glowing);
    this.eventArt.draw(frame.props, scale, at);
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

import { Scene, GameObjects } from 'phaser';
import { drawMapDecorations } from '../render/MapDecorations';
import trainingUrl from '../../maps/miasteczko.tmj?url';
import warsawUrl from '../../maps/warszawa.tmj?url';
import wroclawUrl from '../../maps/wroclaw.tmj?url';
import blockWallsUrl from '../../assets/generated/walls.png?url';
import blockRoofsUrl from '../../assets/generated/roofs.png?url';
import roofDetailsUrl from '../../assets/generated/roof-details.png?url';
import propsUrl from '../../assets/generated/props.png?url';
import tilesUrl from '../../assets/generated/tiles.png?url';
import {
  BRAKE_DECELERATION,
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
import { CityAtmosphere } from '../render/CityAtmosphere';
import { NightLighting, loadCityEffects } from '../render/NightLighting';
import { CityProps, readProps } from '../render/CityProps';
import { cullMapChunks, drawMapGround } from '../render/MapGround';
import { DrivingControls } from '../ui/DrivingControls';
import { showError, translate, ui } from '../core/presentation';

import { nearbyPhotoSubject } from '../gameplay/signPhoto';
import type { ExamResult, ExamRide } from '../gameplay/exam/exam';
import { examRoute } from '../gameplay/exam/route';
import { MissionRace } from '../gameplay/MissionRace';
import {
  missionEnvironment,
  missionTime,
} from '../gameplay/missionEnvironment';
import { MissionSystem, type MissionSpawn } from '../gameplay/MissionSystem';
import {
  canOpenPhone,
  missionLines,
  type MissionProgress,
} from '../gameplay/MissionProgress';
import type { MissionCity } from '../content/missions';
import type { GameContent } from '../content/schemas';
import { RuleDebugOverlay } from '../render/RuleDebugOverlay';
import { TrainingRoad } from '../render/TrainingRoad';
import { IntersectionManager } from '../rules/priority/IntersectionManager';
import { RuleEngine } from '../rules/RuleEngine';
import { lightsRequired } from '../rules/detectors/MSC-04';
import type {
  AgentState,
  EnvState,
  RiderState,
  Vec2,
  Verdict,
} from '../rules/types';
import { WorldModel } from '../rules/world/WorldModel';
import {
  TrafficParticipants,
  type RoutedAgent,
} from '../sim/TrafficParticipants';
import type { RoadTrafficAgent } from '../sim/TrafficSimulation';
import { Gnomes } from '../render/Gnomes';
import { drawCyclist, loadTrafficArt, TrafficArt } from '../render/TrafficArt';
import { RiderArt } from '../render/RiderArt';
import { readHelmetColor } from '../core/helmetColor';
import { audio } from '../audio/GameAudio';
import { CitySound } from '../audio/CitySound';
import { radioControls } from '../ui/AudioControls';
import { RuleFeedback } from '../ui/RuleFeedback';
import { DrivingHud } from '../ui/DrivingHud';
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
  private readonly graphics = { lite: false, rain: false };
  private rider!: Rider;
  private readonly weatherTuning = { brakeForce: BRAKE_DECELERATION };
  private riderArt!: RiderArt;
  private controls!: DrivingControls;
  private blocks!: Blocks;
  private props!: CityProps;
  private lighting!: NightLighting;
  private atmosphere!: CityAtmosphere;
  private hud!: DrivingHud;
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
  private citySound!: CitySound;
  private sirenArt!: GameObjects.Graphics;
  private readonly activeAgents: AgentState[] = [];
  private agents!: readonly (RoadTrafficAgent | RoutedAgent)[];
  private actorObstacles!: Obstacle[][];
  private actors!: TrafficArt[];
  private gnomes?: Gnomes;
  private askedGnome?: string;
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
  private campaignCity!: MissionCity;
  private examRide?: ExamRide;
  private freeRidePoints = 0;
  private missionTokens = 0;
  private resultPresented = false;
  private rivalSprite?: GameObjects.Image;
  private rivalLabel?: GameObjects.Text;
  private companions: GameObjects.Image[] = [];
  private phone!: MissionPhone;
  private dialogue!: DialogueWindow;
  private phoneFeedback!: string;
  private missionHud?: MissionHud;
  private missionHudAt = -Infinity;
  private photoPending = false;
  private breakMinutes = 0;
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
  private readonly flushProgress = () => {
    void this.progress.store.flush();
  };
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
      ['wroclaw', wroclawUrl],
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
    loadCityEffects(this);
    this.load.on('loaderror', showError);
    this.load.once('complete', () => this.load.off('loaderror', showError));
  }

  create({
    missionId,
    map,
    city,
    examRide,
  }: {
    missionId?: string;
    map?: string;
    city?: MissionCity;
    examRide?: ExamRide;
  } = {}) {
    this.examRide = examRide;
    if (examRide) this.sys.settings.data = {};
    this.obstacles = [];
    this.accumulator = 0;
    this.hudAt = 0;
    this.messageUntil = 0;
    this.content = this.registry.get('content') as GameContent;
    this.progress = this.registry.get('missionProgress') as MissionProgress;
    this.campaignCity = examRide?.city ?? city ?? this.progress.selectedCity;
    this.progress.milestones(this.content);
    this.breakMinutes = this.progress.breakMinutes(
      this.content.balans.zdrowe_granie,
    );
    this.photoPending = false;
    this.askedGnome = undefined;
    this.progress.store.prepareRide(this.content.przepisy.przepisy);
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
    const definition = examRide
      ? examRoute(examRide.city, this.content.balans.licencja)
      : this.availableOrders().find(({ id }) => id === missionId);
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
    Object.assign(this.environment, missionEnvironment(this.world, definition));
    Object.assign(this.renderEnvironment, this.environment);
    this.weatherTuning.brakeForce =
      BRAKE_DECELERATION *
      this.content.balans.silnik.przyczepnosc[this.environment.weather];
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
      !ambientTraffic
        ? 'mission-only'
        : mapId === 'wroclaw' && !definition
          ? 'ambient'
          : 'scheduled',
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
    const tilemap = this.make.tilemap({ key: mapId });
    const scenery = drawMapDecorations(this, tilemap, mapId);
    this.citySound = new CitySound(this.world, scenery.peacocks);
    this.worldWidth = tilemap.widthInPixels;
    this.worldHeight = tilemap.heightInPixels;
    this.road = new TrainingRoad(
      this,
      this.world,
      mapId !== defaultMap
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
      ...scenery.chunks,
    ];
    this.props = new CityProps(this, props);
    this.blocks = new Blocks(this, buildings, mapId);
    this.lighting = new NightLighting(this, this.props, scenery.neons);
    this.atmosphere = new CityAtmosphere(this, this.blocks, props, (at) =>
      this.citySound.pigeon(at),
    );
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
    this.companions = Array.from({ length: definition?.towarzysze ?? 0 }, () =>
      this.add.image(0, 0, 'traffic-cyclist').setDepth(17).setVisible(false),
    );
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
    this.riderArt = new RiderArt(
      this,
      readHelmetColor(),
      this.progress.store.profile.licencePassed,
    );
    this.cameras.main
      .setZoom(drivingZoom)
      .setBounds(0, 0, this.worldWidth, this.worldHeight)
      .centerOn(this.rider.x, this.rider.y);
    cullMapChunks(this.mapChunks, this.cameras.main);
    const areaTitle =
      mapId === 'warszawa'
        ? ui.driving.warsawTitle
        : mapId === 'wroclaw'
          ? ui.driving.wroclawTitle
          : ui.driving.title;
    this.controls = new DrivingControls(
      examRide ? ui.exam.ride : areaTitle,
      this.graphics,
      () => this.toggleMode(),
      examRide ? undefined : () => this.reset(),
      () => this.scene.start('MainMenu'),
      this.flushProgress,
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
        this.feedback.setDebugVisible(visible);
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
      this.progress.store,
    );
    const radio = radioControls(this.progress.store);
    this.controls.quickActions.append(radio.widget);
    this.controls.onResume = radio.refresh;
    if (mapId === defaultMap && !this.mission) {
      const plac = document.createElement('button');
      plac.type = 'button';
      plac.className = 'ride-plac';
      plac.textContent = ui.plac.short;
      plac.title = ui.plac.title;
      plac.setAttribute('aria-label', ui.plac.title);
      plac.addEventListener('click', () =>
        this.scene.start('Plac', { origin: 'City' }),
      );
      this.controls.root.append(plac);
    }
    const collectibles = tilemap.getObjectLayer('collectibles')?.objects;
    this.gnomes = collectibles?.length
      ? new Gnomes(
          this,
          collectibles,
          this.progress.store,
          this.controls.details,
        )
      : undefined;
    if (!this.mission) {
      const camera = document.createElement('button');
      camera.type = 'button';
      camera.className = 'ride-camera';
      camera.setAttribute('aria-label', ui.m5c.camera);
      camera.title = ui.m5c.camera;
      camera.addEventListener('click', () => this.takePhoto(true));
      this.controls.quickActions.append(camera);
    }
    this.hud = new DrivingHud(
      this.controls.root,
      this.controls.details,
      this.controls.progressDetails,
      this.content.balans.uwaga_drogowki.max,
      this.series.glowing,
    );
    this.phone = new MissionPhone(
      this.controls.root,
      this.controls.quickActions,
      () => this.togglePhone(),
      (id) => {
        if (
          this.phone.open &&
          canOpenPhone(this.rider.speed) &&
          (!this.mission || this.mission.result) &&
          this.availableOrders().some((order) => order.id === id)
        )
          this.scene.restart({ missionId: id, city: this.campaignCity });
      },
    );
    this.phone.button.hidden = !!examRide;
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
      this.progress.store,
    );
    this.feedback = new RuleFeedback(
      this.controls.root,
      this.content.przepisy.przepisy,
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
        this.hud.timerSlot,
        () => {
          this.rulesRider.helmet.fastened = true;
          this.updateMissionHud();
        },
        () => {
          this.controls.setLights(true);
          this.updateMissionHud();
        },
        () => {
          audio.stopReading('lesson');
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
    const lifecycle = new AbortController();
    const { signal } = lifecycle;
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.flushProgress();
      },
      { signal },
    );
    window.addEventListener('pagehide', this.flushProgress, { signal });
    const onShutdown = () => {
      lifecycle.abort();
      this.flushProgress();
      this.missionHud?.destroy();
      this.stopListeningForVerdicts?.();
      this.stopListeningForVerdicts = undefined;
      delete this.game.canvas.dataset.lighting;
      delete this.game.canvas.dataset.weather;
      this.renderEnvironment.time = 'day';
      audio.leave();
      this.debug.destroy();
      this.replayDialog.close();
      this.questionDialog.close();
      this.dialogue.destroy();
      this.phone.close();
      this.controls.destroy();
      this.examRide = undefined;
      this.gnomes = undefined;
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
    const frame = this.replay.frame(0)!;
    this.renderFrame(frame, 0);
    this.updateHudConditions(frame);
    this.openMissionDialogue();
  }

  private availableOrders() {
    return this.content.misje.filter(
      (mission) =>
        mission.miasto === this.campaignCity &&
        this.cache.tilemap.exists(mission.mapa ?? mission.miasto) &&
        this.progress.isAvailable(mission, this.content),
    );
  }

  private togglePhone() {
    if (this.examRide) return;
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
    if (!this.phone.open)
      return this.mission
        ? justPressed(0) && this.takePhoto()
        : justPressed(15) && this.takePhoto(true);
    if (justPressed(1)) this.phone.close();
    else if (justPressed(0)) this.phone.activate();
    else if (justPressed(12)) this.phone.focusOrder(-1);
    else if (justPressed(13)) this.phone.focusOrder(1);
    return true;
  }

  private openMissionDialogue() {
    if (this.examRide) {
      this.dialogue.show(
        [
          {
            postac: 'sierzant_ola',
            emocja: 'neutral',
            tekst: 'exam.rideIntro',
          },
        ],
        () => this.controls.focus(),
      );
      return;
    }
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
    if (this.examRide) {
      const ride = {
        completed: result.status === 'completed',
        minor: 0,
        major: 0,
      };
      for (const { kind } of result.verdicts) if (kind !== 'good') ride[kind]++;
      const examResult: ExamResult = { ...this.examRide, ride };
      this.scene.start('MainMenu', { examResult });
      return;
    }
    if (result.status === 'completed') {
      const { definition } = mission;
      const { progress, content } = this;
      const unlocks = progress.unlocks(content);
      const nextOrders = content.misje.filter(
        (order) =>
          order.miasto === this.campaignCity &&
          !progress.store.profile.completed.includes(order.id) &&
          !progress.isAvailable(order, content),
      );
      this.missionTokens = progress.complete(definition, {
        points: result.points,
        stars: result.stars,
        balance: this.content.balans.gwiazdki,
        clean: !result.verdicts.some(({ kind }) => kind !== 'good'),
      });
      this.updateMissionHud();
      if (result.stars > 0) audio.play('stars');
      if (
        nextOrders.some((order) => progress.isAvailable(order, content)) ||
        [...progress.unlocks(content)].some((item) => !unlocks.has(item))
      )
        audio.play('unlock', 1, result.stars > 0 ? 0.75 : 0);
      this.dialogue.show(
        missionLines(this.content.dialogi, definition.dialog_koniec),
        () => this.missionHud?.focusResult(),
      );
    } else {
      this.flushProgress();
      this.updateMissionHud();
      this.missionHud?.focusResult();
    }
  }

  private updateProgressionHud() {
    const { multiplier, longest, glowing } = this.series;
    this.hud.updateProgression(
      this.mission?.points ?? this.freeRidePoints,
      multiplier,
      longest,
      glowing,
      this.attention.level,
      this.time.now,
    );
  }

  private showMissionChoice() {
    const mission = this.mission;
    const goal = mission?.pendingChoice;
    if (!mission || !goal) return false;
    this.rider.speed = 0;
    this.controls.clear();
    this.publishRiderPosition(this.rider);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.questionDialog.show(
      {
        pytanie: translate(goal.pytanie),
        odpowiedzi: goal.odpowiedzi.map((key) => translate(key)),
        wyjasnienie: translate(goal.wyjasnienie),
      },
      (index) => {
        const answer = mission.answerChoice(index);
        if (answer)
          this.progress.recordQuizAnswer(
            answer.ruleId,
            answer.correct,
            this.content.balans.mastery,
          );
        this.updateProgressionHud();
        return answer;
      },
    );
    return true;
  }

  private showGnomeQuestion() {
    if (this.examRide) return false;
    const { x, y, walking } = this.rider;
    const gnomes = this.gnomes;
    const nearby = walking ? gnomes?.nearby(x, y) : undefined;
    if (!nearby) {
      this.askedGnome = undefined;
      return false;
    }
    if (
      nearby.id === this.askedGnome ||
      (this.mission && nearby.id !== this.mission.gnomeTarget)
    )
      return false;

    const questions = this.content.pytania.pytania;
    const question = questions[nearby.questionIndex % questions.length]!;
    this.askedGnome = nearby.id;
    this.rider.speed = 0;
    this.controls.clear();
    this.publishRiderPosition(this.rider);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.questionDialog.show(
      question,
      (index) => {
        const correct = index === question.poprawna;
        for (const rule of question.przepisy)
          this.progress.recordQuizAnswer(
            rule,
            correct,
            this.content.balans.mastery,
          );
        if (correct) gnomes?.collect(nearby.id);
        return { correct };
      },
      ui.driving.gnomeQuestion,
    );
    return true;
  }

  private showControlQuestion() {
    if (this.examRide) return false;
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
    if (this.controls.notice.textContent !== text) {
      if (text === ui.driving.collision) audio.play('oops');
      audio.read('feedback', text);
    }
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
    this.citySound.reset();
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
    this.atmosphere.reset();
    this.recordFrame(-FIXED_STEP);
    const frame = this.replay.frame(0)!;
    this.renderFrame(frame, 0);
    this.updateHudConditions(frame);
    this.openMissionDialogue();
  }
  private resetRules() {
    this.environment.time = missionTime(
      this.world,
      this.mission?.definition,
      0,
    );
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
    const balance = this.content.balans;
    return new MissionSystem(
      definition,
      this.world,
      this.examRide
        ? {
            ...balance,
            misja: {
              ...balance.misja,
              major_do_porazki: balance.licencja.przejazd_max_major + 1,
            },
          }
        : balance,
      definition.wyscig &&
        new MissionRace(
          definition.wyscig.trasa_rywala,
          definition,
          this.world,
          this.content,
        ),
      this.examRide ? 0 : this.series.consecutive,
    );
  }

  private takePhoto(showHint = false) {
    if (
      this.photoPending ||
      this.dialogue.open ||
      this.review ||
      this.phone.open ||
      this.questionDialog.open ||
      this.controls.paused ||
      this.missionInterrupted ||
      this.mission?.result
    )
      return false;
    const scale = this.world.metersPerPixel;
    const position = { x: this.rider.x * scale, y: this.rider.y * scale };
    const { speed, walking } = this.rider;
    const milestones = this.progress.milestones(this.content);
    const { signPhotos } = this.progress.store.profile;
    const goal = this.mission?.target?.goal;
    if (
      goal?.typ === 'sfotografuj' &&
      this.mission?.photograph(position, speed)
    ) {
      const sign = this.world.signs.find(({ id }) => id === goal.znak);
      if (
        sign &&
        milestones.signs.has(sign.code) &&
        !Object.hasOwn(signPhotos, sign.code)
      )
        this.captureSign(sign);
      this.updateMissionHud();
      return true;
    }
    if (this.mission) return false;

    const sign = nearbyPhotoSubject(
      this.world,
      position,
      speed,
      walking,
      milestones.signs,
      signPhotos,
      this.content.balans.album.zasieg_zdjecia_m,
    );
    if (sign) this.captureSign(sign);
    else if (showHint || walking) this.message(ui.m5c.noPhoto);
    return Boolean(sign);
  }

  private captureSign(sign: Vec2 & { code: string }) {
    const camera = this.cameras.main;
    const scale = this.world.metersPerPixel;
    const centerX =
      camera.x + (sign.x / scale - camera.worldView.x) * camera.zoomX;
    const centerY =
      camera.y + (sign.y / scale - camera.worldView.y) * camera.zoomY;
    const size = 64;
    const { width, height } = this.game.canvas;
    const x = Math.max(
      0,
      Math.min(width - size, Math.round(centerX - size / 2)),
    );
    const y = Math.max(
      0,
      Math.min(height - size, Math.round(centerY - size / 2)),
    );

    this.photoPending = true;
    const { progress, content, controls } = this;
    this.game.renderer.snapshotArea(x, y, size, size, (image) => {
      if (this.controls === controls) this.photoPending = false;
      if (image instanceof HTMLImageElement) {
        if (
          progress.photograph(content, sign.code, image.src) &&
          controls.root.isConnected
        ) {
          audio.play('unlock');
          this.message(ui.m5c.photoSaved);
        }
      } else if (controls.root.isConnected) {
        this.message(ui.m5c.photoFailed);
      }
    });
  }

  private showBreakReminder() {
    const reminder = document.createElement('aside');
    reminder.className = 'break-reminder';
    const speaker = document.createElement('strong');
    speaker.textContent = ui.m5c.kazik;
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = ui.m5c.dismiss;
    close.addEventListener('click', () => reminder.remove());
    reminder.append(speaker, message, close);
    this.controls.root.append(reminder);
    message.textContent = ui.m5c.breakMessage;
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
      this.environment,
      this.rider,
      actions,
      this.agents,
      this.trafficEvents.props,
      this.rules.signal === 'none' ? null : this.rules.signal,
      this.progress.store.profile.reflectiveVest,
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
    rider.reflectiveVest = this.progress.store.profile.reflectiveVest;
    this.environment.time = missionTime(
      this.world,
      this.mission?.definition,
      this.rules.at + FIXED_STEP,
    );
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
    if (!this.examRide) {
      for (const verdict of this.tickVerdicts)
        this.series.receive(verdict.kind);
      this.progress.recordRide(
        this.tickVerdicts,
        this.series.longest,
        this.content.balans.mastery,
      );
      this.attention.step(this.tickVerdicts, rider.speed > 0);
    }
    const gnome = this.mission?.gnomeTarget;
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
      !this.examRide && Boolean(this.attention.pending),
      source.walking &&
        gnome !== undefined &&
        this.progress.store.profile.gnomes?.includes(gnome),
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
      if (this.mission?.result) this.flushProgress();
      if (lesson.kind === 'minor') this.reviewedMinor.add(lesson.ruleId);
      this.review = { verdict: lesson, elapsed: 0, shown: false };
      audio.setActivity(true, true);
      audio.stopReading('feedback');
      audio.play('oops');
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
      audio.read('lesson', this.checkpointHint);
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
    audio.stopReading('lesson');
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
    if (this.showControlQuestion() || this.showMissionChoice()) return;
    this.presentMissionResult();
    if (!this.mission?.result) this.missionHud?.focusEquipment();
  }

  private updateReview(delta: number) {
    const review = this.review!;
    const reduced = this.reducedEffects;
    review.elapsed += Math.min(delta, 100);
    const intro = reduced ? 1 : Math.min(1, review.elapsed / reviewIntroMs);
    const camera = this.cameras.main;
    if (!review.shown && intro >= 1) {
      review.shown = true;
      this.feedback.reset(this.rules.counts);
      const explanation = this.feedback.explanation(review.verdict);
      audio.read('lesson', explanation);
      this.replayDialog.show(
        explanation,
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
    const quiet =
      this.controls.paused ||
      this.phone.open ||
      this.portraitTouch.matches ||
      document.hidden;
    audio.setActivity(
      !quiet &&
        (!this.mission?.result || this.dialogue.open || Boolean(this.review)),
      this.dialogue.open ||
        this.questionDialog.open ||
        this.missionInterrupted ||
        Boolean(this.review),
    );
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
      this.portraitTouch.matches ||
      document.hidden
    ) {
      this.accumulator = 0;
      audio.updateSiren(0);
      if (this.controls.paused) audio.stopReading('feedback');
      return;
    }
    this.citySound.input(this.rider, input, this.controls.actions.bell);
    const seconds = Math.min(delta / 1000, 0.1);
    if (this.progress.playFor(seconds, this.breakMinutes))
      this.showBreakReminder();
    this.accumulator += seconds;
    while (this.accumulator >= FIXED_STEP) {
      if (
        !this.mission?.preparingBike &&
        stepRider(
          this.rider,
          input,
          this.obstacles,
          this.worldWidth,
          this.worldHeight,
          FIXED_STEP,
          this.rider.walking ? undefined : this.weatherTuning,
        )
      )
        this.message(ui.driving.collision);
      this.stepWorld();
      this.accumulator -= FIXED_STEP;
      if (
        this.review ||
        (!this.examRide && this.attention.pending) ||
        this.mission?.pendingChoice ||
        this.missionInterrupted ||
        this.mission?.result
      ) {
        this.accumulator = 0;
        if (
          !this.review &&
          !this.showControlQuestion() &&
          !this.showMissionChoice()
        )
          this.presentMissionResult();
        break;
      }
      if (this.showGnomeQuestion()) {
        this.accumulator = 0;
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
      this.updateHudConditions(this.replay.frame(this.replay.size - 1)!);
      if (time > this.messageUntil) {
        const notice = sirenVolume > 0 ? ui.rules.emergencyApproaching : '';
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

  private get reducedEffects() {
    return (
      this.reducedMotion.matches || this.progress.store.profile.reducedEffects
    );
  }

  private renderedWeather(frame: ReplayFrame) {
    const { weather } = frame.environment;
    return weather === 'clear' && this.controls.rain ? 'rain_light' : weather;
  }

  private night(frame: ReplayFrame) {
    return this.controls.previewNight || frame.environment.time !== 'day';
  }

  private updateHudConditions(frame: ReplayFrame) {
    this.hud.updateConditions(
      this.rulesRider.helmet.fastened,
      this.controls.actions.lights,
      this.night(frame),
      this.renderedWeather(frame),
    );
  }

  private renderFrame(frame: ReplayFrame, delta: number, reviewing = false) {
    const { rider: r, at } = frame;
    const night = this.night(frame);
    const lowLight = night || lightsRequired(frame.environment);
    const weather = this.renderedWeather(frame);
    const reduced = this.reducedEffects;
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
    this.gnomes?.update(camera);
    this.blocks.update(
      camera,
      this.controls.lite,
      r.x,
      r.y,
      night && !this.controls.lite,
    );
    this.props.update(camera, this.controls.lite, this.blocks.cameraHeight);
    const scale = 1 / this.world.metersPerPixel;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const sirenArt = this.sirenArt.clear();
    let reflected = false;
    let sirenVolume = 0;
    let tramNearby = false;
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
        lowLight &&
        visible &&
        (agent.kind === 'car' ||
          agent.kind === 'emergency' ||
          agent.kind === 'tram')
      ) {
        const heading = agent.kind === 'tram' ? pose.tramFront : pose.heading;
        reflected =
          this.lighting.drawVehicle(x, y, heading, art.nose, r) || reflected;
      }
      if (
        visible &&
        agent.kind === 'tram' &&
        (x - r.x) ** 2 + (y - r.y) ** 2 < 225 ** 2
      )
        tramNearby = true;
      if (pose.active && agent.kind === 'emergency' && pose.signalActive) {
        const volume = Math.max(0, 1 - Math.hypot(x - r.x, y - r.y) / 560);
        if (volume > sirenVolume) {
          sirenVolume = volume;
          bearing = Math.atan2(y - r.y, x - r.x);
        }
      }
    }
    const active =
      !reviewing &&
      delta > 0 &&
      !this.dialogue.open &&
      !this.questionDialog.open &&
      !this.mission?.result;
    audio.updateSiren(active ? sirenVolume : 0);
    if (active)
      this.citySound.scan(
        at,
        r,
        this.rulesRider.pos,
        this.environment,
        tramNearby,
      );
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
    const illuminatesReflector = this.lighting.finishFrame(
      camera,
      night,
      lowLight,
      frame.actions.lights,
      r,
      reflected,
      at,
      reduced,
    );
    for (const [index, sprite] of this.companions.entries()) {
      const tail = this.replay.frame(this.replay.size - 1 - (index + 1) * 19);
      sprite.setVisible(Boolean(tail) && !reviewing);
      if (tail) {
        sprite.setPosition(tail.rider.x, tail.rider.y);
        drawCyclist(sprite, tail.rider.heading, 1, 2);
      }
    }
    this.riderArt.draw(frame, illuminatesReflector);
    this.eventArt.draw(frame.props, scale, at);
    this.atmosphere.draw(
      camera,
      r,
      Math.max(0, at),
      night,
      weather,
      this.controls.lite,
      reduced,
      this.series.glowing,
      reviewing,
    );
    const time = night ? 'night' : 'day';
    const canvas = this.game.canvas;
    if (canvas.dataset.lighting !== time) canvas.dataset.lighting = time;
    if (canvas.dataset.weather !== weather) canvas.dataset.weather = weather;
    this.renderEnvironment.time = frame.environment.time;
    this.renderEnvironment.weather = frame.environment.weather;
    this.road.updateLights(camera, Math.max(0, at), this.renderEnvironment);
    return sirenVolume;
  }
}

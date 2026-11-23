import proceduralRoutes from 'virtual:procedural-routes';
import {
  DailyOrderGenerator,
  dailyRivalScoreLimit,
  orderSeed,
  type DailyOrder,
} from '../gameplay/procedural/orders';
import {
  storyStepKey,
  storyTemplates,
} from '../gameplay/procedural/storyTemplates';
import { localDay } from '../progression/mastery';
import { campaignCompleted } from '../gameplay/exam/exam';
import { CityTutorial } from './CityTutorial';
import {
  examRideIntro,
  localizedVoiceLine,
  resultVoiceIds,
  ruleFeedbackLine,
  type VoiceLine,
  type voiceNoticeIds,
} from '../audio/voiceLines';
import { rankingSeed, RideEvidence } from '../rankings/evidence';
import { showBreakReminder } from '../ui/BreakReminder';
import { verdictHaptics } from '../platform/haptics';
import { Scene, GameObjects } from 'phaser';
import { drawMapDecorations } from '../render/MapDecorations';
import { DistrictGates } from '../render/DistrictGates';
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
import { DailyClientSprites } from '../render/DailyClientSprites';
import { cullMapChunks, drawMapGround } from '../render/MapGround';
import { DrivingControls } from '../ui/DrivingControls';
import { showError, translate, ui } from '../core/presentation';
import { showSignalCountdowns } from '../core/progressStore';

import { nearbyPhotoSubject } from '../gameplay/signPhoto';
import type { ExamResult, ExamRide } from '../gameplay/exam/exam';
import { MissionRace } from '../gameplay/MissionRace';
import {
  missionEnvironment,
  missionTime,
} from '../gameplay/missionEnvironment';
import {
  MissionSystem,
  type MissionResult,
  type MissionSpawn,
} from '../gameplay/MissionSystem';
import {
  canOpenPhone,
  missionLines,
  type MissionProgress,
} from '../gameplay/MissionProgress';
import type { MissionCity, PlayableCity } from '../content/missions';
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
import { TICKS_PER_SECOND } from '../rules/types';
import { WorldModel } from '../rules/world/WorldModel';
import {
  TrafficParticipants,
  type RoutedAgent,
} from '../sim/TrafficParticipants';
import type { RoadTrafficAgent } from '../sim/TrafficSimulation';
import { CityCollectibles } from '../render/CityCollectibles';
import { drawCyclist, loadTrafficArt, TrafficArt } from '../render/TrafficArt';
import { RiderArt } from '../render/RiderArt';
import { audio } from '../audio/GameAudio';
import { CitySound } from '../audio/CitySound';
import { activeDialog, gamepadMenu } from '../ui/KeyboardGamepad';
import { radioControls } from '../ui/AudioControls';
import { RuleFeedback } from '../ui/RuleFeedback';
import { DrivingHud } from '../ui/DrivingHud';
import { ControlQuestionDialog } from '../ui/ControlQuestionDialog';
import { RoadAttention } from '../progression/RoadAttention';
import { SafetySeries } from '../progression/SafetySeries';
import { MissionHud } from '../ui/MissionHud';
import { MissionFailureDialog } from '../ui/MissionFailureDialog';
import { MissionResults } from '../ui/MissionResults';
import { MissionPhone, type PhoneStory } from '../ui/MissionPhone';
import { DialogueWindow } from '../ui/DialogueWindow';
import { ReplayBuffer, type ReplayFrame } from '../gameplay/ReplayBuffer';
import { GloryReplay, type GloryClip } from '../gameplay/GloryReplay';
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

import {
  defaultMap,
  hasCityMap,
  startCity,
  startPlac,
  type PreparedCity,
} from './RideScenes';

const drivingZoom = 0.75;
const reviewIntroMs = 300;

export class City extends Scene {
  private readonly environment: EnvState = {
    time: 'day',
    weather: 'clear',
    visibilityLow: false,
  };
  private readonly renderEnvironment = { ...this.environment };
  private readonly graphics = { lite: false, rain: false };
  private autoQuality?: { last: number; frames: number; slow: number };
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
  private collectibles?: CityCollectibles;
  private askedCollectible?: string;
  private road!: TrainingRoad;
  private debug!: RuleDebugOverlay;
  private feedback!: RuleFeedback;
  private content!: GameContent;
  private progress!: MissionProgress;
  private mapChunks: GameObjects.Image[] = [];
  private renderedMap?: string;
  private mission?: MissionSystem;
  private tutorial?: CityTutorial;
  private tutorialMarker?: GameObjects.Graphics;
  private series!: SafetySeries;
  private attention!: RoadAttention;
  private questionDialog!: ControlQuestionDialog;
  private city!: PlayableCity;
  private districtGates?: DistrictGates;
  private examRide?: ExamRide;
  private freeRidePoints = 0;
  private rankingRide?: RideEvidence;
  private rankingCity?: MissionCity;
  private resultPresented = false;
  private results?: MissionResults;
  private failureDialog?: MissionFailureDialog;
  private readonly missionVerdictBatches: Verdict[][] = [];
  private glory?: GloryReplay;
  private gloryClip?: GloryClip;
  private resultsElapsed?: number;
  private masteryAtStart = new Map<string, number>();
  private readonly compactResults = matchMedia('(max-width: 760px)');
  private rivalSprite?: GameObjects.Image;
  private rivalLabel?: GameObjects.Text;
  private companions: GameObjects.Image[] = [];
  private phone!: MissionPhone;
  private freeRide = false;
  private dailyOrder?: DailyOrder;
  private dailyClientSprites?: DailyClientSprites;
  private dailyOffers: readonly DailyOrder[] = [];
  private phoneStory?: PhoneStory;
  private readonly dailyGenerators = new Map<
    MissionCity,
    DailyOrderGenerator
  >();
  private dialogue!: DialogueWindow;
  private phoneFeedback!: VoiceLine;
  private missionHud?: MissionHud;
  private missionHudAt = -Infinity;
  private photoPending = false;
  private breakMinutes: number | null = null;
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
    '(pointer: coarse) and (orientation: portrait) and (max-width: 600px)',
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
    definition,
    mapId,
    city,
    examRide,
    freeRide = false,
    dailyOrder,
    tutorial,
  }: PreparedCity) {
    this.freeRide = freeRide;
    this.dailyOrder = dailyOrder;
    this.dailyOffers = [];
    this.phoneStory = undefined;
    this.examRide = examRide;
    if (examRide || tutorial) this.sys.settings.data = {};
    this.obstacles = [];
    this.accumulator = 0;
    this.hudAt = 0;
    this.messageUntil = 0;
    this.content = this.registry.get('content') as GameContent;
    this.progress = this.registry.get('missionProgress') as MissionProgress;
    const preference = this.progress.store.profile.graphicsQuality;
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.graphics.lite = preference
      ? preference === 'lite'
      : mobile && navigator.hardwareConcurrency <= 4;
    this.autoQuality =
      mobile && !preference && !this.graphics.lite
        ? { last: 0, frames: 0, slow: 0 }
        : undefined;
    this.city = city;
    if (this.renderedMap && this.renderedMap !== mapId)
      this.releaseMap(this.renderedMap);
    this.renderedMap = mapId;
    if (!tutorial) this.progress.milestones(this.content);
    this.breakMinutes = this.progress.breakMinutes(
      this.content.balans.zdrowe_granie,
    );
    this.photoPending = false;
    this.askedCollectible = undefined;
    if (!tutorial)
      this.progress.store.prepareRide(this.content.przepisy.przepisy);
    if (!this.series || (!examRide && (definition || this.mission))) {
      this.series = new SafetySeries(
        this.content.balans.combo,
        0,
        this.progress.longestSeries,
      );
      this.attention = new RoadAttention(
        this.content.balans.uwaga_drogowki,
        this.content.pytania.pytania,
      );
      this.reviewedMinor.clear();
    }
    this.resultPresented = false;
    this.failureDialog =
      this.results =
      this.gloryClip =
      this.resultsElapsed =
        undefined;
    this.rankingCity =
      mapId === 'warszawa' || mapId === 'wroclaw' ? mapId : undefined;
    this.startRankingRide(Boolean(definition));
    const rankingSeed = this.rankingRide?.seed;
    const cached = this.cache.tilemap.get(mapId) as { data: unknown };
    this.world = new WorldModel(
      cached.data,
      this.content.balans.silnik.kafel_m,
    );
    this.districtGates = this.world.districts.some(({ unlock }) => unlock)
      ? new DistrictGates(this, this.world, this.obstacles)
      : undefined;
    this.districtGates?.update(this.progress.store.profile.completed);
    this.phoneFeedback = ruleFeedbackLine(
      'przepisy.MAN-11.feedback',
      this.content.przepisy.przepisy.find(({ id }) => id === 'MAN-11')!
        .feedback,
    );
    this.mission = definition ? this.createMission(definition) : undefined;
    Object.assign(this.environment, missionEnvironment(this.world, definition));
    Object.assign(this.renderEnvironment, this.environment);
    this.weatherTuning.brakeForce =
      BRAKE_DECELERATION *
      this.content.balans.silnik.przyczepnosc[this.environment.weather];
    const ambientTraffic = !tutorial && definition?.ruch_ai !== false;
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
      rankingSeed,
      !ambientTraffic
        ? 'mission-only'
        : (mapId === 'wroclaw' || mapId === 'krakow') && !definition
          ? 'ambient'
          : 'scheduled',
    );
    this.trafficEvents = new TrafficEvents(
      this.world,
      this.traffic,
      rankingSeed,
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
      ...drawMapGround(
        this,
        tilemap,
        mapId,
        this.world,
        buildings,
        props,
        this.environment.weather === 'snow',
      ),
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
    this.glory =
      this.mission && !examRide
        ? new GloryReplay(
            this.replay,
            this.content.balans.silnik.stop_predkosc_ms /
              this.world.metersPerPixel,
          )
        : undefined;
    this.rememberMastery();
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
      this.progress.store.profile.avatarId,
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
          : mapId === 'krakow'
            ? ui.driving.krakowTitle
            : ui.driving.title;
    this.controls = new DrivingControls(
      tutorial ? ui.tutorial.title : examRide ? ui.exam.ride : areaTitle,
      this.graphics,
      () => this.toggleMode(),
      examRide || tutorial ? undefined : () => this.reset(),
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
      examRide ? 'exam' : 'ride',
    );
    const radio = radioControls(this.progress.store);
    this.controls.quickActions.append(radio.widget);
    this.controls.onResume = () => {
      radio.refresh();
      this.tutorial?.focusNext();
    };
    if (mapId === defaultMap && !this.mission && !tutorial) {
      const plac = document.createElement('button');
      plac.type = 'button';
      plac.className = 'ride-plac';
      plac.textContent = ui.plac.short;
      plac.title = ui.plac.title;
      plac.setAttribute('aria-label', ui.plac.title);
      plac.addEventListener(
        'click',
        () => void startPlac(this, { origin: 'City' }),
      );
      this.controls.root.append(plac);
    }
    this.collectibles = this.world.collectibles.size
      ? new CityCollectibles(
          this,
          this.world,
          this.progress.store,
          this.controls.details,
          mapId === 'krakow' ? 'obwarzanek' : 'gnome',
        )
      : undefined;
    if (!this.mission && !tutorial) {
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
          !this.phone.open ||
          !canOpenPhone(this.rider.speed) ||
          (this.mission && !this.mission.result)
        )
          return;
        const story = this.phoneStory?.order;
        const order =
          story?.definition.id === id
            ? story
            : this.dailyOffers.find(({ definition }) => definition.id === id);
        if (
          order ||
          this.availableOrders().some((mission) => mission.id === id)
        )
          void startCity(this, {
            missionId: id,
            city: this.city,
            freeRide: this.freeRide,
            dailyOrder: order,
          });
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
        if (!this.mission) this.freeRidePoints += answer.points;
        else if (answer.correct) this.mission.answerQuestion(answer.points);
        else {
          this.mission.failControlQuestion(answer.ruleId);
          this.questionDialog.close();
          this.presentMissionResult();
          return;
        }
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
    if (tutorial)
      this.hud.updateProgression(
        0,
        1,
        this.progress.longestSeries,
        false,
        0,
        0,
      );
    else this.updateProgressionHud();
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
        this.dailyOrder?.text,
      );
      if (!examRide) {
        this.failureDialog = new MissionFailureDialog(
          this.controls.root,
          () => this.reset(),
          () => this.scene.start('MainMenu'),
        );
        this.results = new MissionResults(
          this.controls.root,
          this.progress.store,
          () => this.finishResultsAnimation(),
          () => this.reset(),
          () => this.togglePhone(),
          () =>
            this.scene.start('CityPicker', {
              mode:
                this.city === 'krakow' && this.freeRide
                  ? 'freeRide'
                  : 'campaign',
            }),
        );
      }
      this.updateMissionHud();
    }
    this.resetRules();
    if (mapId === this.city && mapId !== 'krakow' && !tutorial && !examRide) {
      this.dailyClientSprites = new DailyClientSprites(
        this,
        this.world.metersPerPixel,
      );
      if (dailyOrder) this.dailyClientSprites.show([dailyOrder]);
      else if (!definition) {
        this.refreshDailyOffers();
      }
    }
    if (tutorial) {
      this.tutorial = new CityTutorial(
        tutorial,
        this.world,
        this.controls,
        this.progress.store,
        this.content.balans.silnik,
        (origin) => this.resetTutorialRider(origin),
        (campaign) => {
          if (campaign) this.scene.start('CityPicker', { mode: 'campaign' });
          else this.scene.start('MainMenu');
        },
      );
      this.tutorialMarker = this.add.graphics().setDepth(8);
      this.controls.onPauseOpened = () => {
        if (this.tutorial?.step === 'pause') this.tutorial.advance();
      };
    }
    this.recordFrame(-FIXED_STEP);
    this.debug = new RuleDebugOverlay(this, this.world, this.controls.root);
    this.controls.setWalking(false);
    const lifecycle = new AbortController();
    const { signal } = lifecycle;
    const refreshGlory = () => {
      if (this.results?.open && this.resultsElapsed === undefined)
        this.drawGlory();
    };
    this.scale.on('resize', refreshGlory);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.flushProgress();
      },
      { signal },
    );
    window.addEventListener('pagehide', this.flushProgress, { signal });
    const onShutdown = () => {
      this.finishFreeRide();
      this.recordMissionVerdicts(
        this.mission?.result?.status !== 'failed' && !this.attention.pending,
      );
      lifecycle.abort();
      this.scale.off('resize', refreshGlory);
      this.flushProgress();
      this.missionHud?.destroy();
      this.tutorial?.destroy();
      this.tutorial = undefined;
      this.tutorialMarker = undefined;
      this.results?.close();
      this.failureDialog?.close();
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
      this.dailyClientSprites?.destroy();
      this.dailyClientSprites = undefined;
      this.phone.close();
      this.controls.destroy();
      this.examRide = undefined;
      this.collectibles = undefined;
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
        mission.miasto === this.city &&
        hasCityMap(mission.mapa ?? mission.miasto) &&
        this.progress.isAvailable(mission, this.content),
    );
  }

  private releaseMap(id: string) {
    this.cache.tilemap.remove(id);
    const prefixes = [
      `ground-${id}-`,
      `block-${id}-`,
      `${id}-marks-`,
      `${id}-signs-`,
      `${id}-scenery-`,
      'water-',
    ];
    for (const key of this.textures.getTextureKeys())
      if (prefixes.some((prefix) => key.startsWith(prefix)))
        this.textures.remove(key);
  }

  private refreshDailyOffers() {
    const city = this.city;
    if (city === 'krakow') return;
    const profile = this.progress.store.profile;
    if (!this.freeRide && !campaignCompleted(city, profile, this.content))
      return;
    let generator = this.dailyGenerators.get(city);
    if (!generator) {
      generator = new DailyOrderGenerator(
        city,
        proceduralRoutes[city],
        this.content,
      );
      this.dailyGenerators.set(city, generator);
    }
    this.dailyOffers = generator.generate(
      orderSeed(`${city}/${localDay(new Date())}/${profile.nicknameSeed}`),
      profile.mastery,
    );
    const state = profile.stories[city];
    const story =
      state && generator.generateStory(state.seed, state.finished)[state.step];
    this.phoneStory = {
      order: story,
      finished: state?.finished === storyTemplates.length,
    };
    if (!this.mission) this.dailyClientSprites?.show(this.dailyOffers);
  }

  private togglePhone() {
    if (this.examRide) return;
    if (this.phone.open) {
      this.phone.close();
      return;
    }
    if (this.tutorial) {
      if (this.tutorial.step !== 'phone') return;
      this.controls.clear();
      this.phone.show(
        this.content.misje.filter(
          ({ id }) => id === 'WAW-T-01' || id === 'WRO-T-01',
        ),
        'tutorial',
      );
      this.tutorial.advance();
      return;
    }
    if (
      this.dialogue.open ||
      this.review ||
      this.questionDialog.open ||
      this.failureDialog?.open
    )
      return;
    if (!canOpenPhone(this.rider.speed)) {
      this.message(this.phoneFeedback);
      return;
    }
    this.controls.clear();
    this.controls.notice.textContent = '';
    if (this.results?.open) {
      this.finishResultsAnimation();
      audio.stopReading('results');
    }
    this.refreshDailyOffers();
    this.phone.show(
      this.availableOrders(),
      this.mission && !this.mission.result ? 'active' : 'available',
      this.dailyOffers,
      this.phoneStory,
    );
  }

  private overlayKeyboard(event: KeyboardEvent) {
    if (
      this.phone.open ||
      this.dialogue.open ||
      this.review ||
      this.questionDialog.open ||
      this.failureDialog?.open ||
      (this.results?.open && event.code !== 'KeyM')
    )
      return true;
    if (
      this.tutorial &&
      event.code === 'Enter' &&
      !event.repeat &&
      !(event.target instanceof HTMLButtonElement)
    ) {
      if (this.tutorial.continue()) {
        event.preventDefault();
        return true;
      }
    }
    if (event.code === 'KeyG' && !event.repeat && this.respondToEvent()) {
      event.preventDefault();
      return true;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    if (event.code === 'KeyP' && !event.repeat && this.takePhoto()) {
      event.preventDefault();
      return true;
    }
    if (event.code !== 'KeyM') return false;
    event.preventDefault();
    if (!event.repeat) this.togglePhone();
    return true;
  }

  private overlayGamepad(
    pressed: (button: number) => boolean,
    justPressed: (button: number) => boolean,
  ) {
    const navigate = () => {
      const dialog = activeDialog();
      if (dialog) gamepadMenu(dialog, justPressed);
    };
    if (this.failureDialog?.open) {
      if (justPressed(1)) this.failureDialog.gamepad(justPressed);
      else navigate();
      return true;
    }
    if (this.review) {
      if (this.review.shown) {
        if (justPressed(1) || justPressed(2))
          this.replayDialog.gamepad(justPressed);
        else navigate();
      }
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
      else this.dialogue.gamepad(pressed(0), justPressed);
      return true;
    }
    if (justPressed(8)) {
      this.togglePhone();
      return true;
    }
    if (!this.phone.open && this.results?.open) {
      if (justPressed(1) || justPressed(2)) this.results.gamepad(justPressed);
      else navigate();
      return true;
    }
    if (!this.phone.open && this.tutorial)
      return justPressed(0) && this.tutorial.continue();
    if (!this.phone.open)
      return this.mission
        ? justPressed(0) && this.takePhoto()
        : justPressed(15) && this.takePhoto(true);
    if (justPressed(1)) this.phone.close();
    else navigate();
    return true;
  }

  private openMissionDialogue() {
    if (this.examRide) {
      this.dialogue.show(
        [
          {
            postac: 'sierzant_ola',
            emocja: 'neutral',
            tekst: examRideIntro,
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
    const order = this.dailyOrder;
    this.dialogue.show(
      order
        ? [
            ...lines,
            {
              postac: order.client.id,
              emocja:
                order.kind === 'fragile'
                  ? 'worried'
                  : order.kind === 'photo'
                    ? 'surprised'
                    : 'neutral',
              tekst: order.story
                ? `${storyStepKey(order.story)}.intro`
                : `procedural.dialogue.start.${order.kind}`,
              values: order.text,
            },
          ]
        : lines,
      () => this.missionHud?.focusEquipment(),
      order?.client,
    );
  }

  private recordMissionVerdicts(creditGoodVerdicts: boolean) {
    const longest = creditGoodVerdicts
      ? this.series.longest
      : this.progress.longestSeries;
    for (const batch of this.missionVerdictBatches) {
      const verdicts = creditGoodVerdicts
        ? batch
        : batch.filter(({ kind }) => kind !== 'good');
      this.progress.recordRide(verdicts, longest, this.content.balans.mastery);
    }
    this.missionVerdictBatches.length = 0;
  }

  private showMissionFailure(
    result: Extract<MissionResult, { status: 'failed' }>,
  ) {
    const { reason, verdict } = result;
    const reduced = Boolean(this.reducedEffects);
    const frame = this.replay.frame(this.replay.size - 1)!;
    const focus = verdict ? this.highlight.focus(verdict) : frame.rider;
    this.cameras.main.setZoom(drivingZoom * (verdict && !reduced ? 1.25 : 1));
    this.cameras.main.centerOn(focus.x, focus.y);
    this.renderFrame(frame, 0, true);
    if (verdict) this.highlight.draw(verdict, frame, 0, true);
    this.feedback.reset(this.rules.counts);
    this.publishRiderPosition(this.rider);
    this.updateDrivingHud(this.rider, this.controls.actions);
    this.updateProgressionHud();
    this.updateMissionHud();
    audio.setActivity(false);
    audio.updateSiren(0);
    audio.play('missionFailed');
    const tip =
      (verdict && this.feedback.explanation(verdict)) ||
      localizedVoiceLine(`missionFailure.tips.${reason}`);
    const rule = verdict && this.feedback.ruleTitle(verdict);
    this.failureDialog?.show(
      rule
        ? `${ui.missionFailure.reasons[reason]} · ${rule}`
        : ui.missionFailure.reasons[reason],
      tip.text,
      this.progress.store.profile.gentleFailure === true,
      reduced,
    );
    audio.read('lesson', tip);
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
    this.recordMissionVerdicts(result.status === 'completed');
    if (result.status === 'failed') {
      this.flushProgress();
      this.showMissionFailure(result);
    } else {
      const { definition } = mission;
      const ride = this.rankingRide;
      if (ride?.valid && definition.miasto !== 'krakow') {
        const stats = RideEvidence.verdictStats(result.verdicts);
        void this.progress.rankings?.record(
          {
            kind: 'mission',
            ...ride.roadStats,
            ...stats,
            cleanMeters:
              stats.minor || stats.major ? 0 : ride.roadStats.cleanMeters,
            ticks: Math.round(result.elapsedSeconds / FIXED_STEP),
            points: stats.minor
              ? result.points - result.timeBonus
              : result.points,
            city: definition.miasto,
            missionId: definition.id,
          },
          ride.seed,
          ride.consent,
          () => ride.digest(),
        );
      }
      const { progress, content } = this;
      const unlocks = progress.unlocks(content);
      const nextOrders = content.misje.filter(
        (order) =>
          order.miasto === this.city &&
          !progress.store.profile.completed.includes(order.id) &&
          !progress.isAvailable(order, content),
      );
      const order = this.dailyOrder;
      const clean = !result.verdicts.some(({ kind }) => kind !== 'good');
      // Quiz answers can affect the score, but do not count as traffic violations.
      const legal = !result.verdicts.some(
        ({ kind, evidence }) =>
          kind !== 'good' && !Object.hasOwn(evidence, 'answer'),
      );
      const daily =
        order && this.city !== 'krakow'
          ? progress.completeDailyOrder(
              this.city,
              result.points,
              legal,
              order.story,
            )
          : undefined;
      const tokens =
        daily?.tokens ??
        progress.complete(definition, {
          points: result.points,
          stars: result.stars,
          balance: this.content.balans.gwiazdki,
          clean,
        });
      const districtsOpened = this.districtGates?.update(
        progress.store.profile.completed,
      );
      this.updateMissionHud();
      const unlocked =
        districtsOpened ||
        daily?.unlocked ||
        Boolean(daily?.sticker) ||
        nextOrders.some((order) => progress.isAvailable(order, content)) ||
        [...progress.unlocks(content)].some((item) => !unlocks.has(item));
      const storyMessage = districtsOpened
        ? ui.driving.districtsOpened
        : daily?.sticker
          ? translate('procedural.stories.reward', {
              sticker: `m5c.stickerNames.${daily.sticker}`,
            })
          : daily?.unlocked
            ? ui.procedural.stories.unlocked
            : undefined;
      this.dialogue.show(
        order
          ? [
              {
                postac: order.client.id,
                emocja: order.kind === 'race' ? 'proud' : 'happy',
                tekst: order.story
                  ? `${storyStepKey(order.story)}.finish`
                  : 'procedural.dialogue.finish',
              },
            ]
          : missionLines(this.content.dialogi, definition.dialog_koniec),
        () =>
          this.showResults(result, definition, tokens, unlocked, storyMessage),
        order?.client,
      );
    }
  }

  private rememberMastery() {
    this.masteryAtStart.clear();
    if (!this.glory) return;
    for (const { id } of this.content.przepisy.przepisy)
      this.masteryAtStart.set(id, this.progress.ruleMastery(id));
  }

  private showResults(
    result: Extract<MissionResult, { status: 'completed' }>,
    definition: MissionDefinition,
    tokens: number,
    unlocked: boolean,
    storyMessage?: string,
  ) {
    const results = this.results!;
    const good = new Set<string>();
    const practiced = new Set<string>();
    for (const { kind, ruleId } of result.verdicts) {
      if (kind === 'good') good.add(ruleId);
      practiced.add(ruleId);
    }
    const definitions = this.content.przepisy.przepisy;
    const rules = definitions.flatMap((rule) => {
      const mastery = this.progress.ruleMastery(rule.id);
      const change = mastery - (this.masteryAtStart.get(rule.id) ?? 0);
      return practiced.has(rule.id) || change
        ? [
            {
              name: rule.tytul,
              habit: good.has(rule.id) ? rule.dobry_nawyk : undefined,
              mastery,
              change,
            },
          ]
        : [];
    });
    this.gloryClip = this.glory?.finish();
    const verdict = this.gloryClip?.verdict;
    const habit =
      verdict &&
      definitions.find(({ id }) => id === verdict.ruleId)?.dobry_nawyk;
    if (!habit) this.gloryClip = undefined;
    const lesson =
      result.verdicts.find(({ kind }) => kind === 'major') ??
      result.verdicts.find(({ kind }) => kind === 'minor') ??
      verdict ??
      result.verdicts[0];
    const tip = lesson
      ? this.feedback.explanation(lesson).text
      : (definitions.find(({ id }) => id === definition.reguly_cwiczone[0])
          ?.feedback ?? '');
    audio.setActivity(false);
    audio.stopReading('feedback');
    results.show(
      result,
      translate(definition.tytul, this.dailyOrder?.text),
      tokens,
      this.progress.tokens,
      rules,
      habit,
      tip,
      this.reducedEffects,
      { storyMessage, storyStep: Boolean(this.dailyOrder?.story) },
    );
    if (result.stars > 0) audio.play('stars');
    if (unlocked) audio.play('unlock', 1, result.stars > 0 ? 0.75 : 0);
    audio.read(
      'results',
      localizedVoiceLine(resultVoiceIds[habit ? 'glory' : 'completed']),
    );
    this.resultsElapsed = this.reducedEffects ? undefined : 0;
    this.drawGlory(this.resultsElapsed);
  }

  private finishResultsAnimation() {
    this.resultsElapsed = undefined;
    this.results?.stopAnimation();
    this.drawGlory();
  }

  private updateResults(delta: number) {
    if (this.resultsElapsed === undefined) return;
    this.resultsElapsed += Math.min(delta, 100);
    const frames = this.gloryClip?.frames.length;
    const duration = frames ? ((frames - 1) * 1000) / TICKS_PER_SECOND : 900;
    if (this.resultsElapsed >= duration || this.reducedEffects)
      this.finishResultsAnimation();
    else this.drawGlory(this.resultsElapsed);
  }

  private drawGlory(elapsed?: number) {
    const clip = this.gloryClip;
    if (!clip) return;
    const still = elapsed === undefined;
    const index = still
      ? clip.stillIndex
      : Math.floor((elapsed * TICKS_PER_SECOND) / 1000);
    const frame = clip.frames[index]!;
    const camera = this.cameras.main;
    const focus = still ? this.highlight.focus(clip.verdict) : frame.rider;
    const compact = this.compactResults.matches;
    camera.setZoom(1);
    camera.centerOn(
      focus.x - (compact ? 0 : camera.width * 0.21),
      focus.y + (compact ? camera.height * 0.23 : 0),
    );
    this.rivalSprite?.setVisible(false);
    this.rivalLabel?.setVisible(false);
    this.renderFrame(frame, 0, true);
    if (still) this.highlight.draw(clip.verdict, frame, 0, true);
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
      this.dailyOrder?.question ?? {
        pytanie: translate(goal.pytanie),
        odpowiedzi: goal.odpowiedzi.map((key) => translate(key)),
        wyjasnienie: translate(goal.wyjasnienie),
        voiceKeys: goal,
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

  private showCollectibleQuestion() {
    if (this.examRide) return false;
    const { x, y, walking } = this.rider;
    const collectibles = this.collectibles;
    const nearby = walking ? collectibles?.nearby(x, y) : undefined;
    if (!collectibles || !nearby) {
      this.askedCollectible = undefined;
      return false;
    }
    if (
      nearby.id === this.askedCollectible ||
      (this.mission && nearby.id !== this.mission.collectibleTarget)
    )
      return false;

    const questions = this.content.pytania.pytania;
    const question = nearby.question
      ? questions.find(({ id }) => id === nearby.question)
      : questions[nearby.questionIndex % questions.length];
    if (!question) return false;
    this.askedCollectible = nearby.id;
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
        if (correct) collectibles.collect(nearby.id);
        return { correct };
      },
      collectibles.questionLabel,
    );
    return true;
  }

  private showControlQuestion() {
    if (this.examRide || this.mission?.result) return false;
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

  private message(line: (typeof voiceNoticeIds)[number] | VoiceLine) {
    const voice = typeof line === 'string' ? localizedVoiceLine(line) : line;
    const { text } = voice;
    if (this.controls.notice.textContent !== text) {
      if (text === ui.driving.collision) audio.play('oops');
      audio.read('feedback', voice);
    }
    this.controls.notice.textContent = text;
    this.messageUntil = this.time.now + 2600;
  }
  private toggleMode() {
    if (
      (this.tutorial && this.tutorial.step !== 'walk') ||
      this.controls.paused ||
      this.review ||
      this.questionDialog.open ||
      this.mission?.result ||
      this.missionInterrupted
    )
      return;
    if (this.rider.speed > 5) {
      this.message('driving.slowDown');
      return;
    }
    if (this.rider.walking && !canRide(this.rider, this.obstacles)) {
      this.message('driving.blocked');
      return;
    }
    this.rider.walking = !this.rider.walking;
    this.rider.speed = 0;
    this.controls.setWalking(this.rider.walking);
    if (this.rider.walking && !this.tutorial)
      this.message('driving.walkingHint');
  }
  private startRankingRide(mission: boolean) {
    const consent = this.progress.rankings?.consent;
    this.rankingRide =
      consent === undefined ||
      this.examRide ||
      this.dailyOrder ||
      (!mission && !this.rankingCity)
        ? undefined
        : new RideEvidence(rankingSeed(), consent);
  }

  private finishFreeRide() {
    const { rankingRide: ride, rankingCity: city } = this;
    if (this.mission || !city || !ride?.valid) return;
    this.rankingRide = undefined;
    void this.progress.rankings?.record(
      {
        kind: 'ride',
        city,
        ...ride.roadStats,
      },
      ride.seed,
      ride.consent,
      () => ride.digest(),
    );
  }

  private reset() {
    if (this.mission) {
      void startCity(this, {
        missionId: this.mission.definition.id,
        city: this.city,
        freeRide: this.freeRide,
        dailyOrder: this.dailyOrder,
      });
      return;
    }
    this.finishFreeRide();
    this.startRankingRide(false);
    Object.assign(this.rider, this.spawn, {
      speed: 0,
      walking: false,
    });
    this.traffic.reset(this.rankingRide?.seed);
    this.trafficEvents.reset(this.rankingRide?.seed);
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
  private resetTutorialRider(origin: Pick<Rider, 'x' | 'y' | 'heading'>) {
    Object.assign(this.rider, origin, { speed: 0, walking: false });
    this.controls.clear();
    this.controls.setWalking(false);
    Object.assign(this.controls.actions, {
      signal: null,
      looking: false,
      bell: false,
    });
    this.accumulator = 0;
    this.cameras.main.centerOn(this.rider.x, this.rider.y);
    this.resetRules();
    this.replay.clear();
    this.recordFrame(-FIXED_STEP);
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
    const world = this.dailyOrder
      ? {
          ...this.world,
          pois: new Map([
            ...this.world.pois,
            ...this.dailyOrder.route.steps.map(
              ({ poi }) => [poi.id, poi] as const,
            ),
          ]),
        }
      : this.world;
    return new MissionSystem(
      definition,
      world,
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
          this.dailyOrder && dailyRivalScoreLimit(balance.misja),
          this.dailyOrder && 'turbo',
        ),
      this.examRide ? 0 : this.series.consecutive,
      { cleanTimeBonus: Boolean(this.dailyOrder) },
    );
  }

  private takePhoto(showHint = false) {
    if (
      this.tutorial ||
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
    else if (showHint || walking) this.message('m5c.noPhoto');
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
          this.message('m5c.photoSaved');
        }
      } else if (controls.root.isConnected) {
        this.message('m5c.photoFailed');
      }
    });
  }

  private updateRival() {
    const race = this.mission?.race;
    if (!race) return;
    const rival = race.rider;
    const scale = 1 / this.world.metersPerPixel;
    const x = rival.pos.x * scale;
    const y = rival.pos.y * scale;
    if (this.rivalSprite) {
      this.rivalSprite.setPosition(x, y);
      drawCyclist(
        this.rivalSprite,
        rival.heading,
        (race.distanceTravelled / 1.6) % 1,
        2,
      );
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

  private stepWorld(collided: boolean, meters: number) {
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
    if (this.tutorial) {
      this.recordFrame();
      return;
    }
    this.trafficEvents.resolvePhoneResponse(
      this.phoneAnsweredSafely,
      rider.speed > 0.1 && rider.mode === 'riding',
      rider,
    );
    rider.phoneInHand = false;
    if (!this.examRide) {
      for (const verdict of this.tickVerdicts)
        this.series.receive(verdict.kind);
      if (this.mission) {
        if (this.tickVerdicts.length)
          this.missionVerdictBatches.push(this.tickVerdicts.slice());
      } else {
        this.progress.recordRide(
          this.tickVerdicts,
          this.series.longest,
          this.content.balans.mastery,
        );
      }
      this.attention.step(this.tickVerdicts, rider.speed > 0);
    }
    const collectible = this.mission?.collectibleTarget;
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
        collectible !== undefined &&
        this.collectibles?.has(collectible),
    );
    this.rankingRide?.road(
      this.tickVerdicts,
      meters,
      collided ||
        Boolean(effects?.respawn) ||
        this.rules.unsafeForReplay ||
        this.activeAgents.some(
          ({ protectiveBrake }) => protectiveBrake === true,
        ),
    );
    this.updateRival();
    this.syncActorObstacles();
    this.recordFrame();
    this.glory?.record(
      this.rules.at,
      this.tickVerdicts,
      collided ||
        Boolean(effects?.respawn) ||
        this.rules.unsafeForReplay ||
        this.activeAgents.some(
          ({ protectiveBrake }) => protectiveBrake === true,
        ),
    );

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
    if (this.tickVerdicts.length) {
      const kind =
        major?.kind ??
        this.tickVerdicts.find(({ kind }) => kind === 'minor')?.kind ??
        'good';
      verdictHaptics(kind, this.progress.store.profile.haptics !== false);
    }
    for (const verdict of this.tickVerdicts)
      this.feedback.receive(
        verdict,
        this.rules.counts,
        verdict === lesson || verdict.kind === 'major',
      );
    const failed = this.mission?.result?.status === 'failed' && !this.examRide;
    if (lesson && !failed) {
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
      const hint = localizedVoiceLine(
        effects.missingHabit?.hintKey ?? 'missionUi.checkpointHint',
      );
      this.checkpointHint = hint.text;
      this.missionInterrupted = true;
      audio.read('lesson', hint);
    }
  }

  private returnToCheckpoint(spawn?: MissionSpawn) {
    this.glory?.interrupt(this.rules.at);
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
        this.feedback.ruleTitle(review.verdict) ?? review.verdict.ruleId,
        explanation.text,
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
    this.sampleGraphicsPerformance();
    const input = this.controls.read();
    this.tutorial?.refresh();
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
    if (this.results?.open) {
      if (!document.hidden) this.updateResults(delta);
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
      showBreakReminder(this.controls.root);
    this.accumulator += seconds;
    while (this.accumulator >= FIXED_STEP) {
      const { x, y, walking } = this.rider;
      this.rankingRide?.step(
        input,
        this.controls.actions,
        walking,
        this.rulesRider.helmet.fastened,
        this.rulesRider.phoneInHand,
      );
      const collided =
        (!this.tutorial || this.tutorial.canRide) &&
        !this.mission?.preparingBike &&
        stepRider(
          this.rider,
          input,
          this.obstacles,
          this.worldWidth,
          this.worldHeight,
          FIXED_STEP,
          this.rider.walking ? undefined : this.weatherTuning,
        );
      if (collided && !this.tutorial) {
        const locked = this.districtGates?.near(this.rider.x, this.rider.y);
        if (locked) {
          this.controls.notice.textContent = ui.driving.districtLocked;
          this.messageUntil = time + 2500;
        } else this.message('driving.collision');
      }
      const meters =
        this.rankingRide && !walking
          ? Math.hypot(this.rider.x - x, this.rider.y - y) *
            this.world.metersPerPixel
          : 0;
      this.stepWorld(collided, meters);
      this.accumulator -= FIXED_STEP;
      if (this.tutorial) {
        this.tutorial.ride(
          this.rider,
          input,
          FIXED_STEP,
          collided,
          this.rulesRider.pos,
          this.rules.stopReady,
        );
        continue;
      }
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
      if (this.showCollectibleQuestion()) {
        this.accumulator = 0;
        break;
      }
    }
    if (this.review) {
      this.updateReview(delta);
      return;
    }
    if (this.results?.open || this.failureDialog?.open) return;
    const sirenVolume = this.renderFrame(
      this.replay.frame(this.replay.size - 1)!,
      delta,
    );
    if (this.tutorial) {
      const target = this.tutorial.target;
      this.tutorialMarker?.clear();
      if (this.tutorial.showTarget)
        this.tutorialMarker
          ?.lineStyle(2, 0xffcd75)
          .strokeCircle(target.x, target.y, 13);
      this.tutorial.drawArrow(this.rider, this.world.metersPerPixel);
    } else this.updateProgressionHud();
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

  private sampleGraphicsPerformance() {
    const sample = this.autoQuality;
    if (!sample) return;
    if (this.progress.store.profile.graphicsQuality) {
      this.autoQuality = undefined;
      return;
    }
    if (document.hidden || this.controls.paused || this.dialogue.open) {
      sample.last = 0;
      return;
    }
    const now = performance.now();
    if (sample.last && now - sample.last > 33.5) sample.slow++;
    if (sample.last && ++sample.frames === 45) {
      if (sample.slow >= 32) this.controls.setLite(true);
      this.autoQuality = undefined;
    }
    sample.last = now;
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
    this.collectibles?.update(camera);
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
    this.dailyClientSprites?.cull(centerX, centerY, halfWidth, halfHeight);
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
      art.draw(x, y, visible, pose, at, weather === 'snow', reduced);
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
        drawCyclist(sprite, tail.rider.heading, tail.riderStride, 2);
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
    this.road.updateLights(
      camera,
      Math.max(0, at),
      this.renderEnvironment,
      showSignalCountdowns(this.progress.store.profile, Boolean(this.examRide)),
      reduced,
    );
    return sirenVolume;
  }
}

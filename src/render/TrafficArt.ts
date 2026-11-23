import type { GameObjects, Scene } from 'phaser';
import type { ReplayActor } from '../gameplay/ReplayBuffer';
import type { AgentState } from '../rules/types';
import { emergencyLightPhase } from './emergencyLights';
import {
  cyclistVariants,
  emergencyTypes,
  largeVehicleTypes,
  pedalFrames,
  pedestrianDirections,
  pedestrianSeasonRows,
  pedestrianTypes,
  riderDirections,
  smallVehicleTypes,
  spriteDirection,
  spriteSheets,
  walkFrames,
  tramCities,
  vehicleFrame,
  vehiclePaints,
  type SpriteSheet,
} from './spriteFrames';

const urls = import.meta.glob<string>('../../assets/generated/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function loadRiderArt(scene: Scene) {
  loadSpriteSheets(scene, ['rider', 'rider-lights']);
}

export function loadTrafficArt(scene: Scene) {
  loadSpriteSheets(scene, Object.keys(spriteSheets) as SpriteSheet[]);
}

function loadSpriteSheets(scene: Scene, sheets: readonly SpriteSheet[]) {
  for (const key of sheets) {
    const [frameWidth, frameHeight] = spriteSheets[key];
    if (!scene.textures.exists(key))
      scene.load.spritesheet(key, urls[`../../assets/generated/${key}.png`]!, {
        frameWidth,
        frameHeight,
      });
  }
}

function useFrame(image: GameObjects.Image, frame: number) {
  if (Number(image.frame.name) !== frame) image.setFrame(frame);
}

export function drawCyclist(
  image: GameObjects.Image,
  heading: number,
  stride: number,
  variant: number,
) {
  useFrame(
    image,
    (variant * pedalFrames + Math.floor(stride * pedalFrames)) *
      riderDirections +
      spriteDirection(heading, riderDirections),
  );
}

export class TrafficArt {
  readonly reach: number;
  readonly nose: number;
  private readonly image: GameObjects.Image;
  private readonly rear?: GameObjects.Image;
  private readonly row: number;

  constructor(
    scene: Scene,
    private readonly kind: AgentState['kind'],
    variant: number,
    mapId: string,
  ) {
    let key: SpriteSheet = `traffic-${kind}`;
    switch (kind) {
      case 'car': {
        const types = smallVehicleTypes.length + largeVehicleTypes.length;
        const type = variant % types;
        const paint = Math.floor(variant / types) % vehiclePaints;
        const large = type >= smallVehicleTypes.length;
        key = large ? 'traffic-large' : 'traffic-car';
        this.row =
          (large ? type - smallVehicleTypes.length : type) * vehiclePaints +
          paint;
        break;
      }
      case 'emergency':
        this.row = variant % emergencyTypes.length;
        break;
      case 'tram':
        this.row = Math.max(
          0,
          tramCities.findIndex((city) => mapId.startsWith(city)),
        );
        this.rear = scene.add
          .image(0, 0, key, this.row * 2 + 1)
          .setOrigin(0.5, 0)
          .setDepth(17);
        break;
      case 'pedestrian':
        this.row = variant % pedestrianTypes.length;
        break;
      case 'cyclist':
        this.row = variant % cyclistVariants;
        break;
    }
    const [width, height] = spriteSheets[key];
    this.nose = this.rear ? height : height / 2;
    this.reach = Math.hypot(width / 2, this.nose);
    this.image = scene.add
      .image(0, 0, key, kind === 'tram' ? this.row * 2 : 0)
      .setDepth(17);
    if (this.rear) this.image.setOrigin(0.5, 1);
  }

  draw(
    x: number,
    y: number,
    visible: boolean,
    pose: ReplayActor,
    at: number,
    winter: boolean,
  ) {
    const { image, rear } = this;
    if (image.visible !== visible) {
      image.setVisible(visible);
      rear?.setVisible(visible);
    }
    if (!visible) return;
    image.setPosition(x, y);
    switch (this.kind) {
      case 'tram':
        image.setRotation(pose.tramFront + Math.PI / 2);
        rear!.setPosition(x, y).setRotation(pose.tramRear + Math.PI / 2);
        break;
      case 'cyclist':
        drawCyclist(image, pose.heading, pose.stride, this.row);
        break;
      case 'pedestrian':
        useFrame(
          image,
          ((winter ? pedestrianSeasonRows : 0) +
            ((this.row + pose.trips) % pedestrianTypes.length) * walkFrames +
            Math.floor(pose.stride * walkFrames)) *
            pedestrianDirections +
            spriteDirection(pose.heading, pedestrianDirections),
        );
        break;
      case 'emergency':
        image.setRotation(pose.heading + Math.PI / 2);
        useFrame(
          image,
          ((this.row + pose.trips) % emergencyTypes.length) * 3 +
            (!pose.signalActive ? 0 : emergencyLightPhase(at) ? 1 : 2),
        );
        break;
      case 'car':
        image.setRotation(pose.heading + Math.PI / 2);
        useFrame(
          image,
          vehicleFrame(
            this.row,
            pose.braking,
            pose.maneuver,
            Math.floor(at * 3) % 2 === 0,
          ),
        );
        break;
    }
  }
}

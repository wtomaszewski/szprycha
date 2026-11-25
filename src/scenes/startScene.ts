import type { Scene } from 'phaser';
import { showError } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import type { Ride } from './City';
import { defaultRideMap, downloadMap, isMap } from './cityMaps';

const scenes = {
  City: () => import('./City').then(({ City }) => City),
  CityPicker: () => import('./CityPicker').then(({ CityPicker }) => CityPicker),
  Plac: () => import('./Plac').then(({ Plac }) => Plac),
};

const pending = new WeakSet<Scene>();

export function startScene(
  origin: Scene,
  key: keyof typeof scenes,
  data: object = {},
  preloadMap?: string,
) {
  if (pending.has(origin)) return;
  if (origin.scene.get(key)) {
    origin.scene.start(key, data);
    return;
  }
  pending.add(origin);
  const controller = new AbortController();
  const mapDownload =
    preloadMap && isMap(preloadMap) && !origin.cache.tilemap.exists(preloadMap)
      ? downloadMap(preloadMap, controller.signal)
      : undefined;
  let leaving = false;
  const cancel = () => {
    leaving = true;
    controller.abort();
  };
  origin.events.once('shutdown', cancel);
  void scenes[key]()
    .then((SceneClass) => {
      if (leaving) return;
      origin.events.off('shutdown', cancel);
      origin.scene.add(key, SceneClass);
      origin.scene.start(key, mapDownload ? { ...data, mapDownload } : data);
    })
    .catch((error: unknown) => {
      controller.abort();
      showError(error);
    })
    .finally(() => {
      origin.events.off('shutdown', cancel);
      pending.delete(origin);
    });
}

export function startCity(origin: Scene, data: Ride = {}, preloadMap?: string) {
  const progress = origin.registry.get('missionProgress') as MissionProgress;
  const map =
    preloadMap ??
    data.examRide?.city ??
    data.map ??
    defaultRideMap(data.city ?? progress.selectedCity);
  startScene(origin, 'City', data, map);
}

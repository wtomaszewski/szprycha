import type { Scene } from 'phaser';
import { showError } from '../core/presentation';

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
) {
  if (pending.has(origin)) return;
  if (origin.scene.get(key)) {
    origin.scene.start(key, data);
    return;
  }
  pending.add(origin);
  let leaving = false;
  const cancel = () => {
    leaving = true;
  };
  origin.events.once('shutdown', cancel);
  void scenes[key]()
    .then((SceneClass) => {
      if (leaving) return;
      origin.scene.add(key, SceneClass);
      origin.scene.start(key, data);
    })
    .catch(showError)
    .finally(() => {
      origin.events.off('shutdown', cancel);
      pending.delete(origin);
    });
}

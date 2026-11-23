import type { Page } from '@playwright/test';

type FixedScene = {
  sys: {
    settings: { key: string };
    sceneUpdate(time: number, delta: number): void;
  };
  tickForTest(time: number, delta: number): void;
};

type Game<Scene> = { scene: { getScene(name: string): Scene } };

type SceneManager<Scene> = {
  game: Game<Scene>;
  create(scene: Scene): void;
  update(time: number, delta: number): void;
};

export async function fixedSceneTicks<Scene extends FixedScene>(
  page: Page,
  names: ('Plac' | 'City')[],
) {
  return page.evaluateHandle(async (names) => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[href*="/phaser-"]',
    )!;
    const module: Record<
      string,
      () => { Scenes: { SceneManager: { prototype: SceneManager<Scene> } } }
    > = await import(link.href);
    const prototype = Object.values(module)[0]!().Scenes.SceneManager.prototype;
    const create = prototype.create;
    const pending = new Set<string>(names);
    // A scene that is imported on demand enters the manager just before create.
    prototype.create = function (scene) {
      create.call(this, scene);
      if (!pending.delete(scene.sys.settings.key)) return;
      scene.tickForTest = scene.sys.sceneUpdate.bind(scene);
      scene.sys.sceneUpdate = () => {};
      if (!pending.size) prototype.create = create;
    };
    const update = prototype.update;
    return await new Promise<Game<Scene>>((resolve) => {
      prototype.update = function (time, delta) {
        prototype.update = update;
        update.call(this, time, delta);
        resolve(this.game);
      };
    });
  }, names);
}

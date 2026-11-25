export const swiftShaderArgs = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

export function trackWebGLTextures() {
  const textures = { live: 0, created: 0 };
  Object.defineProperty(window, '__benchmarkTextures', { value: textures });
  const live = new WeakSet<WebGLTexture>();
  const methods = [WebGLRenderingContext, WebGL2RenderingContext].map(
    ({ prototype }) => ({
      prototype,
      createTexture: prototype.createTexture,
      deleteTexture: prototype.deleteTexture,
    }),
  );
  for (const { prototype, createTexture, deleteTexture } of methods) {
    prototype.createTexture = function () {
      const texture = createTexture.call(this);
      if (texture && !live.has(texture)) {
        live.add(texture);
        textures.created++;
        textures.live++;
      }
      return texture;
    };
    prototype.deleteTexture = function (texture: WebGLTexture | null) {
      deleteTexture.call(this, texture);
      if (texture && live.delete(texture)) textures.live--;
    };
  }
}

export function readWebGLTextures() {
  return Reflect.get(window, '__benchmarkTextures') as {
    live: number;
    created: number;
  };
}

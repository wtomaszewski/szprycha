import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'src/main.ts',
    target: 'node24',
    outDir: 'dist',
    emptyOutDir: true,
  },
});

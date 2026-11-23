import { defineConfig } from '@playwright/test';

const baseURL = process.env.AUDIT_URL ?? 'http://127.0.0.1:4176';

export default defineConfig({
  testDir: 'tests/visual',
  outputDir: 'test-results/audyt',
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    launchOptions: { executablePath: process.env.AUDIT_CHROMIUM_PATH },
  },
  webServer: process.env.AUDIT_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 4176 --strictPort',
        url: baseURL,
        env: {
          VITE_RANKING_URL: '',
          VITE_PRIVACY_POLICY_URL: '',
          VITE_PROJECT_URL: '',
        },
      },
});

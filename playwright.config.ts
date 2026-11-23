import { defineConfig } from '@playwright/test';
import { legacyProgressKey } from './src/core/progressStore';
const offlineConfig = {
  VITE_RANKING_URL: '',
  VITE_PRIVACY_POLICY_URL: '',
  VITE_PROJECT_URL: '',
};

export default defineConfig({
  testDir: 'tests/e2e',
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 720 },
    // Existing feature tests begin with a returning rider. The onboarding tests use empty storage.
    storageState: {
      cookies: [],
      origins: [4173, 4174, 4175].map((port) => ({
        origin: `http://127.0.0.1:${port}`,
        localStorage: [{ name: legacyProgressKey, value: '{"completed":[]}' }],
      })),
    },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: 'npm run build:server && npm run start:server',
      url: 'http://127.0.0.1:8787/v1/health',
      reuseExistingServer: false,
      env: {
        RANKING_DB: ':memory:',
        RANKING_ORIGINS: 'http://127.0.0.1:4175',
        RANKING_PORT: '8787',
      },
    },
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      env: offlineConfig,
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      env: offlineConfig,
    },
    {
      command:
        'npm run build -- --outDir node_modules/.cache/rankings-e2e && npm run preview -- --outDir node_modules/.cache/rankings-e2e --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
      env: {
        VITE_RANKING_URL: 'http://127.0.0.1:8787/',
        VITE_PRIVACY_POLICY_URL: 'https://project.example/privacy',
        VITE_PROJECT_URL: 'https://project.example/',
      },
    },
  ],
});

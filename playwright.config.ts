import { defineConfig } from '@playwright/test';
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
  },
  webServer: [
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
      command: 'npm run dev -- --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
      env: {
        VITE_RANKING_URL: 'https://rankings.example/',
        VITE_PRIVACY_POLICY_URL: 'https://project.example/privacy',
        VITE_PROJECT_URL: 'https://project.example/',
      },
    },
  ],
});

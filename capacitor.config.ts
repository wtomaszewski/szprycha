import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.szprycha.game',
  appName: 'SZPRYCHA',
  webDir: 'dist',
  backgroundColor: '#1a1c2c',
  android: { webContentsDebuggingEnabled: false },
  ios: { webContentsDebuggingEnabled: false },
  plugins: {
    SystemBars: { hidden: true, initialViewportFitValueHint: 'cover' },
  },
};

export default config;

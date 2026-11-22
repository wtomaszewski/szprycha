import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'server/dist/**',
      'android/**/build/**',
      'android/app/src/main/assets/public/**',
      'android/capacitor-cordova-android-plugins/**',
      'ios/capacitor-cordova-ios-plugins/**',
      'ios/App/App/public/**',
      'public/data/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  prettier,
);

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export type UpdateProgress = (
  edit: (current: unknown) => unknown | Promise<unknown>,
) => Promise<void>;

export function preferencesProgress(
  key: string,
  preferences: Pick<typeof Preferences, 'get' | 'set'>,
): UpdateProgress {
  let pending = Promise.resolve();
  return (edit) => {
    const write = pending.then(async () => {
      const { value } = await preferences.get({ key });
      let current: unknown;
      try {
        if (value !== null) current = JSON.parse(value) as unknown;
      } catch {
        current = null;
      }
      const next = await edit(current);
      // The same object means the current record already needs no migration.
      if (next !== current)
        await preferences.set({ key, value: JSON.stringify(next) });
    });
    pending = write.catch(() => {});
    return write;
  };
}

export const nativeProgress = Capacitor.isNativePlatform()
  ? preferencesProgress('profile', Preferences)
  : undefined;

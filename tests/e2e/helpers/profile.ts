import type { Page } from '@playwright/test';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  ProgressStore,
  type ProgressProfile,
} from '../../../src/core/progressStore';

const storage = {
  database: progressDatabase,
  store: progressStoreName,
  key: progressRecordKey,
};

export async function profile(page: Page, updates?: Partial<ProgressProfile>) {
  return page.evaluate(
    ({ database, store, key, updates }) =>
      new Promise<ProgressProfile>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, updates ? 'readwrite' : 'readonly');
          const records = tx.objectStore(store);
          const request = records.get(key);
          request.onsuccess = () => {
            if (updates) records.put({ ...request.result, ...updates }, key);
          };
          tx.oncomplete = () => {
            db.close();
            resolve(request.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    { ...storage, updates },
  );
}

export async function seedProgress(
  page: Page,
  baseURL: string | undefined,
  saved: Partial<ProgressProfile>,
) {
  if (!baseURL) throw new Error('A base URL is required to seed progress');
  const initial = new ProgressStore().profile;
  delete initial.tutorial;
  const state = {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [],
        indexedDB: [
          {
            name: storage.database,
            version: 1,
            stores: [
              {
                name: storage.store,
                autoIncrement: false,
                indexes: [],
                records: [
                  {
                    key: storage.key,
                    value: { ...initial, nicknameSeed: 184, ...saved },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  await page.context().setStorageState(state);
}

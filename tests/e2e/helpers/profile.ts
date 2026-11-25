import type { Page } from '@playwright/test';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
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
  saved: Pick<
    Partial<ProgressProfile>,
    'completed' | 'bestScores' | 'nicknameSeed'
  >,
) {
  if (!baseURL) throw new Error('A base URL is required to seed progress');
  // Version 2 is the first IndexedDB format with scores and a nickname seed.
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
                    value: {
                      version: 2,
                      completed: [],
                      introduced: [],
                      progression: {
                        bestStars: {},
                        tokens: 0,
                        longestSeries: 0,
                      },
                      nicknameSeed: 184,
                      missionPoints: 0,
                      bestScores: {},
                      quizXp: 0,
                      achievementXp: {},
                      licencePassed: false,
                      mastery: {},
                      ...saved,
                    },
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

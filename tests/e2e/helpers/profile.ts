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

import type { Page } from '@playwright/test';
import {
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  type ProgressProfile,
} from '../../src/core/progressStore';

export function readProfile(page: Page) {
  return page.evaluate(
    ({ database, store, key }) =>
      new Promise<ProgressProfile>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store);
          const record = tx.objectStore(store).get(key);
          tx.oncomplete = () => {
            db.close();
            resolve(record.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    {
      database: progressDatabase,
      store: progressStoreName,
      key: progressRecordKey,
    },
  );
}

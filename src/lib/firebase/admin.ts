// Firebase Admin re-export for backwards compatibility
// Provides db instance and utilities expected by other modules

import {
  getDb,
  initializeFirestore,
  isFirestoreConfigured,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
  getCollection,
  getDocument,
  batchWrite,
  Timestamp,
  FieldValue,
} from '../firestore';

// Re-export the Firestore instance as 'db' for compatibility
// This creates a proxy that lazily initializes Firestore
export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const firestore = getDb();
      if (!firestore) {
        // Return a mock that throws helpful errors
        if (prop === 'collection') {
          return (name: string) => ({
            doc: (id: string) => ({
              get: async () => ({ exists: false, data: () => null }),
              set: async () => {
                console.warn(`Firestore not configured - skipping write to ${name}/${id}`);
              },
              update: async () => {
                console.warn(`Firestore not configured - skipping update to ${name}/${id}`);
              },
              delete: async () => {
                console.warn(`Firestore not configured - skipping delete from ${name}/${id}`);
              },
            }),
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
              limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
            }),
            orderBy: () => ({
              limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
              get: async () => ({ docs: [], empty: true }),
            }),
            limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
            get: async () => ({ docs: [], empty: true }),
          });
        }
        return undefined;
      }
      return (firestore as Record<string, unknown>)[prop as string];
    },
  }
) as FirebaseFirestore.Firestore;

// Re-export all utilities
export {
  getDb,
  initializeFirestore,
  isFirestoreConfigured,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
  getCollection,
  getDocument,
  batchWrite,
  Timestamp,
  FieldValue,
};

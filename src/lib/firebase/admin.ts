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
// This creates a proxy that lazily initializes Firestore.
// When Firestore is unavailable, the proxy returns a comprehensive mock
// that supports all common Firestore patterns (subcollections, batch,
// add, chained where/orderBy, count, etc.) to prevent TypeErrors.
function createMockQuery() {
  const query: Record<string, unknown> = {
    get: async () => ({ docs: [], empty: true, size: 0, forEach: () => {} }),
    limit: () => query,
    offset: () => query,
    where: () => query,
    orderBy: () => query,
    select: () => query,
    startAt: () => query,
    startAfter: () => query,
    endAt: () => query,
    endBefore: () => query,
    count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
  };
  return query;
}

function createMockDoc(name: string, id?: string): Record<string, unknown> {
  const docId = id || `mock_${Date.now()}`;
  const doc: Record<string, unknown> = {
    id: docId,
    path: `${name}/${docId}`,
    get: async () => ({ exists: false, data: () => null, id: docId }),
    set: async () => {
      console.warn(`Firestore not configured - skipping write to ${name}/${docId}`);
    },
    update: async () => {
      console.warn(`Firestore not configured - skipping update to ${name}/${docId}`);
    },
    delete: async () => {
      console.warn(`Firestore not configured - skipping delete from ${name}/${docId}`);
    },
    collection: (subName: string) => createMockCollection(`${name}/${docId}/${subName}`),
  };
  return doc;
}

function createMockCollection(name: string): Record<string, unknown> {
  const query = createMockQuery();
  return {
    ...query,
    doc: (id?: string) => createMockDoc(name, id),
    add: async (data: unknown) => {
      console.warn(`Firestore not configured - skipping add to ${name}`);
      return createMockDoc(name);
    },
  };
}

function createMockBatch() {
  return {
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {
      console.warn('Firestore not configured - skipping batch commit');
      return [];
    },
    create: () => {},
  };
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const firestore = getDb();
      if (!firestore) {
        if (prop === 'collection') return (name: string) => createMockCollection(name);
        if (prop === 'batch') return () => createMockBatch();
        if (prop === 'runTransaction') return async (fn: (t: unknown) => unknown) => {
          console.warn('Firestore not configured - skipping transaction');
          return undefined;
        };
        if (prop === 'getAll') return async () => [];
        if (prop === 'listCollections') return async () => [];
        if (prop === 'doc') return (path: string) => createMockDoc('', path);
        return undefined;
      }
      return (firestore as unknown as Record<string, unknown>)[prop as string];
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

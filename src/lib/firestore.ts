// Firestore database service
// Provides all database operations for the application
//
// IMPORTANT: Uses lazy loading for firebase-admin/firestore to prevent
// module-level failures. See firebase-admin.ts for details.

// Type-only imports (erased at compile time)
import type {
  DocumentReference,
  CollectionReference,
  DocumentData,
  Firestore,
  Timestamp as TimestampType,
} from 'firebase-admin/firestore';
import { getAdminFirestore, isAdminConfigured } from './firebase-admin';

// Lazy-loaded firebase-admin/firestore module
let _firestoreModule: typeof import('firebase-admin/firestore') | null = null;
let _moduleLoadAttempted = false;

function getFirestoreModule(): typeof import('firebase-admin/firestore') | null {
  if (_firestoreModule) return _firestoreModule;
  if (_moduleLoadAttempted) return null;
  _moduleLoadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _firestoreModule = require('firebase-admin/firestore');
    return _firestoreModule;
  } catch (error) {
    console.warn('[firestore] firebase-admin/firestore not available:', error);
    return null;
  }
}

// Collection names
export const COLLECTIONS = {
  TEST_CASES: 'testCases',
  TEST_RUNS: 'testRuns',
  TEST_SCRIPTS: 'testScripts',
  EXECUTIONS: 'executions',
  API_KEYS: 'apiKeys',
  WORKERS: 'workers',
  JOBS: 'jobs',
  STATS: 'stats',
  // V1 API collections
  PROJECTS: 'projects',
  SCANS: 'scans',
  SCAN_TEST_CASES: 'scanTestCases',
  SCAN_ISSUES: 'scanIssues',
  REPORTS: 'reports',
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
} as const;

/**
 * Check if Firestore is configured
 */
export function isFirestoreConfigured(): boolean {
  return isAdminConfigured();
}

/**
 * Initialize Firebase Admin and Firestore
 * @deprecated Use getDb() instead - initialization is automatic
 */
export function initializeFirestore(): Firestore | null {
  return getAdminFirestore();
}

/**
 * Get Firestore instance
 */
export function getDb(): Firestore | null {
  return getAdminFirestore();
}

/**
 * Get the Timestamp class from firebase-admin/firestore
 * Returns null if the module isn't available
 */
export function getTimestampClass() {
  return getFirestoreModule()?.Timestamp ?? null;
}

/**
 * Get the FieldValue class from firebase-admin/firestore
 * Returns null if the module isn't available
 */
export function getFieldValueClass() {
  return getFirestoreModule()?.FieldValue ?? null;
}

/**
 * Convert Firestore timestamp to Date
 */
export function toDate(timestamp: TimestampType | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof (timestamp as any).toDate === 'function') {
    return (timestamp as any).toDate();
  }
  return new Date();
}

/**
 * Convert Date to Firestore timestamp
 */
export function toTimestamp(date: Date | undefined): TimestampType {
  const mod = getFirestoreModule();
  if (mod?.Timestamp) {
    return mod.Timestamp.fromDate(date || new Date());
  }
  // Fallback: return the date itself (will work for comparisons)
  return (date || new Date()) as any;
}

/**
 * Generate a unique ID using crypto for better randomness
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  // Use crypto.getRandomValues for better randomness
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for Node.js environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(5);
    randomBytes.set(nodeRandom);
  }
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 7);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Get a collection reference
 */
export function getCollection<T = DocumentData>(
  collectionName: string
): CollectionReference<T> | null {
  const db = getDb();
  if (!db) return null;
  return db.collection(collectionName) as CollectionReference<T>;
}

/**
 * Get a document reference
 */
export function getDocument<T = DocumentData>(
  collectionName: string,
  docId: string
): DocumentReference<T> | null {
  const db = getDb();
  if (!db) return null;
  return db.collection(collectionName).doc(docId) as DocumentReference<T>;
}

/**
 * Batch write helper
 */
export async function batchWrite(
  operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: Record<string, unknown>;
  }>
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const batch = db.batch();

  for (const op of operations) {
    const ref = db.collection(op.collection).doc(op.id);
    switch (op.type) {
      case 'set':
        batch.set(ref, (op.data || {}) as FirebaseFirestore.DocumentData);
        break;
      case 'update':
        batch.update(ref, (op.data || {}) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        break;
      case 'delete':
        batch.delete(ref);
        break;
    }
  }

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Batch write failed:', error);
    return false;
  }
}

// Re-export Timestamp and FieldValue via lazy getters
// These are loaded lazily to prevent module-level failures
export const Timestamp = new Proxy({} as typeof import('firebase-admin/firestore').Timestamp, {
  get(_target, prop) {
    const mod = getFirestoreModule();
    if (mod?.Timestamp) {
      return (mod.Timestamp as any)[prop];
    }
    console.warn(`[firestore] Timestamp.${String(prop)} called but firebase-admin/firestore not loaded`);
    return undefined;
  },
  construct(_target, args) {
    const mod = getFirestoreModule();
    if (mod?.Timestamp) {
      return new (mod.Timestamp as any)(...args);
    }
    throw new Error('firebase-admin/firestore not available');
  },
});

export const FieldValue = new Proxy({} as typeof import('firebase-admin/firestore').FieldValue, {
  get(_target, prop) {
    const mod = getFirestoreModule();
    if (mod?.FieldValue) {
      return (mod.FieldValue as any)[prop];
    }
    console.warn(`[firestore] FieldValue.${String(prop)} called but firebase-admin/firestore not loaded`);
    return undefined;
  },
});

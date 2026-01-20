// Firestore database service
// Provides all database operations for the application

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import {
  getFirestore,
  Firestore,
  Timestamp,
  FieldValue,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
} from 'firebase-admin/firestore';

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
} as const;

// Singleton instance
let firestore: Firestore | null = null;
let app: App | null = null;

/**
 * Check if Firestore is configured
 */
export function isFirestoreConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

/**
 * Initialize Firebase Admin and Firestore
 */
export function initializeFirestore(): Firestore | null {
  if (firestore) return firestore;

  if (!isFirestoreConfigured()) {
    console.warn('Firestore not configured - using in-memory fallback');
    return null;
  }

  try {
    // Check if already initialized
    if (getApps().length === 0) {
      // Try to initialize with service account or default credentials
      const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT;

      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Use service account JSON
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      } else {
        // Use Application Default Credentials (works in Cloud environments)
        app = initializeApp({
          projectId,
        });
      }
    } else {
      app = getApps()[0];
    }

    firestore = getFirestore(app);
    console.log('Firestore initialized successfully');
    return firestore;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    return null;
  }
}

/**
 * Get Firestore instance
 */
export function getDb(): Firestore | null {
  return firestore || initializeFirestore();
}

/**
 * Convert Firestore timestamp to Date
 */
export function toDate(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

/**
 * Convert Date to Firestore timestamp
 */
export function toTimestamp(date: Date | undefined): Timestamp {
  return Timestamp.fromDate(date || new Date());
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
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

// Re-export useful Firestore utilities
export { Timestamp, FieldValue };

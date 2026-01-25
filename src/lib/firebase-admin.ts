/**
 * Firebase Admin SDK Initialization
 *
 * This is the SINGLE source of truth for Firebase Admin initialization.
 * All server-side Firebase operations should use this module.
 */

import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Singleton instances
let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;

/**
 * Get project ID from environment
 */
function getProjectId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

/**
 * Check if Firebase Admin is configured
 */
export function isAdminConfigured(): boolean {
  return !!(getProjectId() || process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

/**
 * Initialize Firebase Admin SDK
 * Returns true if initialization succeeded, false otherwise.
 * Safe to call multiple times - will only initialize once.
 */
export function initializeAdmin(): boolean {
  // If already initialized, return success
  if (adminApp) {
    return true;
  }

  // If we already tried and failed, don't retry
  if (initializationAttempted && initializationError) {
    return false;
  }

  initializationAttempted = true;

  // Check if already initialized by another module
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    console.log('Firebase Admin: Using existing app instance');
    return true;
  }

  const projectId = getProjectId();

  // Try service account key first (for local dev and some deployments)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log('Firebase Admin: Initialized with service account');
      return true;
    } catch (error) {
      console.error('Firebase Admin: Failed to parse service account key:', error);
      initializationError = error as Error;
      return false;
    }
  }

  // Try Application Default Credentials (for Cloud Run, App Hosting, etc.)
  // In Google Cloud environments, ADC is automatically available
  try {
    // First try with explicit ADC credential
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    console.log('Firebase Admin: Initialized with Application Default Credentials');
    return true;
  } catch (adcError) {
    console.warn('Firebase Admin: ADC initialization failed, trying without credential:', adcError);

    // Fallback: try without any options (works in some environments)
    try {
      adminApp = initializeApp();
      console.log('Firebase Admin: Initialized with auto-detection');
      return true;
    } catch (autoError) {
      console.error('Firebase Admin: All initialization methods failed:', autoError);
      initializationError = autoError as Error;
      return false;
    }
  }
}

/**
 * Get Firebase Admin Auth instance
 * Returns null if not initialized
 */
export function getAdminAuth(): Auth | null {
  if (!initializeAdmin()) {
    return null;
  }

  if (!adminAuth) {
    adminAuth = getAuth();
  }

  return adminAuth;
}

/**
 * Get Firebase Admin Firestore instance
 * Returns null if not initialized
 */
export function getAdminFirestore(): Firestore | null {
  if (!initializeAdmin()) {
    return null;
  }

  if (!adminFirestore) {
    adminFirestore = getFirestore();
  }

  return adminFirestore;
}

/**
 * Get the initialization error if any
 */
export function getInitializationError(): Error | null {
  return initializationError;
}

/**
 * Check if Firebase Admin is ready
 */
export function isAdminReady(): boolean {
  return adminApp !== null;
}

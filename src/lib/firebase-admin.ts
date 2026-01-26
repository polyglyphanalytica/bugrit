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
let initMethod = 'none';

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
    initMethod = 'existing-app';
    console.log('Firebase Admin: Using existing app instance');
    return true;
  }

  const projectId = getProjectId();
  const errors: string[] = [];

  // Method 1: Try service account key (for local dev and explicit deployments)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      initMethod = 'service-account';
      console.log('Firebase Admin: Initialized with service account');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Service account: ${msg}`);
      console.warn('Firebase Admin: Service account failed, trying ADC...', msg);
      // DO NOT return early - fall through to try ADC
    }
  }

  // Method 2: Try Application Default Credentials (for Cloud Run, App Hosting, etc.)
  try {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    initMethod = 'adc';
    console.log('Firebase Admin: Initialized with Application Default Credentials');
    return true;
  } catch (adcError) {
    const msg = adcError instanceof Error ? adcError.message : String(adcError);
    errors.push(`ADC: ${msg}`);
    console.warn('Firebase Admin: ADC failed, trying auto-detection...', msg);
  }

  // Method 3: Try without any options (auto-detection)
  try {
    adminApp = initializeApp();
    initMethod = 'auto';
    console.log('Firebase Admin: Initialized with auto-detection');
    return true;
  } catch (autoError) {
    const msg = autoError instanceof Error ? autoError.message : String(autoError);
    errors.push(`Auto: ${msg}`);
    console.error('Firebase Admin: All initialization methods failed:', errors.join(' | '));
    initializationError = new Error(`All init methods failed: ${errors.join(' | ')}`);
    return false;
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

/**
 * Get diagnostic information about Firebase Admin state
 */
export function getDiagnostics(): Record<string, unknown> {
  return {
    initialized: adminApp !== null,
    initMethod,
    initAttempted: initializationAttempted,
    hasError: initializationError !== null,
    errorMessage: initializationError?.message || null,
    projectId: getProjectId() || null,
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
    nodeEnv: process.env.NODE_ENV,
  };
}
/**
 * Firebase Admin SDK Initialization (Resilient Loading)
 *
 * This is the SINGLE source of truth for Firebase Admin initialization.
 * All server-side Firebase operations should use this module.
 *
 * IMPORTANT: This module uses lazy loading (require() inside try/catch)
 * instead of top-level imports to prevent module-level failures.
 * If firebase-admin can't be loaded, functions return null gracefully
 * instead of crashing the entire module tree with 500 errors.
 */

// Type-only imports - these are erased at compile time, no runtime effect
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// Singleton instances
let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;
let initMethod = 'none';
let moduleLoadError: string | null = null;

// Cached module references (loaded lazily)
let _appModule: typeof import('firebase-admin/app') | null = null;
let _authModule: typeof import('firebase-admin/auth') | null = null;
let _firestoreModule: typeof import('firebase-admin/firestore') | null = null;

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
 * Load the firebase-admin/app module (cached)
 */
function loadAppModule(): typeof import('firebase-admin/app') | null {
  if (_appModule) return _appModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _appModule = require('firebase-admin/app');
    return _appModule;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[firebase-admin] Failed to load firebase-admin/app:', msg);
    moduleLoadError = msg;
    return null;
  }
}

/**
 * Load the firebase-admin/auth module (cached)
 */
function loadAuthModule(): typeof import('firebase-admin/auth') | null {
  if (_authModule) return _authModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _authModule = require('firebase-admin/auth');
    return _authModule;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[firebase-admin] Failed to load firebase-admin/auth:', msg);
    moduleLoadError = msg;
    return null;
  }
}

/**
 * Load the firebase-admin/firestore module (cached)
 */
function loadFirestoreModule(): typeof import('firebase-admin/firestore') | null {
  if (_firestoreModule) return _firestoreModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _firestoreModule = require('firebase-admin/firestore');
    return _firestoreModule;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[firebase-admin] Failed to load firebase-admin/firestore:', msg);
    moduleLoadError = msg;
    return null;
  }
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

  // Load firebase-admin/app module lazily
  const appModule = loadAppModule();
  if (!appModule) {
    initializationError = new Error(`Cannot load firebase-admin/app: ${moduleLoadError}`);
    return false;
  }

  const { initializeApp, getApps, cert, applicationDefault } = appModule;

  // Check if already initialized by another module
  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      initMethod = 'existing-app';
      console.log('[firebase-admin] Using existing app instance');
      return true;
    }
  } catch (error) {
    console.warn('[firebase-admin] getApps() failed:', error);
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
      console.log('[firebase-admin] Initialized with service account');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Service account: ${msg}`);
      console.warn('[firebase-admin] Service account failed, trying ADC...', msg);
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
    console.log('[firebase-admin] Initialized with Application Default Credentials');
    return true;
  } catch (adcError) {
    const msg = adcError instanceof Error ? adcError.message : String(adcError);
    errors.push(`ADC: ${msg}`);
    console.warn('[firebase-admin] ADC failed, trying auto-detection...', msg);
  }

  // Method 3: Try without any options (auto-detection)
  try {
    adminApp = initializeApp();
    initMethod = 'auto';
    console.log('[firebase-admin] Initialized with auto-detection');
    return true;
  } catch (autoError) {
    const msg = autoError instanceof Error ? autoError.message : String(autoError);
    errors.push(`Auto: ${msg}`);
    console.error('[firebase-admin] All initialization methods failed:', errors.join(' | '));
    initializationError = new Error(`All init methods failed: ${errors.join(' | ')}`);
    return false;
  }
}

/**
 * Get Firebase Admin Auth instance
 * Returns null if not initialized or module not available
 */
export function getAdminAuth(): Auth | null {
  if (!initializeAdmin()) {
    return null;
  }

  if (!adminAuth) {
    const authModule = loadAuthModule();
    if (!authModule) return null;
    adminAuth = authModule.getAuth();
  }

  return adminAuth;
}

/**
 * Get Firebase Admin Firestore instance
 * Returns null if not initialized or module not available
 */
export function getAdminFirestore(): Firestore | null {
  if (!initializeAdmin()) {
    return null;
  }

  if (!adminFirestore) {
    const fsModule = loadFirestoreModule();
    if (!fsModule) return null;
    adminFirestore = fsModule.getFirestore();
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
    moduleLoadError: moduleLoadError || null,
    projectId: getProjectId() || null,
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
    nodeEnv: process.env.NODE_ENV,
  };
}

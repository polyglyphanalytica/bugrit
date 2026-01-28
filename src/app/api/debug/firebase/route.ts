import { NextResponse } from 'next/server';
import { getDiagnostics, initializeAdmin, isAdminReady } from '@/lib/firebase-admin';
import { getDb } from '@/lib/firestore';

/**
 * GET /api/debug/firebase
 *
 * Diagnostic endpoint to check Firebase Admin SDK status.
 * Helps debug why database operations might be failing.
 */
export async function GET() {
  // Attempt initialization
  const initResult = initializeAdmin();

  // Get diagnostics
  const diagnostics = getDiagnostics();

  // Check if Firestore is available
  const db = getDb();
  const firestoreAvailable = db !== null;

  // Test Firestore connection if available
  let firestoreConnected = false;
  let firestoreError: string | null = null;
  if (db) {
    try {
      // Try to access a collection (doesn't read data, just tests connection)
      await db.collection('_health_check').limit(1).get();
      firestoreConnected = true;
    } catch (error) {
      firestoreError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    adminSdk: {
      initializationSucceeded: initResult,
      isReady: isAdminReady(),
      ...diagnostics,
    },
    firestore: {
      available: firestoreAvailable,
      connected: firestoreConnected,
      connectionError: firestoreError,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasProjectId: !!(
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT
      ),
      hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    },
  });
}

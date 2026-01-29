import { NextResponse } from 'next/server';
import { getDiagnostics, initializeAdmin, getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Basic health check
    const diagnostics = getDiagnostics();

    // Try to initialize if not already done
    const initResult = initializeAdmin();

    // Test auth and firestore access
    let authTest = 'not-tested';
    let firestoreTest = 'not-tested';

    try {
      const auth = getAdminAuth();
      authTest = auth ? 'available' : 'null';
    } catch (e) {
      authTest = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    try {
      const fs = getAdminFirestore();
      firestoreTest = fs ? 'available' : 'null';
    } catch (e) {
      firestoreTest = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      firebase: {
        ...diagnostics,
        initResult,
        authTest,
        firestoreTest,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

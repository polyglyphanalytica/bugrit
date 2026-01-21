/**
 * Test Setup
 *
 * This file runs before each test file.
 * Set up global mocks and test utilities here.
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.ADMIN_ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.SUPERADMIN_EMAIL = 'admin@test.com';

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({})),
  cert: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
  })),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })),
      where: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
  })),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(),
    increment: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
  },
}));

// Mock next/headers for API route tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

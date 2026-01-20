// Database layer - exports all database operations
// Automatically uses Firestore when configured, falls back to in-memory store

export * from './test-cases';
export * from './test-runs';
export * from './test-scripts';
export * from './executions';
export * from './applications';
export * from './api-keys';

// Re-export Firestore utilities
export { isFirestoreConfigured, getDb, COLLECTIONS } from '../firestore';

// Firebase Authentication utilities
// Separate from main Firebase config for auth-specific functions

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import { User } from './types';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

// Initialize Firebase only on client-side when configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function initializeFirebase(): { app: FirebaseApp; auth: Auth } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured. Authentication will not work.');
    return null;
  }

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  }

  return { app, auth: auth! };
}

// Convert Firebase user to our User type
function convertUser(firebaseUser: FirebaseUser | null): User | null {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
}

/**
 * Login with email and password
 * Requires Firebase to be configured
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const firebase = initializeFirebase();

  if (!firebase) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      firebase.auth,
      email,
      password
    );
    const user = convertUser(userCredential.user);
    if (!user) throw new Error('Failed to get user after login');
    return user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    // Handle specific Firebase auth errors
    switch (firebaseError.code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        throw new Error('Invalid email or password');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later.');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled.');
      default:
        console.error('Login error:', firebaseError);
        throw new Error('An error occurred during login. Please try again.');
    }
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  const firebase = initializeFirebase();

  if (!firebase) {
    throw new Error('Authentication service not configured.');
  }

  try {
    await signOut(firebase.auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  const firebase = initializeFirebase();

  if (!firebase) {
    // If Firebase is not configured, call callback with null
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(firebase.auth, (firebaseUser) => {
    callback(convertUser(firebaseUser));
  });
}

/**
 * Get the current user synchronously
 */
export function getCurrentUser(): User | null {
  const firebase = initializeFirebase();

  if (!firebase) {
    return null;
  }

  return convertUser(firebase.auth.currentUser);
}

/**
 * Check if Firebase is configured
 */
export function isAuthConfigured(): boolean {
  return isFirebaseConfigured();
}

/**
 * Check if running in demo mode (Firebase not configured)
 */
export function isDemoMode(): boolean {
  return !isFirebaseConfigured();
}

/**
 * Register a new user with email and password
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const firebase = initializeFirebase();

  if (!firebase) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      firebase.auth,
      email,
      password
    );

    // Update display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    const user = convertUser(userCredential.user);
    if (!user) throw new Error('Failed to get user after registration');

    // Include the display name in the returned user
    if (displayName) {
      user.displayName = displayName;
    }

    return user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists.');
      case 'auth/invalid-email':
        throw new Error('Invalid email address.');
      case 'auth/operation-not-allowed':
        throw new Error('Email/password accounts are not enabled.');
      case 'auth/weak-password':
        throw new Error('Password is too weak. Use at least 6 characters.');
      default:
        console.error('Registration error:', firebaseError);
        throw new Error('An error occurred during registration. Please try again.');
    }
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  const firebase = initializeFirebase();

  if (!firebase) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    await sendPasswordResetEmail(firebase.auth, email);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    switch (firebaseError.code) {
      case 'auth/invalid-email':
        throw new Error('Invalid email address.');
      case 'auth/user-not-found':
        // Don't reveal if user exists for security
        return;
      default:
        console.error('Password reset error:', firebaseError);
        throw new Error('An error occurred. Please try again.');
    }
  }
}

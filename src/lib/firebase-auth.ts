// Firebase Authentication utilities
// Separate from main Firebase config for auth-specific functions

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase'; // Import from central config
import { User } from './types';
import { devConsole } from '@/lib/console';

// Check if running in demo mode (Firebase not configured)
export function isDemoMode(): boolean {
  return !isAuthConfigured();
}

// Convert Firebase user to our User type
function convertUser(firebaseUser: FirebaseUser | null): User | null {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    isAnonymous: firebaseUser.isAnonymous,
    phoneNumber: firebaseUser.phoneNumber,
    providerId: firebaseUser.providerId,
    refreshToken: firebaseUser.refreshToken,
    tenantId: firebaseUser.tenantId,
    metadata: {
      creationTime: firebaseUser.metadata?.creationTime,
      lastSignInTime: firebaseUser.metadata?.lastSignInTime,
    },
    providerData: firebaseUser.providerData.map(p => ({
      providerId: p.providerId,
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      phoneNumber: p.phoneNumber,
      photoURL: p.photoURL,
    })),
    getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh),
    getIdTokenResult: async (forceRefresh?: boolean) => {
      const result = await firebaseUser.getIdTokenResult(forceRefresh);
      return { token: result.token, claims: result.claims as Record<string, unknown> };
    },
    reload: () => firebaseUser.reload(),
    delete: () => firebaseUser.delete(),
    toJSON: () => firebaseUser.toJSON(),
  };
}

// Track if we've already created a session to avoid duplicate calls
let sessionCreationInProgress = false;
let lastSessionCreation = 0;
const SESSION_CREATION_DEBOUNCE_MS = 5000; // 5 seconds

/**
 * Create server-side session from Firebase ID token
 *
 * IMPORTANT: createSessionCookie requires a fresh ID token (issued within last 5 minutes).
 * We force refresh the token to ensure it meets this requirement.
 */
async function createServerSession(user: User): Promise<void> {
  // Debounce session creation to avoid bombarding the endpoint
  const now = Date.now();
  if (sessionCreationInProgress || (now - lastSessionCreation) < SESSION_CREATION_DEBOUNCE_MS) {
    return;
  }

  sessionCreationInProgress = true;
  lastSessionCreation = now;

  try {
    // CRITICAL: Force refresh the token to ensure it's fresh enough for createSessionCookie
    // createSessionCookie requires the token to have been issued within the last 5 minutes
    const idToken = await user.getIdToken(true);

    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      devConsole.warn('Failed to create server session:', response.status, errorText);
    }
  } catch (error) {
    devConsole.warn('Failed to create server session:', error);
  } finally {
    sessionCreationInProgress = false;
  }
}

/**
 * Login with email and password
 * Requires Firebase to be configured
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  if (!isAuthConfigured()) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = convertUser(userCredential.user);
    if (!user) throw new Error('Failed to get user after login');

    // Create server-side session cookie
    await createServerSession(user);

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
        devConsole.error('Login error:', firebaseError);
        throw new Error('An error occurred during login. Please try again.');
    }
  }
}

/**
 * Clear server-side session
 */
async function clearServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch (error) {
    devConsole.warn('Failed to clear server session:', error);
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  // Always try to clear the server session
  await clearServerSession();

  if (!isAuthConfigured()) {
    // In demo mode, this will be a no-op client-side
    return;
  }

  try {
    await signOut(auth);
  } catch (error) {
    devConsole.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}


/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 *
 * Also ensures server-side session is created when user is authenticated
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  if (!isAuthConfigured()) {
    // If Firebase is not configured, call callback with null
    devConsole.warn("Auth not configured, onAuthChange will not fire.");
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    const user = convertUser(firebaseUser);

    // If user is logged in, ensure they have a server session
    if (user) {
      await createServerSession(user);
    }

    callback(user);
  });
}

/**
 * Get the current user synchronously
 */
export function getCurrentUser(): User | null {
  if (!isAuthConfigured()) {
    return null;
  }
  return convertUser(auth.currentUser);
}

/**
 * Check if Firebase is configured
 */
export function isAuthConfigured(): boolean {
  return !!auth?.app?.options?.apiKey;
}

/**
 * Register a new user with email and password
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
    if (!isAuthConfigured()) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
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

    // Create server-side session cookie
    await createServerSession(user);

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
        devConsole.error('Registration error:', firebaseError);
        throw new Error('An error occurred during registration. Please try again.');
    }
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error('Authentication service not configured. Please configure Firebase environment variables.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    switch (firebaseError.code) {
      case 'auth/invalid-email':
        throw new Error('Invalid email address.');
      case 'auth/user-not-found':
        // Don't reveal if user exists for security
        return;
      default:
        devConsole.error('Password reset error:', firebaseError);
        throw new Error('An error occurred. Please try again.');
    }
  }
}

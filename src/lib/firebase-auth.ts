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
  if (!isAuthConfigured()) {
    // In demo mode, this will be a no-op client-side
    return;
  }

  try {
    await signOut(auth);
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
  if (!isAuthConfigured()) {
    // If Firebase is not configured, call callback with null
    console.warn("Auth not configured, onAuthChange will not fire.");
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(convertUser(firebaseUser));
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
        console.error('Password reset error:', firebaseError);
        throw new Error('An error occurred. Please try again.');
    }
  }
}

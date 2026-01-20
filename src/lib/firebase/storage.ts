// Firebase Storage utilities for file uploads
// Used for source code ZIP, mobile binaries, etc.

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isStorageConfigured(): boolean {
  return !!(firebaseConfig.storageBucket && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isStorageConfigured()) {
    console.warn('Firebase Storage not configured');
    return null;
  }

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }

  return app;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'scans/scan-123/source.zip')
 * @param onProgress - Optional progress callback
 */
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    // Demo mode - simulate upload
    console.log('Demo mode: Simulating file upload to', path);

    // Simulate progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress({
          bytesTransferred: (file.size * i) / 100,
          totalBytes: file.size,
          percentage: i,
          state: i < 100 ? 'running' : 'success',
        });
      }
    }

    return {
      downloadUrl: `https://storage.demo.local/${path}`,
      storagePath: path,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  const storage = getStorage(firebaseApp);
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress: UploadProgress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          state: snapshot.state as UploadProgress['state'],
        };
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(new Error('Failed to upload file'));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath: path,
            fileName: file.name,
            fileSize: file.size,
          });
        } catch (error) {
          reject(new Error('Failed to get download URL'));
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage
 * @param path - The storage path to delete
 */
export async function deleteFile(path: string): Promise<void> {
  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    console.log('Demo mode: Simulating file deletion at', path);
    return;
  }

  const storage = getStorage(firebaseApp);
  const storageRef = ref(storage, path);

  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Generate a storage path for scan uploads
 */
export function getScanUploadPath(
  userId: string,
  applicationId: string,
  scanId: string,
  fileName: string
): string {
  // Structure: users/{userId}/applications/{appId}/scans/{scanId}/{fileName}
  return `users/${userId}/applications/${applicationId}/scans/${scanId}/${fileName}`;
}

/**
 * Check if Firebase Storage is available
 */
export function isStorageAvailable(): boolean {
  return isStorageConfigured();
}

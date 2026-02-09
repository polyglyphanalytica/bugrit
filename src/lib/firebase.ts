import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import {
  getDefaultEnvironment,
  getFirestoreDatabaseId,
  DEFAULT_FIRESTORE_DATABASE_ID,
} from "@/lib/environment";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const FIRESTORE_DATABASE_ID = getFirestoreDatabaseId(getDefaultEnvironment());

function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}

let app: FirebaseApp;
if (!isFirebaseConfigured()) {
  console.error("Firebase is not configured. Please check your environment variables.");
  // Mock app for environments without firebase config
  app = {} as FirebaseApp;
} else if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}


const auth: Auth = isFirebaseConfigured() ? getAuth(app) : ({} as Auth);
const db: Firestore = isFirebaseConfigured() ? createFirestoreInstance(app) : ({} as Firestore);
const storage: FirebaseStorage = isFirebaseConfigured() ? getStorage(app) : ({} as FirebaseStorage);

export { app, auth, db, storage };

function createFirestoreInstance(app: FirebaseApp): Firestore {
  const firestore = getFirestore(app);
  if (FIRESTORE_DATABASE_ID !== DEFAULT_FIRESTORE_DATABASE_ID) {
    firestore.settings({ databaseId: FIRESTORE_DATABASE_ID });
  }
  return firestore;
}

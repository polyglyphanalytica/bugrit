// Firestore operations for Applications

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import {
  Application,
  ApplicationSettings,
  CreateApplicationRequest,
  NativePlatform,
  BrowserType,
} from '../types';

// Add to collections
const APPLICATIONS_COLLECTION = 'applications';

/**
 * Default application settings
 */
const DEFAULT_SETTINGS: ApplicationSettings = {
  // Test defaults
  defaultBrowsers: ['chromium'],
  defaultTimeout: 30000,
  enableScreenshots: true,
  enableVideo: false,

  // Email notifications
  emailEnabled: false,
  emailRecipients: [],
  emailNotifyOnFailure: true,
  emailNotifyOnSuccess: false,

  // Slack integration
  slackEnabled: false,
  slackNotifyOnFailure: true,
  slackNotifyOnSuccess: false,

  // Webhook
  webhookEnabled: false,

  // Scheduling
  scheduling: {
    // Uptime monitoring
    enableUptimeMonitoring: false,
    uptimeCheckInterval: 5,
    uptimeEndpoints: [],
    // Daily smoke tests
    enableDailySmoke: false,
    dailySmokeTime: '06:00',
    dailySmokeDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    // Weekly regression
    enableWeeklyRegression: false,
    weeklyRegressionDay: 'sun',
    weeklyRegressionTime: '02:00',
    // Triggers
    runOnDeployment: true,
    deploymentTestType: 'smoke',
    runOnPullRequest: false,
    prTestType: 'affected',
    // Custom cron
    customCronEnabled: false,
  },
};

/**
 * Get all applications for a user
 */
export async function getApplicationsByOwner(ownerId: string): Promise<Application[]> {
  const db = getDb();

  if (!db) {
    console.warn('Firestore not configured - returning empty applications list');
    return [];
  }

  try {
    const snapshot = await db
      .collection(APPLICATIONS_COLLECTION)
      .where('ownerId', '==', ownerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        type: data.type,
        platforms: data.platforms || [],
        targetUrl: data.targetUrl,
        packageId: data.packageId,
        bundleId: data.bundleId,
        tauriAppName: data.tauriAppName,
        settings: data.settings || DEFAULT_SETTINGS,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Application;
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    return [];
  }
}

/**
 * Get a single application by ID
 */
export async function getApplication(id: string): Promise<Application | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  try {
    const doc = await db.collection(APPLICATIONS_COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      type: data.type,
      platforms: data.platforms || [],
      targetUrl: data.targetUrl,
      packageId: data.packageId,
      bundleId: data.bundleId,
      tauriAppName: data.tauriAppName,
      settings: data.settings || DEFAULT_SETTINGS,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Application;
  } catch (error) {
    console.error('Error getting application:', error);
    return null;
  }
}

/**
 * Create a new application
 */
export async function createApplication(
  request: CreateApplicationRequest,
  ownerId: string
): Promise<Application> {
  const db = getDb();
  if (!db) {
    throw new Error('Database unavailable. Please try again later.');
  }

  const id = generateId('app');
  const now = new Date();

  // Determine default platforms based on type
  let platforms: NativePlatform[] = request.platforms || [];
  if (platforms.length === 0) {
    switch (request.type) {
      case 'mobile':
        platforms = ['android', 'ios'];
        break;
      case 'desktop':
        platforms = ['windows', 'macos', 'linux'];
        break;
      case 'hybrid':
        platforms = ['android', 'ios', 'windows', 'macos', 'linux'];
        break;
      default:
        platforms = [];
    }
  }

  const newApp: Application = {
    id,
    name: request.name,
    description: request.description,
    ownerId,
    type: request.type,
    platforms,
    targetUrl: request.targetUrl,
    packageId: request.packageId,
    bundleId: request.bundleId,
    tauriAppName: request.tauriAppName,
    settings: DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection(APPLICATIONS_COLLECTION).doc(id).set({
      name: newApp.name,
      description: newApp.description,
      ownerId: newApp.ownerId,
      type: newApp.type,
      platforms: newApp.platforms,
      targetUrl: newApp.targetUrl || null,
      packageId: newApp.packageId || null,
      bundleId: newApp.bundleId || null,
      tauriAppName: newApp.tauriAppName || null,
      settings: newApp.settings,
      createdAt: toTimestamp(now),
      updatedAt: toTimestamp(now),
    });

    return newApp;
  } catch (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application');
  }
}

/**
 * Update an application
 */
export async function updateApplication(
  id: string,
  updates: Partial<Omit<Application, 'id' | 'ownerId' | 'createdAt'>>
): Promise<Application | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Database unavailable. Please try again later.');
  }

  try {
    const docRef = db.collection(APPLICATIONS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: toTimestamp(new Date()),
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await docRef.update(updateData);

    return getApplication(id);
  } catch (error) {
    console.error('Error updating application:', error);
    return null;
  }
}

/**
 * Update application settings
 */
export async function updateApplicationSettings(
  id: string,
  settings: Partial<ApplicationSettings>
): Promise<Application | null> {
  const app = await getApplication(id);
  if (!app) return null;

  const newSettings = {
    ...app.settings,
    ...settings,
  };

  return updateApplication(id, { settings: newSettings });
}

/**
 * Delete an application
 */
export async function deleteApplication(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    throw new Error('Database unavailable. Please try again later.');
  }

  try {
    // Also delete all associated API keys
    const keysSnapshot = await db
      .collection('apiKeys')
      .where('applicationId', '==', id)
      .get();

    const batch = db.batch();
    keysSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(db.collection(APPLICATIONS_COLLECTION).doc(id));

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting application:', error);
    return false;
  }
}

/**
 * Check if user owns application
 */
export async function isApplicationOwner(
  applicationId: string,
  userId: string
): Promise<boolean> {
  const app = await getApplication(applicationId);
  return app?.ownerId === userId;
}

/**
 * Get all applications (admin only)
 */
export async function getAllApplications(): Promise<Application[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  try {
    const snapshot = await db
      .collection(APPLICATIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        type: data.type,
        platforms: data.platforms || [],
        targetUrl: data.targetUrl,
        packageId: data.packageId,
        bundleId: data.bundleId,
        tauriAppName: data.tauriAppName,
        settings: data.settings || DEFAULT_SETTINGS,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Application;
    });
  } catch (error) {
    console.error('Error getting all applications:', error);
    return [];
  }
}

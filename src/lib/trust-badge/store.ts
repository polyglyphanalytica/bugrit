/**
 * Trust Badge Site Store
 *
 * Manages registered sites for trust badge functionality.
 * Uses Firebase Admin SDK for server-side operations.
 */

import { getDb, FieldValue } from '@/lib/firestore';
import type { RegisteredSite, SiteCategory } from './types';

const SITES_COLLECTION = 'trustBadgeSites';

/**
 * Register a new site for trust badge
 */
export async function registerSite(
  domain: string,
  ownerId: string,
  metadata: {
    siteName: string;
    description?: string;
    category: SiteCategory;
    contactEmail?: string;
    privacyPolicyUrl?: string;
  }
): Promise<RegisteredSite> {
  const db = getDb();
  if (!db) throw new Error('Database not available');

  const siteId = generateSiteId();
  const normalizedDomain = normalizeDomain(domain);

  const site: RegisteredSite = {
    id: siteId,
    domain: normalizedDomain,
    verifiedAt: null,
    ownerId,

    metadata: {
      siteName: metadata.siteName,
      description: metadata.description || '',
      logoUrl: undefined,
      category: metadata.category,
      contactEmail: metadata.contactEmail,
      privacyPolicyUrl: metadata.privacyPolicyUrl,
    },

    latestScan: null,

    badgeConfig: {
      enabled: true,
      allowedDomains: [normalizedDomain, `www.${normalizedDomain}`],
      size: 'medium',
      theme: 'auto',
    },

    stats: {
      badgeViews: 0,
      badgeClicks: 0,
      verificationPageViews: 0,
    },

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(SITES_COLLECTION).doc(siteId).set(serializeSite(site));

  return site;
}

/**
 * Get a site by ID
 */
export async function getSiteById(siteId: string): Promise<RegisteredSite | null> {
  const db = getDb();
  if (!db) return null;

  const docSnap = await db.collection(SITES_COLLECTION).doc(siteId).get();

  if (!docSnap.exists) return null;

  return deserializeSite(docSnap.data() as Record<string, unknown>);
}

/**
 * Get a site by domain
 */
export async function getSiteByDomain(domain: string): Promise<RegisteredSite | null> {
  const db = getDb();
  if (!db) return null;

  const normalizedDomain = normalizeDomain(domain);
  const snapshot = await db
    .collection(SITES_COLLECTION)
    .where('domain', '==', normalizedDomain)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return deserializeSite(snapshot.docs[0].data() as Record<string, unknown>);
}

/**
 * Get all sites for a user
 */
export async function getSitesByOwner(ownerId: string): Promise<RegisteredSite[]> {
  const db = getDb();
  if (!db) return [];

  const snapshot = await db
    .collection(SITES_COLLECTION)
    .where('ownerId', '==', ownerId)
    .get();

  return snapshot.docs.map((doc) => deserializeSite(doc.data() as Record<string, unknown>));
}

/**
 * Update site metadata
 */
export async function updateSiteMetadata(
  siteId: string,
  metadata: Partial<RegisteredSite['metadata']>
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    metadata: { ...site.metadata, ...metadata },
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update badge configuration
 */
export async function updateBadgeConfig(
  siteId: string,
  config: Partial<RegisteredSite['badgeConfig']>
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    badgeConfig: { ...site.badgeConfig, ...config },
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update scan data for a site
 */
export async function updateSiteScanData(
  siteId: string,
  scanData: RegisteredSite['latestScan']
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    latestScan: scanData
      ? {
          ...scanData,
          scannedAt: scanData.scannedAt.toISOString(),
        }
      : null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Track badge view
 */
export async function trackBadgeView(siteId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    'stats.badgeViews': FieldValue.increment(1),
  });
}

/**
 * Track badge click
 */
export async function trackBadgeClick(siteId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    'stats.badgeClicks': FieldValue.increment(1),
  });
}

/**
 * Track verification page view
 */
export async function trackVerificationPageView(siteId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(SITES_COLLECTION).doc(siteId).update({
    'stats.verificationPageViews': FieldValue.increment(1),
  });
}

/**
 * Generate a verification token for a site
 */
export function generateVerificationToken(siteId: string): string {
  // Generate a deterministic but unpredictable token based on siteId
  const encoder = new TextEncoder();
  const data = encoder.encode(siteId + (process.env.ADMIN_ENCRYPTION_KEY || 'bugrit-verify'));
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return `bugrit-verify-${Math.abs(hash).toString(36)}`;
}

/**
 * Verify domain ownership via file-based verification
 * User must place a file at /.well-known/bugrit-verification.txt
 * containing the verification token
 */
export async function verifyDomain(siteId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not available' };

  const site = await getSiteById(siteId);
  if (!site) return { success: false, error: 'Site not found' };

  const expectedToken = generateVerificationToken(siteId);
  const verificationUrl = `https://${site.domain}/.well-known/bugrit-verification.txt`;

  try {
    // Fetch the verification file from the domain
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(verificationUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Bugrit-Domain-Verifier/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Could not access verification file (HTTP ${response.status}). Please ensure ${verificationUrl} exists and is publicly accessible.`,
      };
    }

    const content = await response.text();
    const actualToken = content.trim();

    if (actualToken !== expectedToken) {
      return {
        success: false,
        error: `Verification token mismatch. Expected: ${expectedToken}`,
      };
    }

    // Verification successful - update the site
    await db.collection(SITES_COLLECTION).doc(siteId).update({
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Verification request timed out' };
    }
    return {
      success: false,
      error: `Failed to verify domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get verification instructions for a site
 */
export function getVerificationInstructions(siteId: string, domain: string): {
  token: string;
  filePath: string;
  fullUrl: string;
  instructions: string;
} {
  const token = generateVerificationToken(siteId);
  const filePath = '/.well-known/bugrit-verification.txt';
  const fullUrl = `https://${domain}${filePath}`;

  return {
    token,
    filePath,
    fullUrl,
    instructions: `To verify ownership of ${domain}:

1. Create a file at ${filePath} on your website
2. Add this exact content to the file: ${token}
3. Ensure the file is publicly accessible at ${fullUrl}
4. Click "Verify" to complete domain verification

The verification file should return the token as plain text.`,
  };
}

/**
 * Add allowed domain for badge embedding
 */
export async function addAllowedDomain(
  siteId: string,
  domain: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  const normalizedDomain = normalizeDomain(domain);

  if (!site.badgeConfig.allowedDomains.includes(normalizedDomain)) {
    await db.collection(SITES_COLLECTION).doc(siteId).update({
      'badgeConfig.allowedDomains': FieldValue.arrayUnion(normalizedDomain),
      updatedAt: new Date().toISOString(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

function generateSiteId(): string {
  const timestamp = Date.now().toString(36);
  // Use crypto.getRandomValues for better randomness
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for Node.js environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(5);
    randomBytes.set(nodeRandom);
  }
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 7);
  return `site_${timestamp}_${random}`;
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
}

function serializeSite(site: RegisteredSite): Record<string, unknown> {
  return {
    ...site,
    verifiedAt: site.verifiedAt?.toISOString() || null,
    latestScan: site.latestScan
      ? {
          ...site.latestScan,
          scannedAt: site.latestScan.scannedAt.toISOString(),
        }
      : null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

function deserializeSite(data: Record<string, unknown>): RegisteredSite {
  return {
    ...data,
    verifiedAt: data.verifiedAt ? new Date(data.verifiedAt as string) : null,
    latestScan: data.latestScan
      ? {
          ...(data.latestScan as Record<string, unknown>),
          scannedAt: new Date((data.latestScan as Record<string, unknown>).scannedAt as string),
        }
      : null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  } as RegisteredSite;
}

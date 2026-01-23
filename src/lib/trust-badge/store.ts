/**
 * Trust Badge Site Store
 *
 * Manages registered sites for trust badge functionality.
 */

import { db } from '@/lib/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
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

  if (db) {
    await setDoc(doc(db, SITES_COLLECTION, siteId), serializeSite(site));
  }

  return site;
}

/**
 * Get a site by ID
 */
export async function getSiteById(siteId: string): Promise<RegisteredSite | null> {
  if (!db) return null;

  const docRef = doc(db, SITES_COLLECTION, siteId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return deserializeSite(docSnap.data());
}

/**
 * Get a site by domain
 */
export async function getSiteByDomain(domain: string): Promise<RegisteredSite | null> {
  if (!db) return null;

  const normalizedDomain = normalizeDomain(domain);
  const q = query(
    collection(db, SITES_COLLECTION),
    where('domain', '==', normalizedDomain)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return deserializeSite(snapshot.docs[0].data());
}

/**
 * Get all sites for a user
 */
export async function getSitesByOwner(ownerId: string): Promise<RegisteredSite[]> {
  if (!db) return [];

  const q = query(
    collection(db, SITES_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => deserializeSite(doc.data()));
}

/**
 * Update site metadata
 */
export async function updateSiteMetadata(
  siteId: string,
  metadata: Partial<RegisteredSite['metadata']>
): Promise<void> {
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
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
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
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
  if (!db) return;

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
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
  if (!db) return;

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
    'stats.badgeViews': increment(1),
  });
}

/**
 * Track badge click
 */
export async function trackBadgeClick(siteId: string): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
    'stats.badgeClicks': increment(1),
  });
}

/**
 * Track verification page view
 */
export async function trackVerificationPageView(siteId: string): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
    'stats.verificationPageViews': increment(1),
  });
}

/**
 * Verify domain ownership (e.g., via DNS TXT record or meta tag)
 */
export async function verifyDomain(siteId: string): Promise<boolean> {
  if (!db) return false;

  // TODO: Implement actual domain verification
  // Options:
  // 1. DNS TXT record
  // 2. Meta tag on homepage
  // 3. File upload (.well-known/bugrit-verification.txt)

  await updateDoc(doc(db, SITES_COLLECTION, siteId), {
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * Add allowed domain for badge embedding
 */
export async function addAllowedDomain(
  siteId: string,
  domain: string
): Promise<void> {
  if (!db) return;

  const site = await getSiteById(siteId);
  if (!site) throw new Error('Site not found');

  const normalizedDomain = normalizeDomain(domain);

  if (!site.badgeConfig.allowedDomains.includes(normalizedDomain)) {
    await updateDoc(doc(db, SITES_COLLECTION, siteId), {
      'badgeConfig.allowedDomains': [
        ...site.badgeConfig.allowedDomains,
        normalizedDomain,
      ],
      updatedAt: new Date().toISOString(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

function generateSiteId(): string {
  return `site_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
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

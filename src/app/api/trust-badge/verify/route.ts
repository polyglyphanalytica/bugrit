import { NextRequest, NextResponse } from 'next/server';
import { getSiteById, trackBadgeView as dbTrackBadgeView } from '@/lib/trust-badge/store';
import { getDb, COLLECTIONS } from '@/lib/firestore';

/**
 * Trust Badge Verification API
 *
 * Called by the embed script to verify domain and get badge data.
 * Returns the vibe score only if:
 * 1. Domain matches the registered site
 * 2. Site has a legitimate scan on Bugrit
 * 3. Site owner has a valid subscription
 *
 * If any check fails, returns advertising mode instead of score.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get('siteId');
  const domain = searchParams.get('domain');

  // CORS headers for cross-origin script access
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
  };

  // If missing parameters, show advertising badge
  if (!siteId || !domain) {
    return NextResponse.json(
      {
        valid: false,
        mode: 'advertising',
        reason: 'missing_params',
      },
      { headers: corsHeaders }
    );
  }

  try {
    // Fetch site from database
    const site = await getRegisteredSite(siteId);

    // Check 1: Site must exist
    if (!site) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'site_not_found',
        },
        { headers: corsHeaders }
      );
    }

    // Check 2: Domain must be authorized
    const normalizedDomain = normalizeDomain(domain);
    if (!isDomainAllowed(normalizedDomain, site)) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'domain_not_authorized',
        },
        { headers: corsHeaders }
      );
    }

    // Check 3: Badge must be enabled
    if (!site.badgeConfig.enabled) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'badge_disabled',
        },
        { headers: corsHeaders }
      );
    }

    // Check 4: Must have a legitimate scan (not just registered)
    if (!site.latestScan) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'no_scan',
        },
        { headers: corsHeaders }
      );
    }

    // Check 5: Scan must be recent (within 90 days)
    const scanAge = Date.now() - site.latestScan.scannedAt.getTime();
    const maxScanAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (scanAge > maxScanAge) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'scan_expired',
        },
        { headers: corsHeaders }
      );
    }

    // Check 6: Must have valid subscription
    const subscription = await getSubscriptionStatus(site.ownerId);
    if (!subscription.isValid) {
      return NextResponse.json(
        {
          valid: false,
          mode: 'advertising',
          reason: 'no_subscription',
        },
        { headers: corsHeaders }
      );
    }

    // All checks passed! Track view and return score
    trackBadgeViewLocal(siteId).catch(console.error);

    return NextResponse.json(
      {
        valid: true,
        mode: 'verified',
        siteId: site.id,
        domain: site.domain,
        score: site.latestScan.vibeScore,
        grade: site.latestScan.grade,
        scannedAt: site.latestScan.scannedAt,
        siteName: site.metadata.siteName,
        subscriptionTier: subscription.tier,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[TrustBadge] Verification error:', error);
    // On error, show advertising badge (fail gracefully)
    return NextResponse.json(
      {
        valid: false,
        mode: 'advertising',
        reason: 'internal_error',
      },
      { headers: corsHeaders }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Helper functions (TODO: Move to store module)
// ═══════════════════════════════════════════════════════════════

interface RegisteredSite {
  id: string;
  domain: string;
  ownerId: string;
  metadata: {
    siteName: string;
    description: string;
  };
  latestScan: {
    vibeScore: number;
    grade: string;
    scannedAt: Date;
    scanId: string; // Links to actual scan record
  } | null;
  badgeConfig: {
    enabled: boolean;
    allowedDomains: string[];
  };
}

interface SubscriptionStatus {
  isValid: boolean;
  tier: 'free' | 'pro' | 'enterprise' | null;
  expiresAt: Date | null;
  reason?: string;
}

async function getRegisteredSite(siteId: string): Promise<RegisteredSite | null> {
  const site = await getSiteById(siteId);
  if (!site) return null;

  return {
    id: site.id,
    domain: site.domain,
    ownerId: site.ownerId,
    metadata: {
      siteName: site.metadata.siteName,
      description: site.metadata.description || '',
    },
    latestScan: site.latestScan
      ? {
          vibeScore: site.latestScan.vibeScore,
          grade: site.latestScan.grade,
          scannedAt: site.latestScan.scannedAt,
          scanId: site.latestScan.scanId,
        }
      : null,
    badgeConfig: {
      enabled: site.badgeConfig.enabled,
      allowedDomains: site.badgeConfig.allowedDomains,
    },
  };
}

async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const db = getDb();
  if (!db) {
    // If no database, allow badge display (graceful degradation)
    return { isValid: true, tier: 'free', expiresAt: null };
  }

  try {
    // Check user's subscription in Firestore
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return { isValid: false, tier: null, expiresAt: null, reason: 'user_not_found' };
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    if (!subscription) {
      // Free tier users can still use badges
      return { isValid: true, tier: 'free', expiresAt: null };
    }

    // Check if subscription is active
    const now = new Date();
    const expiresAt = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      return {
        isValid: true,
        tier: subscription.tier || 'pro',
        expiresAt,
      };
    }

    // Check if within grace period (subscription cancelled but not yet expired)
    if (expiresAt && expiresAt > now) {
      return {
        isValid: true,
        tier: subscription.tier || 'pro',
        expiresAt,
      };
    }

    return {
      isValid: false,
      tier: null,
      expiresAt: null,
      reason: 'subscription_expired',
    };
  } catch (error) {
    console.error('[TrustBadge] Subscription check error:', error);
    // On error, allow badge display (fail open for better UX)
    return { isValid: true, tier: 'free', expiresAt: null };
  }
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

function isDomainAllowed(domain: string, site: RegisteredSite): boolean {
  const normalizedDomain = normalizeDomain(domain);
  const registeredDomain = normalizeDomain(site.domain);

  // Exact match
  if (normalizedDomain === registeredDomain) {
    return true;
  }

  // Check allowed domains list
  for (const allowed of site.badgeConfig.allowedDomains) {
    if (normalizeDomain(allowed) === normalizedDomain) {
      return true;
    }
  }

  // Allow subdomains of registered domain
  if (normalizedDomain.endsWith('.' + registeredDomain)) {
    return true;
  }

  // Allow localhost for testing
  if (normalizedDomain === 'localhost' || normalizedDomain.startsWith('127.')) {
    return true;
  }

  return false;
}

async function trackBadgeViewLocal(siteId: string): Promise<void> {
  try {
    await dbTrackBadgeView(siteId);
  } catch (error) {
    // Non-critical - just log and continue
    console.error(`[TrustBadge] Failed to track view for ${siteId}:`, error);
  }
}

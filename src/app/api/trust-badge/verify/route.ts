import { NextRequest, NextResponse } from 'next/server';

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
    trackBadgeView(siteId).catch(console.error);

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
  // TODO: Implement Firestore lookup
  // For demo, return mock data
  if (siteId.startsWith('site_')) {
    return {
      id: siteId,
      domain: 'example.com',
      ownerId: 'user_demo123',
      metadata: {
        siteName: 'Example Site',
        description: 'A sample website',
      },
      latestScan: {
        vibeScore: 87,
        grade: 'B+',
        scannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        scanId: 'scan_abc123', // Proves this is a legitimate scan
      },
      badgeConfig: {
        enabled: true,
        allowedDomains: ['example.com', 'www.example.com', 'localhost'],
      },
    };
  }
  return null;
}

async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  // TODO: Implement actual subscription check from Stripe/billing system
  // Check:
  // 1. User has an active subscription (not expired)
  // 2. User is on a paid tier OR free tier with badge feature enabled
  // 3. Subscription is not cancelled/paused

  // For demo, check if user exists and return valid status
  if (userId) {
    return {
      isValid: true,
      tier: 'pro',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }

  return {
    isValid: false,
    tier: null,
    expiresAt: null,
    reason: 'no_subscription',
  };
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

async function trackBadgeView(siteId: string): Promise<void> {
  // TODO: Implement analytics tracking
  console.log(`[TrustBadge] View tracked for ${siteId}`);
}

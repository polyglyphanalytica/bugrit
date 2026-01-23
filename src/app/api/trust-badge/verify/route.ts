import { NextRequest, NextResponse } from 'next/server';

/**
 * Trust Badge Verification API
 *
 * Called by the embed script to verify domain and get badge data.
 * Returns the vibe score only if the domain matches the registered site.
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

  if (!siteId || !domain) {
    return NextResponse.json(
      { valid: false, error: 'Missing parameters' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // TODO: Fetch from Firestore
    const site = await getRegisteredSite(siteId);

    if (!site) {
      return NextResponse.json(
        { valid: false, error: 'Site not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify domain matches
    const normalizedDomain = normalizeDomain(domain);
    const registeredDomain = normalizeDomain(site.domain);

    if (!isDomainAllowed(normalizedDomain, site)) {
      return NextResponse.json(
        { valid: false, error: 'Domain not authorized' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if badge is enabled
    if (!site.badgeConfig.enabled) {
      return NextResponse.json(
        { valid: false, error: 'Badge disabled' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if site has been scanned
    if (!site.latestScan) {
      return NextResponse.json(
        { valid: false, error: 'No scan data' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Track badge view (async, don't wait)
    trackBadgeView(siteId).catch(console.error);

    // Return badge data
    return NextResponse.json(
      {
        valid: true,
        siteId: site.id,
        domain: site.domain,
        score: site.latestScan.vibeScore,
        grade: site.latestScan.grade,
        scannedAt: site.latestScan.scannedAt,
        siteName: site.metadata.siteName,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[TrustBadge] Verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal error' },
      { status: 500, headers: corsHeaders }
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
  metadata: {
    siteName: string;
    description: string;
  };
  latestScan: {
    vibeScore: number;
    grade: string;
    scannedAt: Date;
  } | null;
  badgeConfig: {
    enabled: boolean;
    allowedDomains: string[];
  };
}

async function getRegisteredSite(siteId: string): Promise<RegisteredSite | null> {
  // TODO: Implement Firestore lookup
  // For demo, return mock data
  if (siteId.startsWith('site_')) {
    return {
      id: siteId,
      domain: 'example.com',
      metadata: {
        siteName: 'Example Site',
        description: 'A sample website',
      },
      latestScan: {
        vibeScore: 87,
        grade: 'B+',
        scannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      badgeConfig: {
        enabled: true,
        allowedDomains: ['example.com', 'www.example.com', 'localhost'],
      },
    };
  }
  return null;
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

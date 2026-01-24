import { NextRequest, NextResponse } from 'next/server';
import { getSiteById } from '@/lib/trust-badge/store';
import { logger } from '@/lib/logger';

/**
 * Trust Badge Embed API
 *
 * Returns embed code and AI prompts for programmatic badge installation.
 * Designed to be consumed by AI agents like Claude Code, Cursor, etc.
 */

type BadgeSize = 'small' | 'medium' | 'large';
type BadgeTheme = 'light' | 'dark' | 'auto';
type BadgePosition = 'inline' | 'fixed-bottom-right' | 'fixed-bottom-left';

interface EmbedResponse {
  success: boolean;
  siteId: string;
  domain: string;
  currentScore: number;
  currentGrade: string;
  lastScannedAt: string;

  // Embed options
  script: string;
  scriptMinified: string;

  // AI-friendly prompt
  aiPrompt: string;

  // Verification URL
  verificationUrl: string;

  // Configuration used
  config: {
    size: BadgeSize;
    theme: BadgeTheme;
    position: BadgePosition;
  };

  // Alternative: container placement
  containerHtml: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get('siteId');
  const size = (searchParams.get('size') || 'medium') as BadgeSize;
  const theme = (searchParams.get('theme') || 'auto') as BadgeTheme;
  const position = (searchParams.get('position') || 'inline') as BadgePosition;

  if (!siteId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing siteId parameter',
        usage: 'GET /api/trust-badge/embed?siteId=YOUR_SITE_ID&size=medium&theme=auto&position=inline',
      },
      { status: 400 }
    );
  }

  // Validate parameters
  if (!['small', 'medium', 'large'].includes(size)) {
    return NextResponse.json(
      { success: false, error: 'Invalid size. Use: small, medium, or large' },
      { status: 400 }
    );
  }

  if (!['light', 'dark', 'auto'].includes(theme)) {
    return NextResponse.json(
      { success: false, error: 'Invalid theme. Use: light, dark, or auto' },
      { status: 400 }
    );
  }

  if (!['inline', 'fixed-bottom-right', 'fixed-bottom-left'].includes(position)) {
    return NextResponse.json(
      { success: false, error: 'Invalid position. Use: inline, fixed-bottom-right, or fixed-bottom-left' },
      { status: 400 }
    );
  }

  try {
    // Fetch site from database
    const site = await getRegisteredSite(siteId);

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found. Please register your site first.' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.dev';

    // Generate embed script
    const script = `<!-- Bugrit Trust Badge -->
<script src="${baseUrl}/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${size}"
  data-theme="${theme}"
  data-position="${position}"
  async></script>
<!-- End Bugrit Trust Badge -->`;

    // Minified version (single line)
    const scriptMinified = `<script src="${baseUrl}/badge/embed.js" data-site-id="${siteId}" data-size="${size}" data-theme="${theme}" data-position="${position}" async></script>`;

    // Container HTML for explicit placement
    const containerHtml = `<div id="bugrit-badge"></div>
${scriptMinified}`;

    // AI-friendly prompt
    const aiPrompt = generateAIPrompt(siteId, site.domain, { size, theme, position });

    const response: EmbedResponse = {
      success: true,
      siteId,
      domain: site.domain,
      currentScore: site.latestScan?.vibeScore ?? 0,
      currentGrade: site.latestScan?.grade ?? 'N/A',
      lastScannedAt: site.latestScan?.scannedAt?.toISOString() ?? '',

      script,
      scriptMinified,
      aiPrompt,

      verificationUrl: `${baseUrl}/verified/${siteId}`,

      config: { size, theme, position },
      containerHtml,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[TrustBadge] Embed API error', { siteId, error });
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

interface Site {
  id: string;
  domain: string;
  latestScan: {
    vibeScore: number;
    grade: string;
    scannedAt: Date;
  } | null;
}

async function getRegisteredSite(siteId: string): Promise<Site | null> {
  try {
    const site = await getSiteById(siteId);
    if (!site) return null;

    return {
      id: site.id,
      domain: site.domain,
      latestScan: site.latestScan
        ? {
            vibeScore: site.latestScan.vibeScore,
            grade: site.latestScan.grade,
            scannedAt: site.latestScan.scannedAt,
          }
        : null,
    };
  } catch (error) {
    logger.error('Error fetching registered site', { siteId, error });
    return null;
  }
}

function generateAIPrompt(
  siteId: string,
  domain: string,
  config: { size: BadgeSize; theme: BadgeTheme; position: BadgePosition }
): string {
  const sizeDimensions: Record<BadgeSize, string> = {
    small: '120×40',
    medium: '160×52',
    large: '200×64',
  };

  return `# Add Bugrit Trust Badge to ${domain}

Add this script just before </body>:

\`\`\`html
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  data-position="${config.position}"
  async></script>
\`\`\`

## Badge Behavior

The badge dynamically verifies:
1. Site has a legitimate scan on Bugrit
2. Site owner has a valid subscription

**If verified:** Shows "Checked for Safety [SCORE] by Bugrit" → Links to verification page
**If not verified:** Shows "A Vibe Coder's Best Friend - Bugrit" → Links to Bugrit homepage

## Configuration Options

| Attribute | Values | Dimensions | Current |
|-----------|--------|------------|---------|
| data-size | small, medium, large | 120×40, 160×52, 200×64 | ${config.size} (${sizeDimensions[config.size]}) |
| data-theme | light, dark, auto | — | ${config.theme} |
| data-position | inline, fixed-bottom-right, fixed-bottom-left | — | ${config.position} |

## Optional: Explicit Placement

To control exactly where the badge appears:

\`\`\`html
<div id="bugrit-badge"></div>
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  async></script>
\`\`\`

The badge cannot be faked - it fetches the real score from Bugrit's API and verifies the domain.`;
}

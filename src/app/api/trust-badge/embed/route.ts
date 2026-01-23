import { NextRequest, NextResponse } from 'next/server';

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
    // TODO: Fetch site from database
    const site = await getRegisteredSite(siteId);

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found. Please register your site first.' },
        { status: 404 }
      );
    }

    const baseUrl = 'https://bugrit.dev';

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
    console.error('[TrustBadge] Embed API error:', error);
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
  // TODO: Implement Firestore lookup
  if (siteId.startsWith('site_')) {
    return {
      id: siteId,
      domain: 'example.com',
      latestScan: {
        vibeScore: 87,
        grade: 'B+',
        scannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    };
  }
  return null;
}

function generateAIPrompt(
  siteId: string,
  domain: string,
  config: { size: BadgeSize; theme: BadgeTheme; position: BadgePosition }
): string {
  return `# Add Bugrit Trust Badge to Website

Add this trust badge to show visitors that ${domain} has been scanned for security and quality.

## Quick Install

Add this script just before </body>:

\`\`\`html
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  data-position="${config.position}"
  async></script>
\`\`\`

## What it does

- Displays current Vibe Score (${config.size} size)
- Theme: ${config.theme === 'auto' ? 'matches user preference' : config.theme}
- Position: ${config.position === 'inline' ? 'where script is placed' : config.position.replace('fixed-', 'fixed ')}
- Links to verification page with scan details

## Options

| Attribute | Values | Default |
|-----------|--------|---------|
| data-size | small, medium, large | medium |
| data-theme | light, dark, auto | auto |
| data-position | inline, fixed-bottom-right, fixed-bottom-left | inline |

## Explicit Placement

To control exactly where the badge appears:

\`\`\`html
<div id="bugrit-badge"></div>
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  async></script>
\`\`\`

The badge will render inside the #bugrit-badge container.`;
}

import { Metadata } from 'next';
import { TrustBadgeConfigurator } from '@/components/trust-badge/configurator';
import { getDb } from '@/lib/firestore';
import { verifySession } from '@/lib/auth/session';
import { devConsole } from '@/lib/console';

export const metadata: Metadata = {
  title: 'Trust Badge - Bugrit',
  description: 'Add a trust badge to your website showing your Vibe Score',
};

/**
 * Trust Badge Configuration Page
 *
 * Users can:
 * - Configure badge size and theme
 * - Get embed code for their website
 * - Get AI prompt for their coding assistant
 * - See preview (not the actual badge)
 */

export default async function TrustBadgePage() {
  // TODO: Get user's registered sites from session
  const userSites = await getUserSites();

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Trust Badge
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Show your visitors that your website has been scanned for security and quality.
            The badge displays your current Vibe Score and links to your verification page.
          </p>
        </header>

        {/* Warning about preview */}
        <div className="mb-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <div>
              <p className="text-amber-200 font-medium">Preview Only</p>
              <p className="text-amber-200/70 text-sm">
                The badge shown below is a preview. The actual badge on your website will
                dynamically fetch your real score and cannot be copied or faked.
              </p>
            </div>
          </div>
        </div>

        {/* Configurator */}
        {userSites.length > 0 ? (
          <TrustBadgeConfigurator sites={userSites} />
        ) : (
          <NoSitesMessage />
        )}
      </div>
    </div>
  );
}

function NoSitesMessage() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🌐</div>
      <h2 className="text-xl font-semibold text-white mb-2">
        No websites registered yet
      </h2>
      <p className="text-slate-400 mb-6">
        Scan a website first to get your Trust Badge.
      </p>
      <a
        href="/scan"
        className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
      >
        Scan Your Website
      </a>
    </div>
  );
}

async function getUserSites() {
  const session = await verifySession();
  if (!session?.uid) return [];

  const db = getDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection('trustBadgeSites')
      .where('ownerId', '==', session.uid)
      .orderBy('lastScanAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        domain: data.domain || '',
        siteName: data.siteName || data.domain || '',
        vibeScore: data.latestScan?.vibeScore || 0,
        grade: data.latestScan?.grade || 'N/A',
        lastScanAt: data.lastScanAt?.toDate?.() || new Date(data.lastScanAt || Date.now()),
      };
    });
  } catch (error) {
    devConsole.error('Failed to fetch user sites:', error);
    return [];
  }
}

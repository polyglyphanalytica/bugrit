import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReviewMergePrompt } from '@/components/fixes/review-merge-prompt';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: scanId } = await params;
  return {
    title: `Review Fixes - ${scanId} - Bugrit`,
    description: 'AI agent prompt to review and merge automated fixes',
  };
}

export default async function ReviewPromptPage({ params }: PageProps) {
  const { id: scanId } = await params;

  // Fetch scan data
  const scanData = await getScanWithFixes(scanId);

  if (!scanData) {
    notFound();
  }

  const { scan, fixes } = scanData;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <nav className="text-sm text-slate-400 mb-4">
            <a href="/dashboard" className="hover:text-white">Dashboard</a>
            <span className="mx-2">/</span>
            <a href={`/scans/${scanId}`} className="hover:text-white">Scan {scanId.slice(0, 8)}</a>
            <span className="mx-2">/</span>
            <span className="text-white">Review Prompt</span>
          </nav>

          <h1 className="text-3xl font-bold text-white mb-2">
            Review & Merge Fixes
          </h1>
          <p className="text-slate-400">
            Use this prompt with your AI coding assistant to review the automated fixes
            and merge them into your codebase.
          </p>
        </header>

        {/* Instructions */}
        <section className="mb-8 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <h2 className="font-semibold text-purple-300 mb-2">How to Use</h2>
          <ol className="text-sm text-purple-200/80 space-y-2 list-decimal list-inside">
            <li>Copy the prompt below</li>
            <li>Paste it into your AI coding assistant (Claude, Cursor, Copilot, etc.)</li>
            <li>The AI will review each fix, run tests, and merge if everything passes</li>
            <li>Check back here after merging - your next scan will verify the fixes</li>
          </ol>
        </section>

        {/* Compatible AI Tools */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Compatible with:</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Claude Code',
              'Cursor',
              'GitHub Copilot',
              'Cody',
              'Windsurf',
              'Aider',
              'Continue',
            ].map((tool) => (
              <span
                key={tool}
                className="px-3 py-1 text-sm bg-slate-800 text-slate-300 rounded-full border border-slate-700"
              >
                {tool}
              </span>
            ))}
          </div>
        </section>

        {/* The prompt component */}
        <ReviewMergePrompt
          repoUrl={scan.repoUrl}
          baseBranch={scan.baseBranch}
          fixBranch={fixes.branchName}
          scanId={scanId}
          findings={fixes.findings}
          prUrl={fixes.prUrl}
        />

        {/* Next steps */}
        <section className="mt-8 p-4 rounded-lg bg-slate-800 border border-slate-700">
          <h2 className="font-semibold text-white mb-3">After Merging</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-3 rounded bg-slate-900">
              <h3 className="text-sm font-medium text-slate-300 mb-1">Verify Fixes</h3>
              <p className="text-xs text-slate-400">
                Run a new Bugrit scan to confirm all issues are resolved.
              </p>
              <a
                href={`/scan?repo=${encodeURIComponent(scan.repoUrl)}`}
                className="mt-2 inline-block text-sm text-purple-400 hover:text-purple-300"
              >
                Re-scan Repository →
              </a>
            </div>
            <div className="p-3 rounded bg-slate-900">
              <h3 className="text-sm font-medium text-slate-300 mb-1">View Scan Details</h3>
              <p className="text-xs text-slate-400">
                See the full scan report with all findings and recommendations.
              </p>
              <a
                href={`/scans/${scanId}`}
                className="mt-2 inline-block text-sm text-purple-400 hover:text-purple-300"
              >
                View Full Report →
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Mock function - replace with actual database call
async function getScanWithFixes(scanId: string) {
  // TODO: Replace with actual Firestore queries
  // const scan = await db.collection('scans').doc(scanId).get();
  // const fixes = await db.collection('fixes').where('scanId', '==', scanId).get();

  // For now, return mock data
  // In production, return null if scan not found
  return {
    scan: {
      id: scanId,
      repoUrl: 'https://github.com/example/repo',
      baseBranch: 'main',
      status: 'completed',
      createdAt: new Date(),
    },
    fixes: {
      branchName: `bugrit/fixes-${scanId.slice(0, 8)}`,
      prUrl: 'https://github.com/example/repo/pull/123',
      findings: [
        {
          id: 'finding-1',
          severity: 'critical',
          title: 'SQL Injection vulnerability',
          file: 'src/api/users.ts',
          line: 42,
        },
        {
          id: 'finding-2',
          severity: 'high',
          title: 'Cross-Site Scripting (XSS)',
          file: 'src/components/Comment.tsx',
          line: 18,
        },
        {
          id: 'finding-3',
          severity: 'medium',
          title: 'Missing input validation',
          file: 'src/api/posts.ts',
          line: 55,
        },
        {
          id: 'finding-4',
          severity: 'low',
          title: 'Console.log statement in production code',
          file: 'src/utils/debug.ts',
          line: 12,
        },
      ],
    },
  };
}

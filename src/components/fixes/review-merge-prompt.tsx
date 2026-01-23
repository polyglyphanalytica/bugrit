'use client';

import { useState } from 'react';
import { generateReviewMergePrompt, generateQuickReviewPrompt } from '@/ai/flows/generate-fix';

interface ReviewMergePromptProps {
  repoUrl: string;
  baseBranch: string;
  fixBranch: string;
  scanId: string;
  findings: Array<{
    id: string;
    severity: string;
    title: string;
    file?: string;
    line?: number;
  }>;
  prUrl?: string;
}

export function ReviewMergePrompt({
  repoUrl,
  baseBranch,
  fixBranch,
  scanId,
  findings,
  prUrl,
}: ReviewMergePromptProps) {
  const [format, setFormat] = useState<'full' | 'quick'>('full');
  const [copied, setCopied] = useState(false);

  const prompt = format === 'full'
    ? generateReviewMergePrompt({ repoUrl, baseBranch, fixBranch, scanId, findings, prUrl })
    : generateQuickReviewPrompt({
        repoUrl,
        baseBranch,
        fixBranch,
        findingCount: findings.length,
        criticalCount: findings.filter(f => f.severity === 'critical').length,
        highCount: findings.filter(f => f.severity === 'high').length,
      });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="text-xl">🤖</span>
              AI Agent Review Prompt
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Copy this prompt to your AI coding assistant to review and merge the fixes
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex rounded-lg bg-slate-900 p-1">
              <button
                onClick={() => setFormat('full')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  format === 'full'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Full
              </button>
              <button
                onClick={() => setFormat('quick')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  format === 'quick'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Quick
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/30">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-slate-400">Branch:</span>{' '}
            <code className="text-purple-400">{fixBranch}</code>
            <span className="text-slate-500 mx-2">→</span>
            <code className="text-green-400">{baseBranch}</code>
          </div>
          <div>
            <span className="text-slate-400">Fixes:</span>{' '}
            <span className="text-white">{findings.length} issues</span>
            {criticalCount > 0 && (
              <span className="ml-2 text-red-400">({criticalCount} critical)</span>
            )}
            {highCount > 0 && criticalCount === 0 && (
              <span className="ml-2 text-orange-400">({highCount} high)</span>
            )}
          </div>
        </div>
      </div>

      {/* Prompt content */}
      <div className="relative">
        <pre className="p-4 text-sm text-slate-300 overflow-x-auto max-h-96 overflow-y-auto font-mono">
          {prompt}
        </pre>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`absolute top-3 right-3 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Prompt'}
        </button>
      </div>

      {/* Footer with API info */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
        <details className="text-sm">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
            API Access
          </summary>
          <div className="mt-2 p-3 rounded bg-slate-900 font-mono text-xs">
            <p className="text-slate-500 mb-2"># Get prompt via API (for automation)</p>
            <p className="text-green-400">
              curl "https://bugrit.dev/api/fixes/review-prompt?scanId={scanId}&format={format}"
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

/**
 * Compact version for embedding in scan results
 */
export function ReviewMergePromptCompact({
  scanId,
  fixBranch,
  findingCount,
}: {
  scanId: string;
  fixBranch: string;
  findingCount: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyApiUrl = async () => {
    const url = `https://bugrit.dev/api/fixes/review-prompt?scanId=${scanId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
      <span className="text-2xl">🤖</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          Review & Merge: <code className="text-purple-400">{fixBranch}</code>
        </p>
        <p className="text-xs text-slate-400">
          {findingCount} fixes ready for AI agent review
        </p>
      </div>
      <div className="flex gap-2">
        <a
          href={`/scans/${scanId}/review-prompt`}
          className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
        >
          View
        </a>
        <button
          onClick={handleCopyApiUrl}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          {copied ? '✓' : 'Copy URL'}
        </button>
      </div>
    </div>
  );
}

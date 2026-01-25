'use client';

import { useState, useEffect } from 'react';
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
  const [prompt, setPrompt] = useState<string>('Loading...');

  useEffect(() => {
    async function loadPrompt() {
      const result = format === 'full'
        ? await generateReviewMergePrompt({ repoUrl, baseBranch, fixBranch, scanId, findings, prUrl })
        : await generateQuickReviewPrompt({
            repoUrl,
            baseBranch,
            fixBranch,
            findingCount: findings.length,
            criticalCount: findings.filter(f => f.severity === 'critical').length,
            highCount: findings.filter(f => f.severity === 'high').length,
          });
      setPrompt(result);
    }
    loadPrompt();
  }, [format, repoUrl, baseBranch, fixBranch, scanId, findings, prUrl]);

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
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  format === 'full'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Review
              </button>
              <button
                onClick={() => setFormat('quick')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  format === 'quick'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Quick Review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          {findings.length} findings
        </span>
        {criticalCount > 0 && (
          <span className="text-red-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {criticalCount} critical
          </span>
        )}
        {highCount > 0 && (
          <span className="text-orange-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            {highCount} high
          </span>
        )}
      </div>

      {/* Prompt content */}
      <div className="relative">
        <pre className="p-4 text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 max-h-96 overflow-y-auto">
          {prompt}
        </pre>

        {/* Copy button overlay */}
        <div className="absolute top-2 right-2">
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
            <span className="text-slate-500">Branch:</span>{' '}
            <code className="px-1.5 py-0.5 bg-slate-900 rounded text-purple-300">
              {fixBranch}
            </code>{' '}
            → {' '}
            <code className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-300">
              {baseBranch}
            </code>
          </div>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              View Pull Request →
            </a>
          )}
        </div>
      </div>

      {/* Usage instructions */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800">
        <details className="group">
          <summary className="cursor-pointer text-sm text-slate-400 hover:text-white flex items-center gap-2">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            How to use this prompt
          </summary>
          <ol className="mt-3 ml-6 text-sm text-slate-400 space-y-2 list-decimal">
            <li>Click &quot;Copy Prompt&quot; above</li>
            <li>Open your AI coding assistant (Claude, Cursor, Copilot, etc.)</li>
            <li>Paste the prompt and let the AI review the changes</li>
            <li>The AI will verify tests pass and merge if everything looks good</li>
          </ol>
        </details>
      </div>

      {/* Share section */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          Share this review prompt:
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${
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

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EmbedCodeProps {
  owner: string;
  repo: string;
  className?: string;
}

export function EmbedCode({ owner, repo, className }: EmbedCodeProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com';
  const badgeUrl = `${baseUrl}/api/badge/${owner}/${repo}`;
  const profileUrl = `${baseUrl}/health/${owner}/${repo}`;

  const snippets = {
    markdown: `[![Vibe Score](${badgeUrl})](${profileUrl})`,
    html: `<a href="${profileUrl}"><img src="${badgeUrl}" alt="Vibe Score" /></a>`,
    rst: `.. image:: ${badgeUrl}\n   :target: ${profileUrl}\n   :alt: Vibe Score`,
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Badge preview */}
      <div className="flex items-center justify-center p-4 bg-slate-700/30 rounded-lg">
        <img
          src={badgeUrl}
          alt="Vibe Score Badge Preview"
          className="h-5"
        />
      </div>

      {/* Code snippets */}
      <div className="space-y-3">
        <CodeSnippet
          label="Markdown"
          code={snippets.markdown}
          copied={copied === 'markdown'}
          onCopy={() => copyToClipboard('markdown', snippets.markdown)}
        />
        <CodeSnippet
          label="HTML"
          code={snippets.html}
          copied={copied === 'html'}
          onCopy={() => copyToClipboard('html', snippets.html)}
        />
        <CodeSnippet
          label="reStructuredText"
          code={snippets.rst}
          copied={copied === 'rst'}
          onCopy={() => copyToClipboard('rst', snippets.rst)}
        />
      </div>
    </div>
  );
}

function CodeSnippet({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-700">
        <span className="text-xs text-slate-400">{label}</span>
        <button
          onClick={onCopy}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
          )}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-sm text-slate-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

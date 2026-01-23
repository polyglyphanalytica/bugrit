'use client';

import { useState } from 'react';

interface VibePromptProps {
  title?: string;
  description?: string;
  prompt: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Vibe Coding Prompt Component
 *
 * Displays a prominent, copyable AI prompt at the top of documentation pages.
 * This component supports the "vibe coder first" documentation philosophy.
 */
export function VibePrompt({
  title = 'Vibe Coding Prompt',
  description = 'Copy this prompt to your AI coding assistant to get started instantly:',
  prompt,
  variant = 'primary',
}: VibePromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bgClass = variant === 'primary'
    ? 'bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-pink-500/10 border-purple-500/40'
    : 'bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border-blue-500/30';

  return (
    <div className={`p-6 rounded-xl border-2 ${bgClass} mb-8`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🤖</span> {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shrink-0 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Prompt'}
        </button>
      </div>

      <div className="relative">
        <pre className="p-4 bg-background/80 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono border">
          {prompt}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
        <span>✨</span>
        Works with Claude, ChatGPT, Cursor, Copilot, Cody, and other AI coding assistants
      </p>
    </div>
  );
}

/**
 * Multiple prompts for different use cases
 */
export function VibePromptTabs({
  prompts,
}: {
  prompts: Array<{
    label: string;
    prompt: string;
    description?: string;
  }>;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompts[activeTab].prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-xl border-2 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-pink-500/10 border-purple-500/40 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🤖</span> Vibe Coding Prompts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your path and copy the prompt to your AI assistant:
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shrink-0 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Prompt'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === i
                ? 'bg-purple-600 text-white'
                : 'bg-background/50 text-muted-foreground hover:bg-background/80'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {prompts[activeTab].description && (
        <p className="text-sm text-muted-foreground mb-3">
          {prompts[activeTab].description}
        </p>
      )}

      <div className="relative">
        <pre className="p-4 bg-background/80 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono border">
          {prompts[activeTab].prompt}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
        <span>✨</span>
        Works with Claude, ChatGPT, Cursor, Copilot, Cody, and other AI coding assistants
      </p>
    </div>
  );
}

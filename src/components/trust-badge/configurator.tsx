'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Site {
  id: string;
  domain: string;
  siteName: string;
  vibeScore: number;
  grade: string;
  lastScanAt: Date;
}

interface TrustBadgeConfiguratorProps {
  sites: Site[];
}

type BadgeSize = 'small' | 'medium' | 'large';
type BadgeTheme = 'light' | 'dark' | 'auto';
type BadgePosition = 'inline' | 'fixed-bottom-right' | 'fixed-bottom-left';

const SIZES: Record<BadgeSize, { width: number; height: number; label: string }> = {
  small: { width: 120, height: 40, label: 'Small (120×40)' },
  medium: { width: 160, height: 52, label: 'Medium (160×52)' },
  large: { width: 200, height: 64, label: 'Large (200×64)' },
};

export function TrustBadgeConfigurator({ sites }: TrustBadgeConfiguratorProps) {
  const [selectedSite, setSelectedSite] = useState(sites[0]);
  const [size, setSize] = useState<BadgeSize>('medium');
  const [theme, setTheme] = useState<BadgeTheme>('auto');
  const [position, setPosition] = useState<BadgePosition>('inline');
  const [copied, setCopied] = useState<'script' | 'prompt' | null>(null);
  const [activeTab, setActiveTab] = useState<'script' | 'prompt'>('script');

  const embedScript = generateEmbedScript(selectedSite.id, { size, theme, position });
  const aiPrompt = generateAIPrompt(selectedSite.id, selectedSite.domain, { size, theme, position });

  const copyToClipboard = (text: string, type: 'script' | 'prompt') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Site selector (if multiple sites) */}
      {sites.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Select Website
          </label>
          <select
            value={selectedSite.id}
            onChange={(e) => setSelectedSite(sites.find(s => s.id === e.target.value)!)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain} - Score: {site.vibeScore}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
        <div className="flex justify-center p-8 rounded-lg bg-slate-900/50">
          <BadgePreview
            score={selectedSite.vibeScore}
            grade={selectedSite.grade}
            size={size}
            theme={theme}
          />
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          This is a preview. The actual badge will show your real-time score.
        </p>
      </div>

      {/* Configuration Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Size */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Size
          </label>
          <div className="space-y-2">
            {(Object.keys(SIZES) as BadgeSize[]).map((s) => (
              <label
                key={s}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  size === s
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                )}
              >
                <input
                  type="radio"
                  name="size"
                  value={s}
                  checked={size === s}
                  onChange={() => setSize(s)}
                  className="sr-only"
                />
                <span className="text-white">{SIZES[s].label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Theme
          </label>
          <div className="space-y-2">
            {(['auto', 'light', 'dark'] as BadgeTheme[]).map((t) => (
              <label
                key={t}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  theme === t
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                  className="sr-only"
                />
                <span className="text-white capitalize">
                  {t === 'auto' ? 'Auto (match system)' : t}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Position
          </label>
          <div className="space-y-2">
            {[
              { value: 'inline', label: 'Inline (your placement)' },
              { value: 'fixed-bottom-right', label: 'Fixed bottom-right' },
              { value: 'fixed-bottom-left', label: 'Fixed bottom-left' },
            ].map((p) => (
              <label
                key={p.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  position === p.value
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                )}
              >
                <input
                  type="radio"
                  name="position"
                  value={p.value}
                  checked={position === p.value}
                  onChange={() => setPosition(p.value as BadgePosition)}
                  className="sr-only"
                />
                <span className="text-white">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Code Output */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('script')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'script'
                ? 'bg-slate-700/50 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            📋 Embed Script
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'prompt'
                ? 'bg-slate-700/50 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            🤖 AI Agent Prompt
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'script' ? (
            <>
              <p className="text-sm text-slate-400 mb-3">
                Paste this script just before the <code className="text-purple-400">&lt;/body&gt;</code> tag:
              </p>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-300 text-sm overflow-x-auto">
                  <code>{embedScript}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(embedScript, 'script')}
                  className={cn(
                    'absolute top-2 right-2 px-3 py-1 rounded text-sm transition-colors',
                    copied === 'script'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  )}
                >
                  {copied === 'script' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-3">
                Give this prompt to your AI coding assistant (Claude, ChatGPT, etc.):
              </p>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-300 text-sm overflow-x-auto whitespace-pre-wrap">
                  {aiPrompt}
                </pre>
                <button
                  onClick={() => copyToClipboard(aiPrompt, 'prompt')}
                  className={cn(
                    'absolute top-2 right-2 px-3 py-1 rounded text-sm transition-colors',
                    copied === 'prompt'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  )}
                >
                  {copied === 'prompt' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* API Info */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          🔌 API Access
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          AI agents can programmatically get the embed code via our API:
        </p>
        <pre className="p-4 rounded-lg bg-slate-900 text-slate-300 text-sm overflow-x-auto">
{`GET /api/trust-badge/embed?siteId=${selectedSite.id}&size=${size}&theme=${theme}

Response:
{
  "script": "<script>...</script>",
  "prompt": "Add the Bugrit Trust Badge...",
  "verificationUrl": "https://bugrit.dev/verified/${selectedSite.id}"
}`}
        </pre>
      </div>
    </div>
  );
}

// Badge Preview Component (visual only, not functional)
function BadgePreview({
  score,
  grade,
  size,
  theme,
}: {
  score: number;
  grade: string;
  size: BadgeSize;
  theme: BadgeTheme;
}) {
  const isDark = theme === 'dark' || theme === 'auto';
  const sizeConfig = SIZES[size];

  const gradeColor = grade.startsWith('A')
    ? '#4ade80'
    : grade.startsWith('B')
    ? '#a3e635'
    : grade.startsWith('C')
    ? '#facc15'
    : grade === 'D'
    ? '#fb923c'
    : '#f87171';

  const fontSize = size === 'small' ? 10 : size === 'medium' ? 11 : 13;
  const scoreFontSize = size === 'small' ? 14 : size === 'medium' ? 18 : 22;

  return (
    <div
      className="relative inline-flex items-center gap-2 rounded-lg cursor-pointer transition-all hover:-translate-y-0.5"
      style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
        padding: '8px 12px',
        background: isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Shield icon */}
      <svg
        width={sizeConfig.height * 0.5}
        height={sizeConfig.height * 0.5}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2L3 7V12C3 17.5 7.5 21.5 12 23C16.5 21.5 21 17.5 21 12V7L12 2Z"
          fill={gradeColor}
          stroke={gradeColor}
          strokeWidth="2"
        />
        <path
          d="M9 12L11 14L15 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Text */}
      <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
        <span
          style={{
            fontSize,
            color: isDark ? '#94a3b8' : '#64748b',
            fontWeight: 500,
          }}
        >
          Checked for Safety
        </span>
        <div className="flex items-center gap-1">
          <span
            style={{
              fontSize: scoreFontSize,
              fontWeight: 700,
              color: gradeColor,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: fontSize - 1,
              color: isDark ? '#64748b' : '#94a3b8',
            }}
          >
            by Bugrit
          </span>
        </div>
      </div>

      {/* "PREVIEW" overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
        <span className="text-white text-xs font-bold tracking-wider">
          PREVIEW
        </span>
      </div>
    </div>
  );
}

// Helper functions
function generateEmbedScript(
  siteId: string,
  config: { size: BadgeSize; theme: BadgeTheme; position: BadgePosition }
): string {
  return `<!-- Bugrit Trust Badge -->
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  data-position="${config.position}"
  async></script>
<!-- End Bugrit Trust Badge -->`;
}

function generateAIPrompt(
  siteId: string,
  domain: string,
  config: { size: BadgeSize; theme: BadgeTheme; position: BadgePosition }
): string {
  return `Add the Bugrit Trust Badge to my website (${domain}).

This badge shows visitors that the site has been scanned for security and quality issues.

Add this script just before the closing </body> tag:

<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="${config.size}"
  data-theme="${config.theme}"
  data-position="${config.position}"
  async></script>

The badge will automatically:
- Display our current Vibe Score (security/quality rating)
- Link to our verification page on Bugrit
- Match the site's theme (${config.theme})
- Appear ${config.position === 'inline' ? 'where the script is placed' : `as a fixed widget in the ${config.position.replace('fixed-', '')}`}

No additional configuration needed. The badge is dynamic and will always show our latest score.`;
}

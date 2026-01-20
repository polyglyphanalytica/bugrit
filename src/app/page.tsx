'use client';

import Link from 'next/link';
import { GradientButton } from '@/components/ui/gradient-button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { Logo } from '@/components/ui/logo';
import { TOOL_REGISTRY, CATEGORY_LABELS, ToolCategory } from '@/lib/tools/registry';

export default function HomePage() {
  // Group tools by category
  const toolsByCategory = TOOL_REGISTRY.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, typeof TOOL_REGISTRY>);

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="container-wide flex items-center justify-between h-16">
          <Logo href="/" />
          <div className="hidden md:flex items-center gap-8">
            <Link href="#risks" className="nav-link">The Risks</Link>
            <Link href="#scanning" className="nav-link">What We Check</Link>
            <Link href="#pricing" className="nav-link">Pricing</Link>
            <Link href="/docs" className="nav-link">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <GradientButton variant="ghost" size="sm">Sign in</GradientButton>
            </Link>
            <Link href="/register">
              <GradientButton size="sm" glow>Scan My Code</GradientButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950 border border-red-700 mb-8 animate-fade-down">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
              </span>
              <span className="text-sm font-medium text-red-200">Your code has problems you don&apos;t know about</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-fade-up">
              Vibe Coding Is Fun.
              <br />
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Until You Get Hacked.
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 animate-fade-up delay-200 fill-both leading-relaxed">
              You shipped fast. You built something amazing. But did you check for SQL injection? XSS vulnerabilities? Leaked API keys in your repo? Outdated dependencies with known exploits?
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up delay-300 fill-both">
              <strong className="text-foreground">Bugrit is a vibe coder&apos;s best friend.</strong> We run {TOOL_REGISTRY.length} security and quality scans plus test your app across web, mobile, and desktop. One click. One report. No judgment.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-400 fill-both">
              <Link href="/register">
                <GradientButton size="xl" glow className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500">
                  Find Out What&apos;s Wrong
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </GradientButton>
              </Link>
              <Link href="#risks">
                <GradientButton variant="outline" size="xl" className="w-full sm:w-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  See The Risks
                </GradientButton>
              </Link>
            </div>

            {/* Scary Stats - Vibe Coder Focused */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fade-up delay-500 fill-both">
              <div className="p-4 rounded-xl bg-red-950 border-2 border-red-700 backdrop-blur-sm">
                <span className="text-3xl font-bold text-red-300">62%</span>
                <p className="text-sm text-gray-200 mt-1">of AI-generated code contains known vulnerabilities</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-950 border-2 border-orange-700 backdrop-blur-sm">
                <span className="text-3xl font-bold text-orange-300">60%</span>
                <p className="text-sm text-gray-200 mt-1">of small businesses close within 6 months of a breach</p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-950 border-2 border-yellow-700 backdrop-blur-sm">
                <span className="text-3xl font-bold text-yellow-300">85%</span>
                <p className="text-sm text-gray-200 mt-1">of ransomware attacks target small businesses</p>
              </div>
              <div className="p-4 rounded-xl bg-violet-950 border-2 border-violet-700 backdrop-blur-sm">
                <span className="text-3xl font-bold text-violet-200">1,000+</span>
                <p className="text-sm text-gray-200 mt-1">individual checks across {TOOL_REGISTRY.length} tools</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section id="risks" className="section bg-gradient-to-b from-red-950/20 to-transparent">
        <div className="container-wide">
          <SectionHeading
            badge="The Uncomfortable Truth"
            title="What Could Go Wrong?"
            titleGradient="Go Wrong"
            description="You're a great builder. But even the best vibe coders ship code with hidden landmines."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {/* Security Risks */}
            <GlassCard className="p-6 !border-2 !border-red-500/50">
              <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-red-400">Security Vulnerabilities</h3>
              <p className="text-muted-foreground mb-4">The stuff that gets you on the news.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>SQL Injection</strong> - Attackers can read your entire database</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>XSS (Cross-Site Scripting)</strong> - Hackers steal user sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>Hardcoded Secrets</strong> - Your API keys pushed to GitHub</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>Unsafe Regex</strong> - ReDoS attacks crash your server</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>Command Injection</strong> - RCE on your production server</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">&#x2022;</span>
                  <span><strong>Insecure Dependencies</strong> - Known CVEs in your node_modules</span>
                </li>
              </ul>
            </GlassCard>

            {/* Dependency Disasters */}
            <GlassCard className="p-6 !border-2 !border-orange-500/50">
              <div className="w-12 h-12 rounded-xl bg-orange-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-orange-400">Dependency Disasters</h3>
              <p className="text-muted-foreground mb-4">Your node_modules is a minefield.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Vulnerable Packages</strong> - 67% of npm packages have issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Outdated Dependencies</strong> - Missing critical security patches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>License Violations</strong> - GPL code in your proprietary app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Unused Packages</strong> - Attack surface you don&apos;t need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Circular Dependencies</strong> - Unpredictable build failures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Lockfile Tampering</strong> - Supply chain attacks</span>
                </li>
              </ul>
            </GlassCard>

            {/* Code Quality Catastrophes */}
            <GlassCard className="p-6 !border-2 !border-yellow-500/50">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-yellow-400">Code Quality Issues</h3>
              <p className="text-muted-foreground mb-4">Technical debt that compounds daily.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Type Errors</strong> - Runtime crashes waiting to happen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Copy-Paste Code</strong> - Bugs that multiply across files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Dead Code</strong> - Confusion and bloated bundles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Inconsistent Formatting</strong> - Merge conflict nightmares</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Spelling Errors</strong> - Unprofessional user-facing text</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">&#x2022;</span>
                  <span><strong>Unused Exports</strong> - API surface you forgot about</span>
                </li>
              </ul>
            </GlassCard>

            {/* Performance Problems */}
            <GlassCard className="p-6 !border-2 !border-blue-500/50">
              <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">Performance Problems</h3>
              <p className="text-muted-foreground mb-4">Slow apps lose users and revenue.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Bloated Bundles</strong> - 5MB JavaScript files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Render Blocking</strong> - Slow First Contentful Paint</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Memory Leaks</strong> - Crashes after prolonged use</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Unoptimized Images</strong> - 10MB hero images</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>No Lazy Loading</strong> - Loading everything upfront</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Poor Core Web Vitals</strong> - SEO penalties from Google</span>
                </li>
              </ul>
            </GlassCard>

            {/* Accessibility Failures */}
            <GlassCard className="p-6 !border-2 !border-purple-500/50">
              <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">Accessibility Failures</h3>
              <p className="text-muted-foreground mb-4">Excluding users = lawsuits + lost revenue.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>Missing Alt Text</strong> - Screen readers can&apos;t describe images</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>Poor Color Contrast</strong> - Unreadable for vision impaired</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>No Keyboard Nav</strong> - Unusable without a mouse</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>Missing ARIA Labels</strong> - Confusing for assistive tech</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>Auto-Playing Media</strong> - Jarring and disorienting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">&#x2022;</span>
                  <span><strong>Form Label Issues</strong> - ADA lawsuits waiting to happen</span>
                </li>
              </ul>
            </GlassCard>

            {/* Testing Gaps */}
            <GlassCard className="p-6 !border-2 !border-green-500/50">
              <div className="w-12 h-12 rounded-xl bg-green-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-green-400">Testing Gaps</h3>
              <p className="text-muted-foreground mb-4">No tests = bugs in production.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Browser Differences</strong> - Works in Chrome, breaks in Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Mobile Failures</strong> - Touch targets too small</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Desktop Regressions</strong> - New features break old ones</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Edge Cases</strong> - Empty states, errors, timeouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Auth Flows</strong> - Login/logout breaks randomly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">&#x2022;</span>
                  <span><strong>Payment Bugs</strong> - Checkout failures = lost sales</span>
                </li>
              </ul>
            </GlassCard>
          </div>

          {/* Scary call-out */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-red-950 via-orange-950 to-yellow-950 border-2 border-red-500/50 text-center">
            <p className="text-2xl font-bold mb-4 text-white">
              <span className="text-red-300">45% of AI-generated code</span> introduces security vulnerabilities. <span className="text-orange-300">Only 14%</span> of small businesses are prepared.
            </p>
            <p className="text-gray-300 text-lg">
              You&apos;re building fast. That&apos;s great. But one breach could end everything. Bugrit has your back.
            </p>
          </div>
        </div>
      </section>

      {/* What We Check Section */}
      <section id="scanning" className="section">
        <div className="container-wide">
          <SectionHeading
            badge={`${TOOL_REGISTRY.length} Tools Working For You`}
            title="Everything We Check"
            titleGradient="We Check"
            description="One scan. All of these tools. Every single time. No config required."
          />

          {/* Supported Languages */}
          <div className="mt-12 mb-16">
            <h3 className="text-xl font-bold text-center mb-6">Languages & Frameworks We Analyze</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">JavaScript</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">TypeScript</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">React</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Next.js</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Vue</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Nuxt</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Svelte</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Angular</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">CSS/SCSS/Less</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">HTML</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">JSON</span>
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">Markdown</span>
            </div>
          </div>

          {/* All Tools Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <GlassCard key={category} className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">
                    {category === 'linting' && '📝'}
                    {category === 'security' && '🔒'}
                    {category === 'dependencies' && '📦'}
                    {category === 'accessibility' && '♿'}
                    {category === 'quality' && '✨'}
                    {category === 'documentation' && '📚'}
                    {category === 'git' && '🔀'}
                    {category === 'performance' && '⚡'}
                    {category === 'container' && '🐳'}
                    {category === 'sbom' && '📋'}
                  </span>
                  {CATEGORY_LABELS[category as ToolCategory]}
                </h3>
                <ul className="space-y-2">
                  {tools.map((tool) => (
                    <li key={tool.id} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      {tool.name}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>

          {/* Detailed Tool Descriptions */}
          <div className="mt-16 space-y-8">
            <h3 className="text-2xl font-bold text-center mb-8">What Each Category Catches</h3>

            <div className="grid md:grid-cols-2 gap-8">
              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-red-400">🔒</span> Security Scanning
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>ESLint Security Plugin</strong> - Finds eval(), dangerous regex, prototype pollution risks</p>
                  <p><strong>npm audit</strong> - Checks every package for known CVEs and exploits</p>
                  <p><strong>Secretlint</strong> - Catches hardcoded API keys, passwords, tokens, AWS credentials</p>
                  <p><strong>Lockfile Lint</strong> - Detects HTTP URLs and registry hijacking in lockfiles</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-orange-400">📦</span> Dependency Analysis
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>Depcheck</strong> - Finds unused dependencies bloating your bundle</p>
                  <p><strong>Knip</strong> - Detects unused exports, files, and dead code</p>
                  <p><strong>License Checker</strong> - Flags GPL, AGPL, and problematic licenses</p>
                  <p><strong>Madge</strong> - Maps circular dependencies causing build issues</p>
                  <p><strong>Dependency Cruiser</strong> - Enforces architecture rules and boundaries</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">📝</span> Code Quality
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>ESLint</strong> - 300+ rules for JS/TS best practices</p>
                  <p><strong>Biome</strong> - Fast formatter and linter in one</p>
                  <p><strong>TypeScript</strong> - Catches type errors before runtime</p>
                  <p><strong>Stylelint</strong> - CSS best practices and consistency</p>
                  <p><strong>Prettier</strong> - Formatting consistency across your team</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-purple-400">♿</span> Accessibility & Performance
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>axe-core</strong> - WCAG 2.1 compliance checking</p>
                  <p><strong>Pa11y</strong> - HTML accessibility auditing</p>
                  <p><strong>Lighthouse</strong> - Performance, SEO, and best practices scores</p>
                  <p><strong>Size Limit</strong> - Bundle size monitoring and limits</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">✨</span> Code Quality Deep Dive
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>jscpd</strong> - Finds copy-pasted code that should be refactored</p>
                  <p><strong>cspell</strong> - Spelling errors in code and content</p>
                  <p><strong>Markdownlint</strong> - Documentation formatting consistency</p>
                  <p><strong>alex</strong> - Insensitive or inconsiderate writing</p>
                  <p><strong>publint</strong> - npm package publishing issues</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-green-400">🔀</span> Git & Documentation
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>Commitlint</strong> - Enforces conventional commit messages</p>
                  <p><strong>remark-lint</strong> - Markdown best practices</p>
                  <p>Ensures your repo is professional and maintainable</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-cyan-400">🐳</span> Container Security
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>Hadolint</strong> - Dockerfile best practices and security rules</p>
                  <p><strong>Dockle</strong> - Container image security scanning</p>
                  <p><strong>Gitleaks</strong> - Detect hardcoded secrets in your codebase</p>
                  <p>Ensures your Docker deployments are secure by default</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-emerald-400">📋</span> SBOM & Supply Chain
                </h4>
                <div className="space-y-3 text-sm">
                  <p><strong>Syft</strong> - Generates Software Bill of Materials</p>
                  <p>Catalogs all packages in your application for compliance</p>
                  <p>Essential for supply chain security and auditing</p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Testing Section */}
      <section id="testing" className="section bg-muted/30">
        <div className="container-wide">
          <SectionHeading
            badge="Cross-Platform Testing"
            title="Test Before Users Find Bugs"
            titleGradient="Users Find Bugs"
            description="Your app should work everywhere. We test web, mobile, and desktop so you don't ship broken features."
          />

          <div className="grid lg:grid-cols-3 gap-8 mt-16">
            {/* Web Apps */}
            <GlassCard hover className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-green-600/30 flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Web Apps</h3>
                  <p className="text-sm text-muted-foreground">Every browser, every device</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                &quot;Works on my machine&quot; isn&apos;t good enough. We test Chrome, Firefox, Safari, and Edge so your users never see bugs you missed.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#x2714;</span>
                  <span>Chrome, Firefox, Safari, Edge</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#x2714;</span>
                  <span>Phone, tablet, desktop views</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#x2714;</span>
                  <span>Screenshots when things break</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#x2714;</span>
                  <span>Video replay of failures</span>
                </div>
              </div>
            </GlassCard>

            {/* Mobile Apps */}
            <GlassCard hover className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Mobile Apps</h3>
                  <p className="text-sm text-muted-foreground">iPhone and Android</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Half your users are on phones. We test on real iPhones and Android devices - not simulators - so you ship apps that actually work.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#x2714;</span>
                  <span>Real iPhone testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#x2714;</span>
                  <span>Real Android testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#x2714;</span>
                  <span>Touch, swipe, pinch gestures</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#x2714;</span>
                  <span>React Native, Flutter, Capacitor</span>
                </div>
              </div>
            </GlassCard>

            {/* Desktop Apps */}
            <GlassCard hover className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center">
                  <span className="text-2xl">💻</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Desktop Apps</h3>
                  <p className="text-sm text-muted-foreground">Mac, Windows, Linux</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Building a desktop app? We test on all three operating systems so you don&apos;t get 1-star reviews from Windows users.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">&#x2714;</span>
                  <span>macOS testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">&#x2714;</span>
                  <span>Windows testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">&#x2714;</span>
                  <span>Linux testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">&#x2714;</span>
                  <span>File system, clipboard, menus</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container-wide">
          <SectionHeading
            badge="Dead Simple"
            title="Three Steps to Peace of Mind"
            titleGradient="Peace of Mind"
            description="Stop worrying about what you might have missed. We check everything."
          />

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              {
                step: '01',
                title: 'Connect Your Code',
                description: 'GitHub, GitLab, ZIP upload, or use our API to auto-scan on every deploy.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'We Run Everything',
                description: `${TOOL_REGISTRY.length} tools scan your code in parallel. Tests run across all platforms. Under 2 minutes.`,
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Fix What Matters',
                description: 'Prioritized report shows critical issues first. AI explains each problem and how to fix it.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div
                key={step.step}
                className="relative animate-fade-up fill-both"
                style={{ animationDelay: `${i * 100 + 100}ms` }}
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 text-primary">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vibe Code It Into Your App */}
      <section className="section bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container-wide">
          <SectionHeading
            badge="For Developers"
            title="Vibe Code It Into Your App"
            titleGradient="Into Your App"
            description="Use our API to trigger scans and display reports directly in your app. No context switching."
          />

          <div className="grid lg:grid-cols-2 gap-12 mt-16 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🔌</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">Auto-scan on Deploy</h3>
                  <p className="text-muted-foreground text-sm">
                    Add one API call to your CI/CD pipeline. Every deploy gets scanned automatically. Block deploys with critical issues.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">Embed Reports in Your Dashboard</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetch scan results via API and display them in your admin panel. Show your team the security status without leaving your app.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">Vibe Coding Prompts</h3>
                  <p className="text-muted-foreground text-sm">
                    We provide copy-paste prompts you can give to your AI assistant. Tell it to &quot;integrate Bugrit&quot; and paste our prompt. Done.
                  </p>
                </div>
              </div>

              <Link href="/docs/vibe-coding">
                <GradientButton variant="outline" className="mt-4">
                  View Vibe Coding Prompts
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </GradientButton>
              </Link>
            </div>

            <div className="bg-slate-950 rounded-2xl p-6 text-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-500 text-xs ml-2">vibe-coding-prompt.txt</span>
              </div>
              <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
{`Add Bugrit security scanning to my app:

1. After deploy, POST to bugrit.dev/api/v1/scans
   with my repo URL

2. Poll until scan completes (~60 seconds)

3. If critical issues found, send Slack alert

4. Add a "Security" widget to my dashboard
   showing scan status and issue counts

Use BUGGERED_API_KEY from environment.`}
              </pre>
              <p className="text-slate-500 text-xs mt-4">
                ↑ Copy this into Claude, Cursor, or Copilot
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Credits Work */}
      <section className="section">
        <div className="container-wide">
          <SectionHeading
            badge="Transparent Pricing"
            title="Pay For What You Use"
            titleGradient="What You Use"
            description="Credits scale with your codebase size and the features you choose. See exactly what you'll spend before every scan."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <GlassCard className="p-6 text-center">
              <div className="text-3xl mb-2">1</div>
              <div className="text-sm text-muted-foreground">credit per scan (base)</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl mb-2">+1</div>
              <div className="text-sm text-muted-foreground">credit per 10K lines of code</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl mb-2">+1-3</div>
              <div className="text-sm text-muted-foreground">credits for premium tools</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl mb-2">+1-3</div>
              <div className="text-sm text-muted-foreground">credits for AI features</div>
            </GlassCard>
          </div>

          <div className="mt-8 p-6 rounded-xl bg-muted/30 border border-border max-w-3xl mx-auto">
            <h4 className="font-semibold mb-4 text-center">Example: 50K line repo with security scan + AI explanations</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between"><span>Base scan</span><span>1 credit</span></div>
              <div className="flex justify-between"><span>50K lines (5 x 10K)</span><span>5 credits</span></div>
              <div className="flex justify-between"><span>Security tools</span><span>1 credit</span></div>
              <div className="flex justify-between"><span>AI explanations</span><span>2 credits</span></div>
              <div className="col-span-2 flex justify-between font-bold border-t border-border pt-2 mt-2">
                <span>Total</span><span>9 credits</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section bg-muted/30">
        <div className="container-wide">
          <SectionHeading
            badge="Cheaper Than a Breach"
            title="Choose Your Plan"
            titleGradient="Your Plan"
            description="SMB breaches cost $120K-$1.24M. 60% never recover. Know your risks before you ship."
          />

          <div className="grid md:grid-cols-4 gap-6 mt-16 max-w-6xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                description: 'Try it out',
                credits: '10 credits',
                features: ['1 project', 'Up to 10K lines', 'Static analysis only', '7-day history'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Starter',
                price: '$15',
                description: 'For side projects',
                credits: '50 credits/mo',
                features: ['3 projects', 'Up to 50K lines', 'All static tools', 'AI scan summaries', '14-day history', '$0.35/credit overage'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Pro',
                price: '$39',
                description: 'For serious builders',
                credits: '200 credits/mo',
                features: ['10 projects', 'Up to 150K lines', 'All tools + browser', 'AI explanations', 'GitHub integration', '30-day history', 'Rollover up to 100', '$0.25/credit overage'],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Business',
                price: '$79',
                description: 'For teams',
                credits: '600 credits/mo',
                features: ['Unlimited projects', 'Up to 500K lines', 'All tools + AI fixes', '10 team members', 'Slack + webhooks', 'API access', '90-day history', 'Rollover up to 300', '$0.15/credit overage'],
                cta: 'Start Free Trial',
                popular: false,
              },
            ].map((plan, i) => (
              <GlassCard
                key={plan.name}
                hover
                className={`p-6 animate-fade-up fill-both ${plan.popular ? 'ring-2 ring-primary shadow-glow-primary' : ''}`}
                style={{ animationDelay: `${i * 100 + 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-semibold bg-primary text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== '$0' && <span className="text-muted-foreground">/mo</span>}
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                  <div className="mt-3 px-3 py-1.5 bg-primary/10 rounded-full inline-block">
                    <span className="text-sm font-medium text-primary">{plan.credits}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <GradientButton
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                    size="sm"
                    glow={plan.popular}
                  >
                    {plan.cta}
                  </GradientButton>
                </Link>
              </GlassCard>
            ))}
          </div>

          <p className="text-center text-muted-foreground mt-8">
            Need more? <Link href="/contact" className="text-primary hover:underline">Contact us</Link> for Enterprise pricing with unlimited scans, SSO, and SLA.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container-tight">
          <GlassCard gradient className="p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Don&apos;t Ship Your Next Bug.
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              You&apos;ve worked too hard to let a preventable bug tank your launch. Run a scan before your next deploy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <GradientButton size="xl" glow>
                  Scan My Code Now
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </GradientButton>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free tier available. No credit card required.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Logo href="/" />
            <p className="text-muted-foreground text-sm">
              A vibe coder&apos;s best friend. {TOOL_REGISTRY.length} tools. 3 test frameworks. Zero judgment.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

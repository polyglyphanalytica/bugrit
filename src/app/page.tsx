'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { Logo } from '@/components/ui/logo';
import { TOOL_REGISTRY, ToolCategory } from '@/lib/tools/registry';

// Category value propositions - what each category DOES for users
const CATEGORY_VALUE: Record<ToolCategory, {
  icon: string;
  title: string;
  tagline: string;
  value: string;
  risks: string[];
  color: string;
  borderColor: string;
  bgColor: string;
}> = {
  security: {
    icon: '🛡️',
    title: 'Security Scanning',
    tagline: 'Stop hackers before they start',
    value: 'We find SQL injection, XSS, hardcoded secrets, and command injection vulnerabilities before attackers do. Our security tools have protected millions of apps worldwide.',
    risks: ['Database breaches', 'User session hijacking', 'API key leaks', 'Server takeovers'],
    color: 'text-red-400',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/20',
  },
  dependencies: {
    icon: '📦',
    title: 'Supply Chain Protection',
    tagline: 'Your dependencies are a liability',
    value: 'We scan every package in your node_modules for known vulnerabilities, license violations, and malicious code. 67% of npm packages have security issues—we find them.',
    risks: ['Known CVE exploits', 'GPL license violations', 'Abandoned packages', 'Supply chain attacks'],
    color: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-500/20',
  },
  quality: {
    icon: '✨',
    title: 'Code Quality',
    tagline: 'Technical debt compounds daily',
    value: 'We catch type errors, dead code, copy-paste duplication, and inconsistencies before they become unmaintainable nightmares. Clean code ships faster.',
    risks: ['Runtime crashes', 'Impossible debugging', 'Merge conflicts', 'Performance degradation'],
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/20',
  },
  linting: {
    icon: '📝',
    title: 'Code Standards',
    tagline: 'Consistency across your codebase',
    value: 'Enforce best practices automatically. Catch errors before they reach production. Keep your code readable and maintainable for you and your future self.',
    risks: ['Inconsistent formatting', 'Hidden bugs', 'Code review delays', 'Onboarding friction'],
    color: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/20',
  },
  accessibility: {
    icon: '♿',
    title: 'Accessibility Compliance',
    tagline: 'Reach every user—avoid lawsuits',
    value: 'We audit against WCAG 2.1 standards to ensure your app works for everyone. Accessibility failures exclude users and invite legal action.',
    risks: ['ADA lawsuits', 'Lost customers', 'Bad PR', 'App store rejections'],
    color: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/20',
  },
  performance: {
    icon: '⚡',
    title: 'Performance Auditing',
    tagline: 'Slow apps lose users',
    value: 'We measure load times, bundle sizes, and Core Web Vitals. A 1-second delay costs 7% in conversions. We help you ship fast apps that rank higher on Google.',
    risks: ['SEO penalties', 'User abandonment', 'Poor conversions', 'Bad reviews'],
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/20',
  },
  documentation: {
    icon: '📚',
    title: 'Documentation Quality',
    tagline: 'Good docs = happy users',
    value: 'We check your markdown, catch spelling errors, flag insensitive language, and ensure your documentation is professional and inclusive.',
    risks: ['Confused users', 'Support overload', 'Unprofessional image', 'Contributor friction'],
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/20',
  },
  git: {
    icon: '🔀',
    title: 'Git Hygiene',
    tagline: 'Clean history, clear intent',
    value: 'Enforce conventional commits, catch secrets before they hit your repo, and maintain a professional git history that makes debugging easier.',
    risks: ['Leaked credentials', 'Messy history', 'Failed CI/CD', 'Audit failures'],
    color: 'text-pink-400',
    borderColor: 'border-pink-500/50',
    bgColor: 'bg-pink-500/20',
  },
  mobile: {
    icon: '📱',
    title: 'Mobile Security',
    tagline: 'Protect your mobile apps',
    value: 'We analyze iOS and Android apps for hardcoded secrets, insecure storage, and vulnerabilities that could get you banned from app stores.',
    risks: ['App store rejection', 'Data theft', 'Reverse engineering', 'User privacy violations'],
    color: 'text-violet-400',
    borderColor: 'border-violet-500/50',
    bgColor: 'bg-violet-500/20',
  },
  'api-security': {
    icon: '🔌',
    title: 'API Security',
    tagline: 'Your API is your attack surface',
    value: 'We validate your OpenAPI specs, test for injection vulnerabilities, and ensure your APIs follow security best practices.',
    risks: ['Data breaches', 'Broken authentication', 'Rate limit bypass', 'Injection attacks'],
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/20',
  },
  'cloud-native': {
    icon: '☁️',
    title: 'Infrastructure Security',
    tagline: 'Misconfigured cloud = open door',
    value: 'We scan Kubernetes configs, Terraform files, and Dockerfiles for security misconfigurations that could expose your entire infrastructure.',
    risks: ['Open S3 buckets', 'Exposed secrets', 'Privilege escalation', 'Container escapes'],
    color: 'text-sky-400',
    borderColor: 'border-sky-500/50',
    bgColor: 'bg-sky-500/20',
  },
};

// Count tools per category
function getToolCount(category: ToolCategory): number {
  return TOOL_REGISTRY.filter(t => t.category === category).length;
}

// Get tool names for a category
function getToolNames(category: ToolCategory): string[] {
  return TOOL_REGISTRY.filter(t => t.category === category).map(t => t.name);
}

export default function HomePage() {
  const [expandedCategory, setExpandedCategory] = useState<ToolCategory | null>(null);

  const categories = Object.keys(CATEGORY_VALUE) as ToolCategory[];
  // Prioritize the most important categories
  const priorityOrder: ToolCategory[] = ['security', 'dependencies', 'quality', 'accessibility', 'performance', 'linting', 'mobile', 'api-security', 'cloud-native', 'documentation', 'git'];
  const sortedCategories = priorityOrder.filter(c => categories.includes(c));

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="container-wide flex items-center justify-between h-16">
          <Logo href="/" />
          <div className="hidden md:flex items-center gap-8">
            <Link href="#risks" className="nav-link">The Risks</Link>
            <Link href="#protection" className="nav-link">How We Help</Link>
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

            {/* Description - Updated messaging */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 animate-fade-up delay-200 fill-both leading-relaxed">
              You shipped fast. You built something amazing. But did you check for SQL injection? XSS vulnerabilities? Leaked API keys? Outdated dependencies with known exploits?
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up delay-300 fill-both">
              <strong className="text-foreground">Bugrit is built by security experts from around the world.</strong> We&apos;ve assembled the industry&apos;s best open-source scanning tools into one simple platform. One click. One report. Your app becomes safer.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-400 fill-both">
              <Link href="/register">
                <GradientButton size="xl" glow className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500">
                  Audit your app now
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

            {/* Scary Stats */}
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
                <span className="text-3xl font-bold text-violet-200">{TOOL_REGISTRY.length}</span>
                <p className="text-sm text-gray-200 mt-1">expert-built tools protecting your code</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expert Credibility Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-muted/20">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-muted-foreground mb-8">
              Bugrit combines the world&apos;s most trusted security and quality tools—the same tools used by Fortune 500 companies, open-source maintainers, and security researchers. We didn&apos;t reinvent the wheel. We made it easy for you to use.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="px-4 py-2 rounded-full border border-border">Used by 10M+ developers</span>
              <span className="px-4 py-2 rounded-full border border-border">Open-source foundations</span>
              <span className="px-4 py-2 rounded-full border border-border">Backed by security experts</span>
              <span className="px-4 py-2 rounded-full border border-border">Continuously updated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Too Small To Hack? Section */}
      <section className="section bg-gradient-to-b from-transparent via-orange-950/20 to-transparent">
        <div className="container-wide">
          <SectionHeading
            badge="The Dangerous Myth"
            title="Think You're Too Small To Hack?"
            titleGradient="Too Small To Hack"
            description="Hackers don't care about your user count. They care about your servers."
          />

          <div className="grid md:grid-cols-2 gap-8 mt-16">
            {/* Left side - The Reality */}
            <div className="space-y-6">
              <GlassCard className="p-6 !border-2 !border-orange-500/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-orange-400">They Want Your Compute</h3>
                    <p className="text-muted-foreground">
                      Attackers don&apos;t need your data. They need your servers to launch DDoS attacks, send spam campaigns, mine cryptocurrency, and host malicious content. Your &ldquo;small&rdquo; project is just another node in their botnet.
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 !border-2 !border-red-500/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-red-400">Auto-Scale = Auto-Bankruptcy</h3>
                    <p className="text-muted-foreground">
                      Modern cloud deployments auto-scale to meet demand. Great for traffic spikes. Catastrophic when hackers use your infrastructure. They scale up as big as they want—on your credit card. You get the bill.
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 !border-2 !border-violet-500/50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-violet-400">A Blank Check For Criminals</h3>
                    <p className="text-muted-foreground">
                      Once inside your estate, attackers have full control. They can pivot to other systems, exfiltrate data, install backdoors, and use your infrastructure for anything they want. You&apos;re left holding the bag—financially and legally.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right side - The Consequences */}
            <div className="space-y-6">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-red-950 to-orange-950 border-2 border-red-500/50">
                <h3 className="text-2xl font-bold mb-6 text-white">When They Get In, You Lose:</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <strong className="text-red-300">Your Money</strong>
                      <p className="text-gray-300 text-sm">Cloud bills in the thousands. Legal fees. Breach response costs. Regulatory fines up to 4% of revenue under GDPR.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <div>
                      <strong className="text-orange-300">User Trust</strong>
                      <p className="text-gray-300 text-sm">Your users trusted you with their data. That trust is gone. Their emails, passwords, personal info—leaked. They won&apos;t come back.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <div>
                      <strong className="text-yellow-300">Your Reputation</strong>
                      <p className="text-gray-300 text-sm">&ldquo;Company X leaked my data&rdquo; lives forever on the internet. Your brand becomes synonymous with insecurity.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </span>
                    <div>
                      <strong className="text-violet-300">Your Dream</strong>
                      <p className="text-gray-300 text-sm">You built something amazing. A single breach can end it. 60% of small businesses close within 6 months of a cyberattack.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-xl bg-primary/10 border border-primary/30 text-center">
                <p className="text-lg font-semibold mb-2">Bots scan the entire internet constantly.</p>
                <p className="text-muted-foreground">They don&apos;t know you&apos;re small. They don&apos;t care. They just need one vulnerability to get in. <strong className="text-foreground">Don&apos;t be the easy target.</strong></p>
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
                  <span><strong>Command Injection</strong> - RCE on your production server</span>
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
                  <span><strong>License Violations</strong> - GPL code in your proprietary app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Supply Chain Attacks</strong> - Malicious code in updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">&#x2022;</span>
                  <span><strong>Outdated Dependencies</strong> - Missing critical patches</span>
                </li>
              </ul>
            </GlassCard>

            {/* Code Quality Issues */}
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
                  <span><strong>Poor Core Web Vitals</strong> - SEO penalties from Google</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Memory Leaks</strong> - Crashes after prolonged use</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">&#x2022;</span>
                  <span><strong>Render Blocking</strong> - Slow First Contentful Paint</span>
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
                  <span><strong>Form Label Issues</strong> - ADA lawsuits waiting to happen</span>
                </li>
              </ul>
            </GlassCard>

            {/* Infrastructure Misconfig */}
            <GlassCard className="p-6 !border-2 !border-sky-500/50">
              <div className="w-12 h-12 rounded-xl bg-sky-500/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-sky-400">Infrastructure Misconfigs</h3>
              <p className="text-muted-foreground mb-4">One wrong setting exposes everything.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">&#x2022;</span>
                  <span><strong>Open S3 Buckets</strong> - Your data on the internet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">&#x2022;</span>
                  <span><strong>Exposed Secrets</strong> - Credentials in Docker/K8s configs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">&#x2022;</span>
                  <span><strong>Privilege Escalation</strong> - Containers running as root</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">&#x2022;</span>
                  <span><strong>Insecure Defaults</strong> - Terraform misconfigurations</span>
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
              You&apos;re building fast. That&apos;s great. But one breach could end everything. <strong className="text-white">Let the experts have your back.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* How We Protect You - VALUE FOCUSED */}
      <section id="protection" className="section">
        <div className="container-wide">
          <SectionHeading
            badge="Industry-Leading Protection"
            title="How We Keep You Safe"
            titleGradient="Keep You Safe"
            description="We've assembled the world's best open-source security and quality tools into one easy platform. Built by experts, used by millions, now available to you."
          />

          {/* Supported Languages */}
          <div className="mt-12 mb-16">
            <h3 className="text-xl font-bold text-center mb-6">Languages & Frameworks We Protect</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {['JavaScript', 'TypeScript', 'Python', 'Go', 'Ruby', 'PHP', 'Java', 'Kotlin', 'Swift', 'Rust', 'C/C++', 'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Docker', 'Kubernetes', 'Terraform'].map(lang => (
                <span key={lang} className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">{lang}</span>
              ))}
            </div>
          </div>

          {/* Value-Focused Category Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCategories.map((category) => {
              const info = CATEGORY_VALUE[category];
              const toolCount = getToolCount(category);
              const toolNames = getToolNames(category);
              const isExpanded = expandedCategory === category;

              return (
                <GlassCard key={category} className={`p-6 !border-2 ${info.borderColor} transition-all duration-300`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{info.icon}</span>
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${info.color}`}>{info.title}</h3>
                      <p className="text-sm text-muted-foreground">{info.tagline}</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {info.value}
                  </p>

                  {/* What we catch */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">We Protect Against:</p>
                    <div className="flex flex-wrap gap-2">
                      {info.risks.map(risk => (
                        <span key={risk} className={`px-2 py-1 text-xs rounded-full ${info.bgColor} ${info.color}`}>
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tools footnote - collapsible */}
                  <div className="pt-4 border-t border-border/50">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Powered by {toolCount} expert tools</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {toolNames.join(' · ')}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Total tools callout */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              <strong className="text-foreground">{TOOL_REGISTRY.length} tools total</strong> — the same tools trusted by companies like Google, Microsoft, and Meta. We made them easy to use.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-muted/30">
        <div className="container-wide">
          <SectionHeading
            badge="Dead Simple"
            title="Expert Protection in Three Steps"
            titleGradient="Three Steps"
            description="You don't need to be a security expert. We are. Just connect your code."
          />

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              {
                step: '01',
                title: 'Connect Your Code',
                description: 'GitHub, GitLab, ZIP upload, or API. Auto-scan on every deploy if you want.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'We Run Everything',
                description: `${TOOL_REGISTRY.length} industry-leading tools scan your code in parallel. Under 2 minutes.`,
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Fix What Matters',
                description: 'Prioritized report shows critical issues first. AI explains each problem in plain English.',
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

      {/* Social Proof */}
      <section className="py-16">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-2xl font-bold mb-8">
              &ldquo;I shipped my app in a weekend with AI. Bugrit found 23 security issues I had no idea about. Fixed them in an hour. <span className="text-primary">Probably saved my startup.</span>&rdquo;
            </p>
            <p className="text-muted-foreground">— A vibe coder who didn&apos;t get hacked</p>
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
            description="SMB breaches cost $120K-$1.24M. 60% never recover. Expert protection costs less than your coffee habit."
          />

          <div className="grid md:grid-cols-4 gap-6 mt-16 max-w-6xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                description: 'Try it out',
                credits: '5 credits',
                features: ['1 project', 'Up to 10K lines', 'Core security scans', '7-day history'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Solo',
                price: '$19',
                description: 'For side projects',
                credits: '50 credits/mo',
                features: ['3 projects', 'Up to 50K lines', 'All security tools', 'AI scan summaries', '14-day history'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Scale',
                price: '$49',
                description: 'For serious builders',
                credits: '200 credits/mo',
                features: ['10 projects', 'Up to 150K lines', 'All tools + browser testing', 'AI explanations', 'GitHub integration', '30-day history'],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Business',
                price: '$99',
                description: 'For teams',
                credits: '500 credits/mo',
                features: ['Unlimited projects', 'Up to 500K lines', 'All tools + AI fixes', '10 team members', 'Slack + webhooks', 'API access', '90-day history'],
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
                    <span className="px-4 py-1 rounded-full text-xs font-semibold bg-primary text-white whitespace-nowrap">
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
              Don&apos;t Ship Your Next Vulnerability.
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              You&apos;ve worked too hard to let a preventable bug tank your launch. Let the experts check your code before you deploy.
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
              Free tier available. No credit card required. {TOOL_REGISTRY.length} expert tools at your fingertips.
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
              Expert security tools made easy. {TOOL_REGISTRY.length} tools. Built by security experts worldwide.
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

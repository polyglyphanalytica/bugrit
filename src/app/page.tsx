'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { Logo } from '@/components/ui/logo';
import { PlatformLogos } from '@/components/ui/platform-logos';
import { TOOL_REGISTRY, CATEGORY_LABELS, CATEGORY_ICONS, ToolCategory } from '@/lib/tools/registry';
import { Menu, X, Shield, Zap, Eye, Wand2, ArrowRight, Check, Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react';

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const senseiMessages = [
    {
      role: 'Sensei',
      text: 'Connected to GitHub \u00b7 polyglyphanalytica/bugrit. Want me to run the security + quality pipeline for the latest commit?',
    },
    {
      role: 'User',
      text: 'Yes, launch a code scan + regression test, and give me the tool roadmap before you start.',
    },
    {
      role: 'Sensei',
      text: 'Running Semgrep, OWASP ZAP, Supply Chain auditor, and the QA regression suite. I will surface results inline and log everything to Firestore + API.',
    },
  ];

  const quickActions = [
    { label: 'GitHub repo', description: 'polyglyphanalytica/bugrit', icon: Shield },
    { label: 'Upload bundle', description: 'Drag-and-drop ZIP or CLI payload', icon: ArrowRight },
    { label: 'API/Shell', description: 'POST to /api/v1/scans', icon: Sparkles },
  ];

  const moduleSelections = [
    { name: 'Semgrep', impact: 'Security', status: 'Recommended' },
    { name: 'Supply Chain Auditor', impact: 'Dependency attacks', status: 'Enabled' },
    { name: 'QA Regression Suite', impact: 'Tests', status: 'Queued' },
  ];

  const scanTimeline = [
    { label: 'Queued', detail: 'Awaiting worker', time: '10:12' },
    { label: 'Running', detail: 'Semgrep + QA suite', time: '10:13' },
    { label: 'Advice', detail: 'Upgrade to Pro for more scans', time: '10:15' },
  ];

  // Group tools by category for the "What We Check" section
  const toolsByCategory = TOOL_REGISTRY.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, typeof TOOL_REGISTRY>);

  return (
    <div className="min-h-screen bg-white">
      {/* Pronunciation banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center py-1.5 px-4">
        <p className="text-xs font-medium">
          <span className="opacity-90">Bugrit is pronounced</span>{' '}
          <span className="font-semibold">&ldquo;Bug Rite&rdquo;</span>
          <span className="opacity-75 mx-2">&middot;</span>
          <span className="opacity-90">&ldquo;\u0B88&rdquo; (E) is Tamil for the common housefly &mdash; we eliminate bugs, so there&apos;s no E in Bugrit.</span>
        </p>
      </div>

      {/* Navigation with mobile menu */}
      <nav className="fixed top-8 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="container-wide flex items-center justify-between h-16">
          <Logo href="/" />
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How It Works</Link>
            <Link href="#tools" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Tools</Link>
            <Link href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block">
              <GradientButton variant="ghost" size="sm">Sign in</GradientButton>
            </Link>
            <Link href="/signup">
              <GradientButton size="sm">Start a Sensei Scan</GradientButton>
            </Link>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-900"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="container-wide py-4 space-y-1">
              <Link href="#features" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Features</Link>
              <Link href="#how-it-works" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>How It Works</Link>
              <Link href="#tools" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Tools</Link>
              <Link href="#pricing" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Pricing</Link>
              <Link href="/docs" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Docs</Link>
              <div className="pt-2 border-t border-gray-100">
                <Link href="/login" className="block py-2.5 text-sm text-gray-400" onClick={() => setMobileNavOpen(false)}>Sign in</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero — sensei-first prompt */}
      <section className="pt-32 pb-16 md:pt-44 md:pb-20">
        <div className="container-wide">
          <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-10 items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 w-fit">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                </span>
                <span className="text-xs font-medium text-orange-600">Sensei-first &middot; {TOOL_REGISTRY.length} tools &middot; Instant scans</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                Sensei leads the scan, you get the insights.
              </h1>

              <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                Every post-login action flows through the always-on Sensei chat. Connect a repo, submit code, and the AI orchestrates scans, tests, and subscription upgrades on-screen &mdash; no menus required.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/signup">
                  <GradientButton size="lg" glow>
                    Start a Sensei scan
                    <ArrowRight className="w-4 h-4" />
                  </GradientButton>
                </Link>
                <Link href="#how-it-works">
                  <GradientButton variant="outline" size="lg">
                    Preview the flow
                  </GradientButton>
                </Link>
              </div>

              <p className="text-xs text-gray-400">
                Sensei already knows your GitHub, manual uploads, and API surface. Every capability is mirrored in the documented API, so menus are optional.
              </p>
            </div>

            {/* Sensei chat mockup */}
            <div className="relative bg-slate-900/95 text-white backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Sensei</p>
                  <p className="text-sm text-white/80">Always-on developer copilot</p>
                </div>
                <span className="text-xs text-green-400 px-3 py-1 rounded-full bg-green-900/60 border border-green-500/40">Live</span>
              </div>

              <div className="space-y-3">
                {senseiMessages.map((message) => (
                  <div
                    key={message.text}
                    className={`p-3 rounded-2xl border ${
                      message.role === 'Sensei'
                        ? 'border-white/30 bg-white/5'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <p className="text-[13px] uppercase tracking-[0.2em] text-white/50 mb-1">
                      {message.role}
                    </p>
                    <p className="text-sm leading-relaxed text-white">{message.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="flex items-center justify-between rounded-2xl border border-white/20 px-4 py-2 text-sm hover:border-white/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <action.icon className="w-4 h-4 text-orange-300" />
                      <div className="text-left">
                        <p className="font-semibold text-white">{action.label}</p>
                        <p className="text-xs text-white/70">{action.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/60" />
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Module advisor</p>
                {moduleSelections.map((module) => (
                  <div key={module.name} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-white">{module.name}</p>
                      <p className="text-xs text-white/60">{module.impact}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full border border-white/20 text-white/70">
                      {module.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 space-y-2 text-xs text-white/60">
                {scanTimeline.map((event) => (
                  <div key={event.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{event.label}</p>
                      <p className="text-sm text-white">{event.detail}</p>
                    </div>
                    <span>{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <ScrollReveal>
        <section className="py-12 border-y border-gray-100">
          <div className="container-wide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">5,000+</p>
                <p className="text-xs text-gray-400 mt-1">automated checks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">&lt;2 min</p>
                <p className="text-xs text-gray-400 mt-1">scan time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">15+</p>
                <p className="text-xs text-gray-400 mt-1">languages supported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{TOOL_REGISTRY.length}</p>
                <p className="text-xs text-gray-400 mt-1">security modules</p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features — 3 cards */}
      <section id="features" className="py-24 md:py-32">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="What We Do"
              title="Everything your code needs, checked."
              description="Security vulnerabilities, leaked secrets, broken dependencies, performance issues — we catch it all in one scan."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-6xl mx-auto">
            <ScrollReveal delay={0}>
              <GlassCard hover className="p-8 h-full">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Scanning</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  SQL injection, XSS, hardcoded secrets, command injection. We find the vulnerabilities before attackers do.
                </p>
              </GlassCard>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <GlassCard hover className="p-8 h-full">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Code Quality</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Type errors, dead code, risky dependencies, performance issues. Clean code ships faster and breaks less.
                </p>
              </GlassCard>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <GlassCard hover className="p-8 h-full">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Eye className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Ready Fixes</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Every issue comes with plain English explanations and AI prompts you can paste right into Cursor or Copilot.
                </p>
              </GlassCard>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <GlassCard hover className="p-8 h-full">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Wand2 className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Autofix</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Bring your own AI key, and Bugrit pushes fixes straight to a branch with a pull request — fully automated.
                </p>
              </GlassCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How It Works — 3 steps */}
      <section id="how-it-works" className="py-24 md:py-32 bg-gray-50/50">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="3 Steps"
              title="Scan your code in seconds"
              titleGradient="in seconds"
              description="No setup. No configuration. Just paste your repo URL."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-10 mt-16 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Paste your GitHub URL',
                description: 'Connect your repo with one click. Sensei auto-detects your language and framework.',
              },
              {
                step: '02',
                title: 'Sensei runs everything',
                description: `${TOOL_REGISTRY.length} modules run 5,000+ checks for security, quality, accessibility, and performance.`,
              },
              {
                step: '03',
                title: 'Get actionable fixes',
                description: 'See prioritized results with AI-ready prompts you can paste into your editor.',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 120}>
                <div className="relative">
                  <span className="text-5xl font-bold text-orange-100">{item.step}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={200}>
            <div className="mt-16 max-w-lg mx-auto">
              <div className="flex gap-2 p-2 rounded-xl border border-gray-200 bg-white">
                <input
                  type="text"
                  readOnly
                  value="https://github.com/your-username/your-repo"
                  className="flex-1 px-3 py-2 text-sm text-gray-400 bg-transparent border-0 outline-none font-mono"
                />
                <Link href="/signup">
                  <GradientButton size="sm">Scan Free</GradientButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Smart Module Advisor */}
      <section className="py-24 md:py-32">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="Smart Advisor"
              title="Never overpay. Stay ahead of vulnerabilities."
              titleGradient="Stay ahead"
              description="Our intelligent module advisor analyzes your project and recommends exactly what you need — no more, no less."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="space-y-4">
              <ScrollReveal delay={0}>
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Smart Recommendations</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Tell us your app type and sensitivity level. We&apos;ll bubble up the most important modules and prioritize what matters for your stack.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Coverage Gap Detection</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Building a fintech app but forgot API security scanning? We&apos;ll tell you what&apos;s missing before you ship with blind spots.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Redundancy Alerts</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Selected both Trivy and Grype? They do the same thing. We&apos;ll catch overlapping modules so you don&apos;t waste credits.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Learns From Your Scans</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Had security issues last time? We&apos;ll recommend follow-up modules. New commits? We&apos;ll suggest scans for changed files.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={150}>
              <GlassCard className="p-6 h-full bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Module Advisor</span>
                  <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Score: 85/100</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Good coverage!</span>
                    </div>
                    <p className="text-xs text-green-600">Your selection covers 85% of recommended categories for financial applications.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">Overlapping modules detected</span>
                    </div>
                    <p className="text-xs text-amber-600">Trivy and Grype both scan for vulnerabilities. Remove one to save 2 credits.</p>
                    <button className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800">
                      Keep Trivy, remove Grype &rarr;
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">Recommended for your stack</span>
                    </div>
                    <p className="text-xs text-blue-600">Based on your fintech API, these modules provide essential coverage.</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Semgrep</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">OWASP ZAP</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Spectral</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Top recommendations for you:</p>
                    <div className="space-y-2">
                      {[
                        { name: 'Semgrep', reason: 'Essential for financial apps', credits: 2 },
                        { name: 'Gitleaks', reason: 'Protects against leaked secrets', credits: 1 },
                        { name: 'OSV Scanner', reason: 'Supply chain protection', credits: 1 },
                      ].map((tool) => (
                        <div key={tool.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-orange-100 flex items-center justify-center">
                              <Shield className="w-2.5 h-2.5 text-orange-500" />
                            </div>
                            <span className="font-medium text-gray-700">{tool.name}</span>
                            <span className="text-gray-400">&middot; {tool.reason}</span>
                          </div>
                          <span className="text-gray-400">{tool.credits} cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={400}>
            <div className="mt-12 text-center">
              <Link href="/signup">
                <GradientButton size="lg">
                  Try the Smart Advisor
                  <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </Link>
              <p className="text-xs text-gray-400 mt-3">Included free with every plan</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* What We Check — dynamic tool grid */}
      <section id="tools" className="py-24 md:py-32 bg-gray-50/50">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge={`${TOOL_REGISTRY.length} Tools Working For You`}
              title="Everything We Check"
              titleGradient="We Check"
              description="One scan. All of these tools. Every single time. No config required."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <ScrollReveal key={category}>
                <GlassCard className="p-6 h-full">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_ICONS[category as ToolCategory] || '\uD83D\uDD27'}</span>
                    {CATEGORY_LABELS[category as ToolCategory]}
                  </h3>
                  <ul className="space-y-2">
                    {tools.map((tool) => (
                      <li key={tool.id} className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                        {tool.name}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Platform Testing */}
      <section className="py-24 md:py-32">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="Cross-Platform Testing"
              title="Test Before Users Find Bugs"
              titleGradient="Users Find Bugs"
              description="Your app should work everywhere. We test web, mobile, and desktop so you don't ship broken features."
            />
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            {[
              {
                icon: '\uD83C\uDF10',
                title: 'Web Apps',
                subtitle: 'Every browser, every device',
                description: '"Works on my machine" isn\'t good enough. We test Chrome, Firefox, Safari, and Edge.',
                features: ['Chrome, Firefox, Safari, Edge', 'Phone, tablet, desktop views', 'Screenshots when things break', 'Video replay of failures'],
                color: 'text-green-400',
              },
              {
                icon: '\uD83D\uDCF1',
                title: 'Mobile Apps',
                subtitle: 'iPhone and Android',
                description: 'Half your users are on phones. We test on real devices — not simulators.',
                features: ['Real iPhone testing', 'Real Android testing', 'Touch, swipe, pinch gestures', 'React Native, Flutter, Capacitor'],
                color: 'text-purple-400',
              },
              {
                icon: '\uD83D\uDCBB',
                title: 'Desktop Apps',
                subtitle: 'Mac, Windows, Linux',
                description: 'Building a desktop app? We test on all three operating systems.',
                features: ['macOS testing', 'Windows testing', 'Linux testing', 'File system, clipboard, menus'],
                color: 'text-orange-400',
              },
            ].map((platform, i) => (
              <ScrollReveal key={platform.title} delay={i * 100}>
                <GlassCard hover className="p-8 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center">
                      <span className="text-2xl">{platform.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{platform.title}</h3>
                      <p className="text-sm text-gray-400">{platform.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">{platform.description}</p>
                  <div className="space-y-3 text-sm">
                    {platform.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className={`w-4 h-4 ${platform.color}`} />
                        <span className="text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 md:py-24 bg-gray-50/50">
        <div className="container-tight">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6">
                <span className="text-orange-500 text-lg">&ldquo;</span>
              </div>
              <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed mb-6">
                Built my app with Cursor in a weekend. Bugrit found 23 issues I had no idea about.
                <span className="text-orange-500"> Fixed everything in an hour</span> with the AI prompts.
              </p>
              <p className="text-sm text-gray-400">Indie developer shipping their first SaaS</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 bg-gray-50/50">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="Pricing"
              title="Simple, transparent pricing"
              description="Start free. Upgrade when you need more. No surprises."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-5 mt-16 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                description: 'Try it out',
                credits: '10 credits',
                features: ['1 project', 'Up to 10K lines', 'Core security scans', '7-day history'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Solo',
                price: '$19',
                description: 'For side projects',
                credits: '50 credits/mo',
                features: ['3 projects', 'Up to 50K lines', 'All security modules', 'Smart Module Advisor', 'AI scan summaries', '14-day history'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Scale',
                price: '$49',
                description: 'For serious builders',
                credits: '200 credits/mo',
                features: ['10 projects', 'Up to 150K lines', 'All modules + browser testing', 'Smart Module Advisor', 'AI explanations', 'GitHub integration', '30-day history'],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Business',
                price: '$99',
                description: 'For teams',
                credits: '500 credits/mo',
                features: ['Unlimited projects', 'Up to 500K lines', 'All modules + AI fixes', 'Smart Module Advisor', '10 team members', 'Slack + webhooks', 'API access', '90-day history'],
                cta: 'Start Free Trial',
                popular: false,
              },
            ].map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 80}>
                <GlassCard
                  hover
                  className={`p-6 h-full flex flex-col ${plan.popular ? 'ring-2 ring-orange-400 shadow-glow' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      {plan.price !== '$0' && <span className="text-sm text-gray-400">/mo</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{plan.credits}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block">
                    <GradientButton
                      variant={plan.popular ? 'primary' : 'outline'}
                      className="w-full"
                      size="sm"
                    >
                      {plan.cta}
                    </GradientButton>
                  </Link>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            Need more? <Link href="/contact" className="text-orange-500 hover:underline">Contact us</Link> for Enterprise pricing with unlimited scans, SSO, and SLA.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32">
        <div className="container-tight">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ready to ship with confidence?
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Paste your GitHub URL and see what Sensei finds. Free scan, no credit card, results in under 2 minutes.
              </p>
              <Link href="/signup">
                <GradientButton size="lg" glow>
                  Scan My Code Free
                  <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <PlatformLogos />
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Logo href="/" />
              <span className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Polyglyph Analytica</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy Policy</Link>
              <Link href="/docs" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

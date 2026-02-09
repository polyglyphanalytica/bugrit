'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { Logo } from '@/components/ui/logo';
import { PlatformLogos } from '@/components/ui/platform-logos';
import { Menu, X, Shield, Zap, Eye, ArrowRight, Check, Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react';

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Pronunciation banner — slim, informative */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center py-1.5 px-4">
        <p className="text-xs font-medium">
          <span className="opacity-90">Bugrit is pronounced</span>{' '}
          <span className="font-semibold">&ldquo;Bug Rite&rdquo;</span>
          <span className="opacity-75 mx-2">·</span>
          <span className="opacity-90">&ldquo;ஈ&rdquo; (E) is Tamil for the common housefly — we eliminate bugs, so there&apos;s no E in Bugrit.</span>
        </p>
      </div>

      {/* Navigation — clean, minimal */}
      <nav className="fixed top-8 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="container-wide flex items-center justify-between h-16">
          <Logo href="/" />
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How It Works</Link>
            <Link href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block">
              <GradientButton variant="ghost" size="sm">Sign in</GradientButton>
            </Link>
            <Link href="/signup">
              <GradientButton size="sm">Get Started</GradientButton>
            </Link>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-900"
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
              <Link href="#pricing" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Pricing</Link>
              <Link href="/docs" className="block py-2.5 text-sm text-gray-600 hover:text-gray-900" onClick={() => setMobileNavOpen(false)}>Docs</Link>
              <div className="pt-2 border-t border-gray-100">
                <Link href="/login" className="block py-2.5 text-sm text-gray-400" onClick={() => setMobileNavOpen(false)}>Sign in</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero — clean, confident, minimal */}
      <section className="pt-40 pb-20 md:pt-52 md:pb-32">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 mb-8 animate-fade-down">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
              <span className="text-xs font-medium text-orange-600">150 modules. 5,000+ automated checks.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6 animate-fade-up fill-both leading-[1.1]">
              Scan every PR.{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Ship safe.
              </span>
            </h1>

            <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 animate-fade-up delay-200 fill-both leading-relaxed">
              Security scanning that runs on every commit. Only scans what you changed—1-2 credits per PR, results in 30 seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up delay-300 fill-both">
              <Link href="/signup">
                <GradientButton size="lg" glow>
                  Scan My Code Free
                  <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </Link>
              <Link href="#how-it-works">
                <GradientButton variant="outline" size="lg">
                  See How It Works
                </GradientButton>
              </Link>
            </div>

            <p className="text-xs text-gray-400 mt-6 animate-fade-up delay-400 fill-both">
              Free tier included. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Trust bar — understated */}
      <ScrollReveal>
        <section className="py-12 border-y border-gray-100">
          <div className="container-wide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">1-2</p>
                <p className="text-xs text-gray-400 mt-1">credits per PR</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">&lt;30s</p>
                <p className="text-xs text-gray-400 mt-1">PR scan time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">150</p>
                <p className="text-xs text-gray-400 mt-1">security modules</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5,000+</p>
                <p className="text-xs text-gray-400 mt-1">automated checks</p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features — 3 cards, clean and simple */}
      <section id="features" className="py-24 md:py-32">
        <div className="container-wide">
          <ScrollReveal>
            <SectionHeading
              badge="What We Do"
              title="Everything your code needs, checked."
              description="Security vulnerabilities, leaked secrets, broken dependencies, performance issues — we catch it all in one scan."
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
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
          </div>
        </div>
      </section>

      {/* How It Works — 3 steps, whitespace, clean */}
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
                title: 'Connect your repo',
                description: 'Paste your GitHub URL or add our GitHub Action. We detect changes automatically.',
              },
              {
                step: '02',
                title: 'We scan your changes',
                description: 'Only changed files get scanned. 1-2 credits per PR, results in 30 seconds.',
              },
              {
                step: '03',
                title: 'Fix before merge',
                description: 'See issues YOU introduced with AI-ready fix prompts. No legacy noise.',
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

      {/* Smart Module Advisor — NEW feature highlight */}
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
            {/* Left column — feature cards */}
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

            {/* Right column — example advisor UI */}
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
                  {/* Example message 1 */}
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Good coverage!</span>
                    </div>
                    <p className="text-xs text-green-600">Your selection covers 85% of recommended categories for financial applications.</p>
                  </div>

                  {/* Example message 2 */}
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">Overlapping modules detected</span>
                    </div>
                    <p className="text-xs text-amber-600">Trivy and Grype both scan for vulnerabilities. Remove one to save 2 credits.</p>
                    <button className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800">
                      Keep Trivy, remove Grype →
                    </button>
                  </div>

                  {/* Example message 3 */}
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

                  {/* Bubbled recommendations */}
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
                            <span className="text-gray-400">· {tool.reason}</span>
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

      {/* Social proof — simple quote */}
      <section className="py-20 md:py-24 bg-gray-50/50">
        <div className="container-tight">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6">
                <span className="text-orange-500 text-lg">&ldquo;</span>
              </div>
              <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed mb-6">
                We run Bugrit on every PR now. Costs us 2 credits, takes 30 seconds, and
                <span className="text-orange-500"> catches issues before they hit main</span>. No more &ldquo;oops&rdquo; commits.
              </p>
              <p className="text-sm text-gray-400">Senior Engineer at a fintech startup</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing — clean, 4 columns */}
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
        </div>
      </section>

      {/* CTA — final push */}
      <section className="py-24 md:py-32">
        <div className="container-tight">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ready to scan every PR?
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Add Bugrit to your CI pipeline. 1-2 credits per PR, results in 30 seconds, only issues you introduced.
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

      {/* Footer — minimal */}
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

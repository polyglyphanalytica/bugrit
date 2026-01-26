'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Getting Started',
    items: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/getting-started', label: 'Quick Start' },
      { href: '/docs/clever-automation', label: 'Clever Automation' },
      { href: '/docs/vibe-coding', label: 'Vibe Coding Prompts' },
      { href: '/docs/submitting-apps', label: 'Submitting Code' },
      { href: '/docs/authentication', label: 'Authentication' },
      { href: '/docs/reports', label: 'AI Reports' },
    ],
  },
  {
    title: 'Testing',
    items: [
      { href: '/docs/integrations/playwright', label: 'Playwright (Web)' },
      { href: '/docs/integrations/appium', label: 'Appium (Mobile)' },
      { href: '/docs/integrations/tauri', label: 'Tauri (Desktop)' },
    ],
  },
  {
    title: 'Code Scanning',
    items: [
      { href: '/docs/scanning/security', label: 'Security Tools' },
      { href: '/docs/scanning/quality', label: 'Quality Tools' },
      { href: '/docs/scanning/dependencies', label: 'Dependency Tools' },
      { href: '/docs/scanning/accessibility', label: 'Accessibility Tools' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { href: '/docs/integrations/github', label: 'GitHub' },
      { href: '/docs/integrations/ci-cd', label: 'CI/CD' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { href: '/docs/api-reference/projects', label: 'Projects' },
      { href: '/docs/api-reference/scans', label: 'Scans' },
      { href: '/docs/api-reference/sessions', label: 'Sessions (Real-Time)' },
      { href: '/docs/api-reference/automations', label: 'Automations' },
      { href: '/docs/api-reference/tests', label: 'Tests' },
      { href: '/docs/api-reference/reports', label: 'Reports' },
      { href: '/docs/api-reference/billing', label: 'Billing' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { href: '/docs/pricing', label: 'Pricing & Credits' },
      { href: '/docs/rate-limits', label: 'Rate Limits' },
      { href: '/docs/errors', label: 'Error Codes' },
      { href: '/docs/roadmap', label: 'Roadmap' },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
          <div className="mr-4 flex items-center">
            {/* Mobile menu button */}
            <button
              className="md:hidden mr-3 p-2 -ml-2 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            <Logo href="/" size="sm" />
            <span className="ml-4 text-sm font-medium text-muted-foreground hidden sm:inline">
              Documentation
            </span>
          </div>
          <nav className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/settings/api-keys"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              API Keys
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-72 bg-background border-r transform transition-transform md:hidden overflow-y-auto',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="py-4 px-4">
          {navItems.map((section) => (
            <div key={section.title} className="mb-4">
              <h4 className="font-semibold text-sm mb-2 px-2">{section.title}</h4>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block text-sm py-2 px-3 rounded-md transition-colors',
                        pathname === item.href
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0 border-r min-h-[calc(100vh-3.5rem)]">
            <nav className="sticky top-14 py-6 pr-6 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              {navItems.map((section) => (
                <div key={section.title} className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'block text-sm py-1.5 px-2 rounded-md transition-colors',
                            pathname === item.href
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 py-6 px-2 sm:px-4 md:px-8 min-w-0">
            <div className="max-w-3xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo href="/" size="sm" />
            <p className="text-muted-foreground text-sm text-center md:text-left">
              A vibe coder&apos;s best friend. 150 modules. 3 test frameworks. Zero judgment.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

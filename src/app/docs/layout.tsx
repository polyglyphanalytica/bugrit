'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Getting Started',
    items: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/getting-started', label: 'Quick Start' },
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
          <div className="mr-4 flex">
            <Logo href="/" size="sm" />
            <span className="ml-4 text-sm font-medium text-muted-foreground">
              Documentation
            </span>
          </div>
          <nav className="flex flex-1 items-center justify-end space-x-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/settings/api-keys"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              API Keys
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex">
          {/* Sidebar */}
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
          <main className="flex-1 py-6 px-8 min-w-0">
            <div className="max-w-3xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo href="/" size="sm" />
            <p className="text-muted-foreground text-sm">
              A vibe coder&apos;s best friend. 25 tools. 3 test frameworks. Zero judgment.
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

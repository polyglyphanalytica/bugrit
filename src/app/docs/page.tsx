import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Bugrit Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Bugrit is a testing and code scanning platform. Run automated tests across web, mobile,
          and desktop with Playwright, Appium, and Tauri. Scan your code with 25 analysis tools.
          Get one unified, AI-powered report.
        </p>
      </div>

      <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-xl font-bold mb-3">Two Core Capabilities</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🧪</span>
              <span className="font-semibold">Automated Testing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Run your tests on any platform: Playwright for web, Appium for mobile, Tauri for desktop
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔍</span>
              <span className="font-semibold">Code Scanning</span>
            </div>
            <p className="text-sm text-muted-foreground">
              25 analysis tools for security, linting, dependencies, accessibility, and more
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/docs/getting-started">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Run your first test or scan in under 5 minutes
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/submitting-apps">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Submitting Code</CardTitle>
              <CardDescription>
                All the ways to submit your application for testing and scanning
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/reports">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>AI Reports</CardTitle>
              <CardDescription>
                How we combine test results and scan findings into one clear report
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/api-reference/scans">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
              <CardDescription>
                Trigger tests and scans programmatically
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Testing Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🧪</span> Testing Frameworks
        </h2>
        <p className="text-muted-foreground mb-4">
          Run automated tests across all platforms using industry-standard frameworks.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/docs/integrations/playwright">
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🌐</span> Playwright
                </CardTitle>
                <CardDescription>
                  Web E2E testing in Chrome, Firefox, WebKit
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/docs/integrations/appium">
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📱</span> Appium
                </CardTitle>
                <CardDescription>
                  Mobile testing on real iOS and Android devices
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/docs/integrations/tauri">
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-orange-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💻</span> Tauri
                </CardTitle>
                <CardDescription>
                  Desktop testing on Windows, macOS, Linux
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-semibold mb-2">Supported Languages & Frameworks</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-background rounded border">TypeScript</span>
            <span className="px-2 py-1 bg-background rounded border">JavaScript</span>
            <span className="px-2 py-1 bg-background rounded border">Python</span>
            <span className="px-2 py-1 bg-background rounded border">Java</span>
            <span className="px-2 py-1 bg-background rounded border">Rust</span>
            <span className="px-2 py-1 bg-background rounded border">React</span>
            <span className="px-2 py-1 bg-background rounded border">Vue</span>
            <span className="px-2 py-1 bg-background rounded border">Angular</span>
            <span className="px-2 py-1 bg-background rounded border">React Native</span>
            <span className="px-2 py-1 bg-background rounded border">Flutter</span>
          </div>
        </div>
      </div>

      {/* Code Scanning Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🔍</span> Code Scanning Tools
        </h2>
        <p className="text-muted-foreground mb-4">
          25 analysis tools run in parallel and consolidate findings into one report.
        </p>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>📝</span> Linting
            </div>
            <div className="text-xs text-muted-foreground">ESLint, Biome, Stylelint, Prettier</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>🔒</span> Security
            </div>
            <div className="text-xs text-muted-foreground">Secretlint, audit-ci, lockfile-lint, eslint-security</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>📦</span> Dependencies
            </div>
            <div className="text-xs text-muted-foreground">npm audit, depcheck, license-checker, madge, dep-cruiser</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>♿</span> Accessibility
            </div>
            <div className="text-xs text-muted-foreground">axe-core, Pa11y</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>✨</span> Quality
            </div>
            <div className="text-xs text-muted-foreground">TypeScript, knip, jscpd, cspell, publint</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>📚</span> Documentation
            </div>
            <div className="text-xs text-muted-foreground">markdownlint, remark-lint, alex</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>🔀</span> Git
            </div>
            <div className="text-xs text-muted-foreground">commitlint</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold flex items-center gap-1">
              <span>⚡</span> Performance
            </div>
            <div className="text-xs text-muted-foreground">Lighthouse, size-limit</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-semibold mb-2">Supported Languages & File Types</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-background rounded border">JavaScript</span>
            <span className="px-2 py-1 bg-background rounded border">TypeScript</span>
            <span className="px-2 py-1 bg-background rounded border">CSS/SCSS/Less</span>
            <span className="px-2 py-1 bg-background rounded border">HTML</span>
            <span className="px-2 py-1 bg-background rounded border">JSON</span>
            <span className="px-2 py-1 bg-background rounded border">Markdown</span>
            <span className="px-2 py-1 bg-background rounded border">package.json</span>
            <span className="px-2 py-1 bg-background rounded border">Lock files</span>
          </div>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Supported Platforms</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Web</strong> — Test with Playwright, scan live URLs or source code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Mobile</strong> — Test with Appium on real devices, upload APK/IPA for analysis</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Desktop</strong> — Test Tauri apps on Windows, macOS, Linux</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>npm Packages</strong> — Scan packages directly from the registry</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Docker Images</strong> — Scan container images for vulnerabilities</span>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Base URL</h2>
        <code className="block bg-muted p-4 rounded-lg text-sm">
          https://bugrit.dev/api/v1
        </code>
      </div>
    </div>
  );
}

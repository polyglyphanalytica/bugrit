'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function TauriIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Tauri Desktop Tests</h1>
        <p className="text-lg text-muted-foreground">
          Test your desktop app on Windows, macOS, and Linux.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Write Tests',
            description: 'Generate desktop tests for my app',
            prompt: `Read the Bugrit Tauri docs at https://bugrit.com/docs/integrations/tauri

Look at my Tauri desktop app and write WebdriverIO tests:

1. App launches on all platforms
2. Window management works
3. Menu items function correctly
4. File system operations work
5. Native features (clipboard, notifications)

Create tests that handle platform-specific behavior.
My stack: [React / Vue / Svelte / etc.]`
          },
          {
            label: 'Cross-Platform Test',
            description: 'Test on Windows, Mac, Linux',
            prompt: `Read the Bugrit docs:
- Tauri: https://bugrit.com/docs/integrations/tauri
- Scans API: https://bugrit.com/docs/api-reference/scans

Set up Bugrit to test my Tauri app on all platforms:

1. POST to /api/v1/scans with:
   - sourceType: "github"
   - testConfig.tauri with platforms: ["windows", "macos", "linux"]
2. Bugrit builds for each platform
3. Check report.desktopTests for results

My stack: [YOUR_STACK]`
          },
          {
            label: 'CI Integration',
            description: 'Test on every build',
            prompt: `Read the Bugrit Tauri integration docs at https://bugrit.com/docs/integrations/tauri

Add desktop testing to my CI pipeline:

1. Push code to GitHub
2. Trigger Bugrit scan with Tauri config
3. Bugrit builds for Windows, Mac, Linux
4. Runs tests on all platforms
5. Fails if any platform fails

Use secrets.BUGRIT_API_KEY.`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Desktop apps run on three different operating systems. Test on all three
          so you don&apos;t get 1-star reviews from Windows users.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>All three platforms:</strong> Windows, macOS, Linux—no hardware needed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Native features:</strong> Test file system, clipboard, notifications</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Auto-build:</strong> We build your app for each platform</span>
          </li>
        </ul>
      </div>

      {/* Quick Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span>🪟</span> Windows
          </h4>
          <p className="text-sm text-muted-foreground">Windows 10 & 11</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span>🍎</span> macOS
          </h4>
          <p className="text-sm text-muted-foreground">Sonoma & Ventura</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span>🐧</span> Linux
          </h4>
          <p className="text-sm text-muted-foreground">Ubuntu 22.04 & 24.04</p>
        </div>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Technical Reference
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">API Request</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/tauri-app",
    "testConfig": {
      "tauri": {
        "enabled": true,
        "platforms": ["windows", "macos", "linux"],
        "osVersions": {
          "windows": ["11", "10"],
          "macos": ["sonoma"],
          "linux": ["ubuntu-24.04"]
        }
      }
    }
  }'`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">WebdriverIO Config</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`// wdio.conf.js
const path = require('path');

exports.config = {
  specs: ['./tests/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [{
    'tauri:options': {
      application: path.resolve(__dirname,
        './src-tauri/target/release/bundle/macos/MyApp.app')
    }
  }],
  framework: 'mocha',
  services: ['tauri']
};`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Example Test</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`// tests/app.spec.ts
describe('My Tauri App', () => {
  it('should display the main window', async () => {
    const title = await browser.getTitle();
    expect(title).toBe('My Tauri App');
  });

  it('should navigate to settings', async () => {
    const settingsBtn = await $('#settings-button');
    await settingsBtn.click();
    const settingsPage = await $('#settings-page');
    await expect(settingsPage).toBeDisplayed();
  });
});`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Config Options</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Option</th>
                    <th className="text-left py-2 px-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>platforms</code></td>
                    <td className="py-2 px-2 text-muted-foreground">windows, macos, linux</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>osVersions</code></td>
                    <td className="py-2 px-2 text-muted-foreground">OS versions per platform</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>timeout</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Max test timeout in ms</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2"><code>buildArgs</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Additional cargo tauri build args</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Report Output</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "desktopTests": {
    "framework": "tauri",
    "summary": {
      "total": 24,
      "passed": 22,
      "failed": 2,
      "platforms": 3
    },
    "platformResults": [
      { "platform": "windows", "passed": 8, "failed": 0 },
      { "platform": "macos", "passed": 7, "failed": 1 },
      { "platform": "linux", "passed": 7, "failed": 1 }
    ]
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Supported Frameworks</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-muted rounded-full text-sm">React</span>
              <span className="px-3 py-1 bg-muted rounded-full text-sm">Vue</span>
              <span className="px-3 py-1 bg-muted rounded-full text-sm">Svelte</span>
              <span className="px-3 py-1 bg-muted rounded-full text-sm">SolidJS</span>
              <span className="px-3 py-1 bg-muted rounded-full text-sm">Next.js</span>
              <span className="px-3 py-1 bg-muted rounded-full text-sm">Nuxt</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

export default function TauriIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Tauri Desktop Tests</h1>
        <p className="text-lg text-muted-foreground">
          Test your Tauri desktop applications across Windows, macOS, and Linux using WebDriver protocol.
          Bugrit runs your tests on real operating systems and includes results in your unified report.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Desktop apps run on three different operating systems with different file paths, permissions, and native APIs. Test on all three so you don&apos;t get 1-star reviews from Windows users.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>All three platforms:</strong> Windows 10/11, macOS, and Ubuntu—tested on our VMs, no hardware needed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Native features:</strong> Test file system access, clipboard, notifications, and system dialogs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Build verification:</strong> We build your Tauri app for each platform and run your tests</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Platforms</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>🪟</span> Windows
            </h4>
            <p className="text-sm text-muted-foreground">
              Windows 10 and Windows 11 virtual machines with full WebDriver support.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>🍎</span> macOS
            </h4>
            <p className="text-sm text-muted-foreground">
              macOS Sonoma and Ventura on Apple Silicon and Intel hardware.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>🐧</span> Linux
            </h4>
            <p className="text-sm text-muted-foreground">
              Ubuntu 22.04 and 24.04 LTS with full desktop environment support.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <ol className="space-y-3 text-muted-foreground">
          <li><strong>1.</strong> Submit your Tauri project via GitHub/GitLab or upload</li>
          <li><strong>2.</strong> Bugrit detects your <code className="bg-muted px-1 py-0.5 rounded">tauri.conf.json</code> and test configuration</li>
          <li><strong>3.</strong> We build your app for each target platform</li>
          <li><strong>4.</strong> Tests run using tauri-driver (WebDriver) on real VMs</li>
          <li><strong>5.</strong> Results appear in your unified report with screenshots and logs</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Project Setup</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit automatically detects and runs Tauri tests if your project includes the
          proper configuration. Here's a typical setup:
        </p>

        <h4 className="font-semibold mb-2">tauri.conf.json</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">{`{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "My Tauri App",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "dmg", "deb"]
    }
  }
}`}</pre>
        </div>

        <h4 className="font-semibold mb-2">WebdriverIO Config (wdio.conf.js)</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`const path = require('path');

exports.config = {
  specs: ['./tests/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [{
    'tauri:options': {
      application: path.resolve(
        __dirname,
        './src-tauri/target/release/bundle/macos/MyApp.app'
      )
    }
  }],
  framework: 'mocha',
  mochaOpts: {
    timeout: 60000
  },
  reporters: ['spec'],
  services: ['tauri']
};`}</pre>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Note: Bugrit overrides the application path and capabilities to run on our managed VMs.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Submit for Testing</h2>
        <p className="text-muted-foreground mb-4">
          Submit your Tauri project for cross-platform testing:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/tauri-app",
    "branch": "main",
    "testConfig": {
      "tauri": {
        "enabled": true,
        "platforms": ["windows", "macos", "linux"],
        "osVersions": {
          "windows": ["11", "10"],
          "macos": ["sonoma", "ventura"],
          "linux": ["ubuntu-24.04", "ubuntu-22.04"]
        }
      }
    }
  }'`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Configuration Options</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Option</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>enabled</code></td>
              <td className="py-2 px-2">boolean</td>
              <td className="py-2 px-2 text-muted-foreground">Enable Tauri test execution</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>platforms</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">Target platforms: windows, macos, linux</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>osVersions</code></td>
              <td className="py-2 px-2">object</td>
              <td className="py-2 px-2 text-muted-foreground">OS versions per platform</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>testDir</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">Override test directory (default: ./tests)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>timeout</code></td>
              <td className="py-2 px-2">number</td>
              <td className="py-2 px-2 text-muted-foreground">Max test timeout in ms (default: 60000)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>buildArgs</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">Additional args for cargo tauri build</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Report Output</h2>
        <p className="text-muted-foreground mb-4">
          Tauri test results appear in your unified report:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "report": {
    "id": "rpt-abc123",
    "desktopTests": {
      "framework": "tauri",
      "summary": {
        "total": 24,
        "passed": 22,
        "failed": 2,
        "platforms": 3,
        "duration": 180000
      },
      "platformResults": [
        {
          "platform": "windows",
          "osVersion": "11",
          "passed": 8,
          "failed": 0
        },
        {
          "platform": "macos",
          "osVersion": "sonoma",
          "passed": 7,
          "failed": 1
        },
        {
          "platform": "linux",
          "osVersion": "ubuntu-24.04",
          "passed": 7,
          "failed": 1
        }
      ],
      "failures": [
        {
          "name": "should save file to local filesystem",
          "platform": "macos",
          "error": "File permission denied",
          "screenshot": "https://cdn.bugrit.com/scn-xyz/file-save-failure.png",
          "logs": "https://cdn.bugrit.com/scn-xyz/tauri-logs.txt"
        },
        {
          "name": "should open native file dialog",
          "platform": "linux",
          "error": "Dialog not detected within timeout",
          "screenshot": "https://cdn.bugrit.com/scn-xyz/dialog-failure.png"
        }
      ]
    },
    "findings": [...],
    "security": {...}
  }
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Frontend Frameworks</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit supports Tauri apps built with any frontend framework:
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-muted rounded-full text-sm">React</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Vue</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Svelte</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">SolidJS</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Angular</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Vanilla JS</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Next.js</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">Nuxt</span>
          <span className="px-3 py-1 bg-muted rounded-full text-sm">SvelteKit</span>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Writing Tests</h2>
        <p className="text-muted-foreground mb-4">
          Use WebdriverIO with tauri-driver to write your tests:
        </p>
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

  it('should save preferences', async () => {
    const themeSelect = await $('#theme-select');
    await themeSelect.selectByVisibleText('Dark');

    const saveBtn = await $('#save-btn');
    await saveBtn.click();

    const toast = await $('#success-toast');
    await expect(toast).toHaveText('Preferences saved');
  });

  it('should open file dialog', async () => {
    const openBtn = await $('#open-file-btn');
    await openBtn.click();

    // Tauri-specific: interact with native dialogs
    await browser.pause(1000); // Wait for dialog
    // Dialog handling is platform-specific
  });
});`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Environment Variables</h2>
        <p className="text-muted-foreground mb-4">
          Pass environment variables to your Tauri app during testing:
        </p>
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
        "platforms": ["windows", "macos"],
        "env": {
          "API_URL": "https://staging-api.example.com",
          "DEBUG": "true",
          "AUTH_TOKEN": "{{ secrets.TEST_AUTH_TOKEN }}"
        }
      }
    }
  }'`}</pre>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Use <code className="bg-muted px-1 py-0.5 rounded">{'{{ secrets.NAME }}'}</code> to reference
          secrets stored in your application settings.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Test on all three platforms to catch OS-specific issues</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use appropriate timeouts for native dialogs and file operations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Handle platform-specific behavior in your tests (file paths, permissions)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Keep test files under 100MB for faster builds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use the Rust backend for performance-critical test setup/teardown</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Tauri v2 Support</h2>
        <p className="text-muted-foreground">
          Bugrit fully supports both Tauri v1 and Tauri v2. For v2 projects, ensure your
          <code className="mx-1 px-1 bg-muted rounded">src-tauri/Cargo.toml</code> specifies
          the correct Tauri version. We automatically detect and use the appropriate build
          configuration.
        </p>
      </section>
    </div>
  );
}

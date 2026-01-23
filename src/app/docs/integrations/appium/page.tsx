'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function AppiumIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Appium Mobile Tests</h1>
        <p className="text-lg text-muted-foreground">
          Test your mobile app on real iOS and Android devices.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Write Tests',
            description: 'Generate mobile tests for my app',
            prompt: `Read the Bugrit Appium docs at https://bugrit.com/docs/integrations/appium

Look at my mobile app and write Appium E2E tests:

1. App launches successfully
2. User authentication flow
3. Main navigation works
4. Key features function correctly
5. Offline behavior (if applicable)

Create tests that work with both iOS and Android.
Include touch gestures and proper wait strategies.
My stack: [React Native / Flutter / Native iOS / Native Android]`
          },
          {
            label: 'Scan Mobile App',
            description: 'Run scan with mobile tests',
            prompt: `Read the Bugrit docs:
- Appium: https://bugrit.com/docs/integrations/appium
- Scans API: https://bugrit.com/docs/api-reference/scans

Set up Bugrit to test my mobile app:

1. POST to /api/v1/scans with:
   - sourceType: "mobile"
   - platform: "ios" or "android"
   - mobileConfig with devices and osVersions
2. Upload my app file (IPA/APK)
3. Check report.mobileTests for results

My stack: [YOUR_STACK]`
          },
          {
            label: 'CI Integration',
            description: 'Test on every build',
            prompt: `Read the Bugrit Appium integration docs at https://bugrit.com/docs/integrations/appium

Add mobile testing to my CI pipeline:

1. Build the app (IPA for iOS, APK for Android)
2. Upload to Bugrit via API
3. Run Appium tests on real devices
4. Post results as PR comment
5. Fail if tests fail on any device

Use secrets.BUGRIT_API_KEY. Test on multiple devices.`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Half your users are on mobile. Test on real devices so you don&apos;t get 1-star reviews.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Real devices:</strong> iPhones, iPads, Pixels, Galaxy—not simulators</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Write once:</strong> Same Appium tests run on iOS and Android</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Pre-launch:</strong> Catch crashes before App Store submission</span>
          </li>
        </ul>
      </div>

      {/* Quick Overview */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">iOS Devices</h4>
          <p className="text-sm text-muted-foreground">
            iPhone 15 Pro, 14, SE, iPad Pro and more. XCUITest driver.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Android Devices</h4>
          <p className="text-sm text-muted-foreground">
            Pixel 8, Galaxy S24, OnePlus 12 and more. UiAutomator2 driver.
          </p>
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
  -F "applicationId=app-abc123" \\
  -F "sourceType=mobile" \\
  -F "platform=ios" \\
  -F "appFile=@./MyApp.ipa" \\
  -F "testFile=@./tests.zip" \\
  -F 'mobileConfig={
    "framework": "appium",
    "devices": ["iPhone 14 Pro", "iPhone SE"],
    "osVersions": ["16.0", "15.5"]
  }'`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">WebdriverIO Config</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`// wdio.conf.js
exports.config = {
  framework: 'mocha',
  mochaOpts: { timeout: 60000 },
  specs: ['./tests/**/*.spec.js'],
  capabilities: [{
    platformName: 'iOS',
    'appium:deviceName': 'iPhone 14',
    'appium:platformVersion': '16.0',
    'appium:app': './app.ipa',
    'appium:automationName': 'XCUITest'
  }]
};`}</pre>
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
                    <td className="py-2 px-2"><code>framework</code></td>
                    <td className="py-2 px-2 text-muted-foreground">appium, xctest, espresso</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>devices</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Device names to test on</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>osVersions</code></td>
                    <td className="py-2 px-2 text-muted-foreground">OS versions to test</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2"><code>orientation</code></td>
                    <td className="py-2 px-2 text-muted-foreground">portrait, landscape, or both</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Report Output</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "mobileTests": {
    "framework": "appium",
    "summary": {
      "total": 18,
      "passed": 16,
      "failed": 2,
      "devices": 2
    },
    "failures": [{
      "name": "User can login with Face ID",
      "device": "iPhone 14 Pro",
      "error": "Face ID prompt not detected",
      "screenshot": "https://cdn.bugrit.com/..."
    }]
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Available Devices</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">iOS</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>iPhone 15 Pro Max, 15 Pro, 15</li>
                  <li>iPhone 14 Pro Max, 14 Pro, 14</li>
                  <li>iPhone SE (3rd gen)</li>
                  <li>iPad Pro, iPad Air, iPad mini</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">Android</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Pixel 8 Pro, Pixel 8, Pixel 7a</li>
                  <li>Samsung Galaxy S24, S23</li>
                  <li>Samsung Galaxy Tab S9</li>
                  <li>OnePlus 12, OnePlus 11</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

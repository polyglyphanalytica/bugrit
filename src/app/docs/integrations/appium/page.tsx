export default function AppiumIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Appium Mobile Tests</h1>
        <p className="text-lg text-muted-foreground">
          Include your Appium tests with your mobile app submission. Bugrit will run
          them alongside our 25 analysis tools on iOS and Android.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Half your users are on mobile. An app that works on your iPhone 15 might crash on an older Android device. Test on real devices across iOS and Android—no device farm setup required.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Real devices:</strong> Test on actual iPhones, iPads, Pixels, and Galaxy devices—not simulators</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>One test suite:</strong> Write tests once, run on iOS and Android with the same Appium code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Pre-launch testing:</strong> Catch crashes before App Store/Play Store submission</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Platforms</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">iOS</h4>
            <p className="text-sm text-muted-foreground">
              Test native iOS apps, Safari, and hybrid apps. Bugrit runs your
              Appium tests using XCUITest driver on real devices and simulators.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Android</h4>
            <p className="text-sm text-muted-foreground">
              Test native Android apps, Chrome, and hybrid apps. Bugrit uses
              UiAutomator2 driver on real devices and emulators.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <ol className="space-y-3 text-muted-foreground">
          <li><strong>1.</strong> Upload your mobile app (APK/IPA) or connect your repository</li>
          <li><strong>2.</strong> Bugrit detects your Appium test configuration</li>
          <li><strong>3.</strong> We run your tests on real devices in our device farm</li>
          <li><strong>4.</strong> Results appear in your unified report alongside security and quality findings</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Scan a Mobile App</h2>
        <p className="text-muted-foreground mb-4">
          Submit your mobile app for analysis with Appium tests:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
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
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">WebdriverIO Configuration</h2>
        <p className="text-muted-foreground mb-4">
          Include a wdio.conf.js in your test bundle. Bugrit will use your config
          with our device farm:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`// wdio.conf.js
exports.config = {
  framework: 'mocha',
  mochaOpts: {
    timeout: 60000
  },
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
        <p className="text-muted-foreground mt-2 text-sm">
          Note: Bugrit overrides device capabilities to run on our managed device farm.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Mobile Test Configuration Options</h2>
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
              <td className="py-2 px-2"><code>framework</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">appium, xctest, espresso</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>devices</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">Device names to test on</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>osVersions</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">OS versions to test</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>orientation</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">portrait, landscape, or both</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>locale</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">Device locale (en_US, de_DE)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Report Output</h2>
        <p className="text-muted-foreground mb-4">
          Mobile test results appear in your unified report:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "report": {
    "id": "rpt-abc123",
    "mobileTests": {
      "framework": "appium",
      "platform": "ios",
      "summary": {
        "total": 18,
        "passed": 16,
        "failed": 2,
        "devices": 2,
        "duration": 145000
      },
      "deviceResults": [
        {
          "device": "iPhone 14 Pro",
          "osVersion": "16.0",
          "passed": 8,
          "failed": 1
        },
        {
          "device": "iPhone SE",
          "osVersion": "15.5",
          "passed": 8,
          "failed": 1
        }
      ],
      "failures": [
        {
          "name": "User can login with Face ID",
          "device": "iPhone 14 Pro",
          "error": "Face ID prompt not detected",
          "screenshot": "https://cdn.bugrit.dev/scn-xyz/faceid-failure.png",
          "video": "https://cdn.bugrit.dev/scn-xyz/faceid-failure.mp4"
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
        <h2 className="text-2xl font-bold mb-4">Available Devices</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">iOS Devices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>iPhone 15 Pro Max, 15 Pro, 15, 15 Plus</li>
              <li>iPhone 14 Pro Max, 14 Pro, 14, 14 Plus</li>
              <li>iPhone SE (3rd gen)</li>
              <li>iPad Pro, iPad Air, iPad mini</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Android Devices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Pixel 8 Pro, Pixel 8, Pixel 7a</li>
              <li>Samsung Galaxy S24, S23, S22</li>
              <li>Samsung Galaxy Tab S9</li>
              <li>OnePlus 12, OnePlus 11</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Test on multiple device sizes to catch layout issues</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Include both oldest and newest supported OS versions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use explicit waits instead of sleep() for reliable tests</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Keep test files under 50MB for faster uploads</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

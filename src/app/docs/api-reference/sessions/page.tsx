'use client';

export default function SessionsApiPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Sessions API</h1>
        <p className="text-lg text-muted-foreground">
          Real-time streaming scans with live results as each tool completes.
        </p>
      </div>

      {/* Hero - What's Different */}
      <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 rounded-xl">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> Watch Results Stream In Live
        </h2>
        <p className="text-muted-foreground mb-4">
          The Sessions API is our <strong>new streaming experience</strong>. Instead of waiting 2-5 minutes for all 140+ tools to finish,
          you see each tool&apos;s results <strong>the moment it completes</strong>.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-background/80 rounded-lg border border-muted">
            <div className="text-red-500 font-semibold mb-2">❌ Old Way (Scans API)</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Start scan, wait 2-5 minutes</li>
              <li>• Get all results at once</li>
              <li>• No visibility into progress</li>
            </ul>
          </div>
          <div className="p-4 bg-background/80 rounded-lg border border-green-500/30">
            <div className="text-green-500 font-semibold mb-2">✓ New Way (Sessions API)</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Results appear immediately as tools finish</li>
              <li>• Real-time progress (23/140+ tools done)</li>
              <li>• Automatic credit refunds for failed tools</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Not a Developer Section */}
      <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 rounded-xl">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <span>🎯</span> Not a Developer? Start Here
        </h2>
        <p className="text-muted-foreground mb-4">
          Copy these prompts into <strong>Claude</strong>, <strong>ChatGPT</strong>, <strong>Cursor</strong>, or any AI assistant.
          Your AI will build what you need.
        </p>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 1:</strong> Copy a prompt below
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 2:</strong> Paste into your AI assistant
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 3:</strong> AI builds it for you
          </div>
        </div>
      </div>

      {/* Quick Start Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Start Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Common real-time scanning tasks you can accomplish with a single prompt.
        </p>

        <div className="space-y-6">
          {/* Live Progress Dashboard */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📊</span> Build a Live Scan Dashboard
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Watch results stream in real-time with a beautiful progress UI.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build a live scan progress dashboard:

1. Start session: POST /api/sessions with target
2. Show session status and live progress bar
3. Poll /api/sessions/{sessionId}?progress=true every 2 seconds
4. Display: "23/140+ tools complete (32%)"
5. As tools complete, add their results to a live list:
   - Tool name, duration, issue count
   - Color-code by severity (red=critical, orange=high, etc.)
6. When status is "completed", show final summary
7. If any tools failed, show refund credits received

Use smooth animations for new results appearing.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build a live scan progress dashboard:

1. Start session: POST /api/sessions with target
2. Show session status and live progress bar
3. Poll /api/sessions/{sessionId}?progress=true every 2 seconds
4. Display: "23/140+ tools complete (32%)"
5. As tools complete, add their results to a live list:
   - Tool name, duration, issue count
   - Color-code by severity (red=critical, orange=high, etc.)
6. When status is "completed", show final summary
7. If any tools failed, show refund credits received

Use smooth animations for new results appearing.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Polling Flow</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`// 1. Start session
const response = await fetch('/api/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    target: { url: 'https://myapp.com' },
    categories: ['security', 'code-quality']
  })
});
const { sessionId } = await response.json();

// 2. Poll for progress (lightweight)
const poll = async () => {
  const res = await fetch(\`/api/sessions/\${sessionId}?progress=true\`);
  const { status, progress } = await res.json();

  console.log(\`\${progress.completed}/\${progress.total} (\${progress.percentage}%)\`);

  if (status !== 'completed') {
    setTimeout(poll, 2000);
  }
};
poll();`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Incremental Updates */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🔄</span> Get Only New Results (Efficient Polling)
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Only fetch results that came in since your last poll - minimal bandwidth.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build an efficient real-time results feed:

1. Start session: POST /api/sessions
2. Store the current timestamp
3. Every 2 seconds, call GET /api/sessions/{sessionId}?since={timestamp}
4. This returns ONLY tool reports added since that timestamp
5. Append new reports to your results list
6. Update timestamp to now for next poll
7. Stop polling when status is "completed"

This is much more efficient than fetching the full report each time.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build an efficient real-time results feed:

1. Start session: POST /api/sessions
2. Store the current timestamp
3. Every 2 seconds, call GET /api/sessions/{sessionId}?since={timestamp}
4. This returns ONLY tool reports added since that timestamp
5. Append new reports to your results list
6. Update timestamp to now for next poll
7. Stop polling when status is "completed"

This is much more efficient than fetching the full report each time.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Incremental Polling</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`let lastPoll = new Date().toISOString();
const allReports = [];

const pollForNewReports = async (sessionId) => {
  const res = await fetch(
    \`/api/sessions/\${sessionId}?since=\${encodeURIComponent(lastPoll)}\`
  );
  const { newReports, status } = await res.json();

  // Add new reports to our list
  allReports.push(...newReports);
  lastPoll = new Date().toISOString();

  // Show new reports
  newReports.forEach(report => {
    console.log(\`✓ \${report.toolName}: \${report.findingsCount} findings\`);
  });

  if (status !== 'completed') {
    setTimeout(() => pollForNewReports(sessionId), 2000);
  }
};`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* CI/CD with Live Progress */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🚀</span> CI/CD with Live Console Output
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Show scan progress in your CI/CD logs as each tool completes.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a CI/CD script with live console output:

1. Start session: POST /api/sessions
2. Print "[SCAN] Starting security scan..."
3. Poll every 5 seconds
4. As each tool completes, print:
   "[45/140+] ✓ eslint-security: 3 findings (0.8s)"
   "[45/140+] ✓ semgrep: 1 critical, 2 high (2.3s)"
5. If a tool fails, print warning but continue
6. When done, print summary table:
   - Total findings by severity
   - Credits refunded for failed tools
7. Exit code 1 if critical > 0 or high > 5

Use ANSI colors for pretty console output.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a CI/CD script with live console output:

1. Start session: POST /api/sessions
2. Print "[SCAN] Starting security scan..."
3. Poll every 5 seconds
4. As each tool completes, print:
   "[45/140+] ✓ eslint-security: 3 findings (0.8s)"
   "[45/140+] ✓ semgrep: 1 critical, 2 high (2.3s)"
5. If a tool fails, print warning but continue
6. When done, print summary table:
   - Total findings by severity
   - Credits refunded for failed tools
7. Exit code 1 if critical > 0 or high > 5

Use ANSI colors for pretty console output.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>

          {/* React Hook */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>⚛️</span> React Hook for Live Sessions
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                A custom React hook that manages the whole polling lifecycle.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a useSessionPolling React hook:

const { session, progress, isComplete, error, startSession } = useSessionPolling();

Features:
1. startSession(target) - starts a new session
2. Automatically polls for progress every 2 seconds
3. Stops polling when complete
4. Returns:
   - session: full session data
   - progress: { completed, total, percentage }
   - isComplete: boolean
   - error: any error that occurred
5. Cleanup: stops polling when component unmounts

Use React Query or SWR for caching.
My stack: React with TypeScript`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a useSessionPolling React hook:

const { session, progress, isComplete, error, startSession } = useSessionPolling();

Features:
1. startSession(target) - starts a new session
2. Automatically polls for progress every 2 seconds
3. Stops polling when complete
4. Returns:
   - session: full session data
   - progress: { completed, total, percentage }
   - isComplete: boolean
   - error: any error that occurred
5. Cleanup: stops polling when component unmounts

Use React Query or SWR for caching.
My stack: React with TypeScript`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Example Implementation</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`import { useState, useEffect, useCallback } from 'react';

export function useSessionPolling(options = {}) {
  const { pollInterval = 2000, autoStart = false } = options;

  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = useCallback(async (target) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      const res = await fetch(\`/api/sessions/\${sessionId}\`);
      const data = await res.json();
      setSession(data);
      setIsLoading(false);

      if (data.status !== 'completed') {
        setTimeout(poll, pollInterval);
      }
    };
    poll();
  }, [sessionId, pollInterval]);

  return {
    session,
    progress: session?.progress,
    isComplete: session?.status === 'completed',
    isLoading,
    error,
    startSession
  };
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Start Session - Technical Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Start a Session</h2>

        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Start a Streaming Audit</h3>
            <p className="text-slate-400 text-sm mb-3">
              Begin a new scan session. Results stream in as each tool completes.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Add a streaming scan to my app:

1. POST to /api/sessions with:
   - target: { url: "https://myapp.com" } or { directory: "/path/to/code" }
   - categories: ['security', 'code-quality'] (optional)
   - enableIntelligence: true (for AI-powered analysis)
2. Returns sessionId immediately
3. Poll /api/sessions/{sessionId} for live results
4. Show results as they come in

Handle 402 error for insufficient credits.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Add a streaming scan to my app:

1. POST to /api/sessions with:
   - target: { url: "https://myapp.com" } or { directory: "/path/to/code" }
   - categories: ['security', 'code-quality'] (optional)
   - enableIntelligence: true (for AI-powered analysis)
2. Returns sessionId immediately
3. Poll /api/sessions/{sessionId} for live results
4. Show results as they come in

Handle 402 error for insufficient credits.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800" open>
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Reference
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
                  <code className="text-sm">/api/sessions</code>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Start a new streaming audit session. Returns immediately with session ID and polling URLs.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Field</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Required</th>
                      <th className="text-left py-2 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>target</code></td>
                      <td className="py-2 px-2">object</td>
                      <td className="py-2 px-2">Yes</td>
                      <td className="py-2 px-2 text-muted-foreground">What to scan (see below)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>target.url</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">*</td>
                      <td className="py-2 px-2 text-muted-foreground">Live URL to scan</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>target.urls</code></td>
                      <td className="py-2 px-2">string[]</td>
                      <td className="py-2 px-2">*</td>
                      <td className="py-2 px-2 text-muted-foreground">Multiple URLs to scan</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>target.directory</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">*</td>
                      <td className="py-2 px-2 text-muted-foreground">Local directory path</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>categories</code></td>
                      <td className="py-2 px-2">string[]</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">security, code-quality, accessibility, performance</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>tools</code></td>
                      <td className="py-2 px-2">string[]</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Specific tools to run (overrides categories)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>excludeTools</code></td>
                      <td className="py-2 px-2">string[]</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Tools to skip</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>enableIntelligence</code></td>
                      <td className="py-2 px-2">boolean</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Generate AI analysis (default: true)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>timeout</code></td>
                      <td className="py-2 px-2">number</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Max ms per tool (default: 300000)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2"><code>maxConcurrent</code></td>
                      <td className="py-2 px-2">number</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Parallel tools (default: 5)</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">* One of url, urls, or directory is required</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`curl -X POST https://bugrit.com/api/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target": {
      "url": "https://myapp.com"
    },
    "categories": ["security", "code-quality"],
    "enableIntelligence": true
  }'`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response (202 Accepted)</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "sessionId": "sess-abc123xyz",
  "scanId": "scan-1705834200-a1b2c3",
  "status": "started",
  "message": "Audit session started. Poll /api/sessions/{sessionId} for real-time updates.",
  "pollUrls": {
    "full": "/api/sessions/sess-abc123xyz",
    "progress": "/api/sessions/sess-abc123xyz?progress=true",
    "newReports": "/api/sessions/sess-abc123xyz?since={timestamp}"
  }
}`}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Poll Session */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Poll Session</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Get Real-Time Results</h3>
            <p className="text-slate-400 text-sm mb-3">
              Poll for live updates. Three modes: full report, progress only, or incremental.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build a polling system with three modes:

1. Progress only (lightweight):
   GET /api/sessions/{id}?progress=true
   → Returns just { status, progress: { completed, total, percentage } }
   → Use for progress bars, minimal bandwidth

2. Incremental updates:
   GET /api/sessions/{id}?since={ISO_timestamp}
   → Returns only NEW tool reports since that time
   → Most efficient for live feeds

3. Full report:
   GET /api/sessions/{id}
   → Returns everything including all tool reports
   → Use when you need the complete picture

Start with progress-only, switch to incremental for results.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Build a polling system with three modes:

1. Progress only (lightweight):
   GET /api/sessions/{id}?progress=true
   → Returns just { status, progress: { completed, total, percentage } }
   → Use for progress bars, minimal bandwidth

2. Incremental updates:
   GET /api/sessions/{id}?since={ISO_timestamp}
   → Returns only NEW tool reports since that time
   → Most efficient for live feeds

3. Full report:
   GET /api/sessions/{id}
   → Returns everything including all tool reports
   → Use when you need the complete picture

Start with progress-only, switch to incremental for results.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Details (for developers)
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/sessions/:sessionId</code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Parameter</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>progress</code></td>
                      <td className="py-2 px-2">boolean</td>
                      <td className="py-2 px-2 text-muted-foreground">If true, returns only status and progress counts</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2"><code>since</code></td>
                      <td className="py-2 px-2">ISO timestamp</td>
                      <td className="py-2 px-2 text-muted-foreground">Returns only reports added after this time</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Full Response</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "sessionId": "sess-abc123xyz",
  "userId": "user-123",
  "status": "running",
  "progress": {
    "total": 140+,
    "completed": 23,
    "failed": 1,
    "skipped": 2,
    "running": 5,
    "pending": 40,
    "percentage": 32
  },
  "toolReports": {
    "eslint-security": {
      "toolName": "eslint-security",
      "category": "security",
      "status": "completed",
      "duration": 1234,
      "findingsCount": 3,
      "result": { ... },
      "completedAt": "2026-01-22T10:30:15Z"
    },
    "semgrep": {
      "toolName": "semgrep",
      "category": "security",
      "status": "completed",
      "duration": 2567,
      "findingsCount": 5,
      "result": { ... },
      "completedAt": "2026-01-22T10:30:18Z"
    }
  },
  "summary": {
    "totalFindings": 8,
    "bySeverity": {
      "critical": 1,
      "high": 2,
      "medium": 3,
      "low": 2
    },
    "byCategory": {
      "security": 5,
      "code-quality": 3
    },
    "toolsRun": 23,
    "toolsSkipped": 2,
    "toolsFailed": 1
  },
  "lastUpdated": "2026-01-22T10:30:18Z"
}`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Progress-Only Response</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "sessionId": "sess-abc123xyz",
  "status": "running",
  "progress": {
    "total": 140+,
    "completed": 23,
    "failed": 1,
    "skipped": 2,
    "running": 5,
    "pending": 40,
    "percentage": 32
  },
  "lastUpdated": "2026-01-22T10:30:18Z"
}`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Incremental Response</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "sessionId": "sess-abc123xyz",
  "status": "running",
  "progress": { ... },
  "newReports": [
    {
      "toolName": "trivy",
      "category": "security",
      "status": "completed",
      "duration": 1890,
      "findingsCount": 2,
      "result": { ... },
      "completedAt": "2026-01-22T10:30:20Z"
    }
  ],
  "lastUpdated": "2026-01-22T10:30:20Z"
}`}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* List Sessions */}
      <section>
        <h2 className="text-2xl font-bold mb-4">List Sessions</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">View Session History</h3>
            <p className="text-slate-400 text-sm mb-3">
              Get a list of your recent scan sessions.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a session history component:

1. Fetch GET /api/sessions?limit=20
2. Display as table:
   - Created date
   - Status badge (running=blue, completed=green, failed=red)
   - Progress (45/140+ tools)
   - Issue summary (2 critical, 5 high)
3. Click row to view full session
4. Running sessions: show progress bar + live badge

My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Create a session history component:

1. Fetch GET /api/sessions?limit=20
2. Display as table:
   - Created date
   - Status badge (running=blue, completed=green, failed=red)
   - Progress (45/140+ tools)
   - Issue summary (2 critical, 5 high)
3. Click row to view full session
4. Running sessions: show progress bar + live badge

My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Details (for developers)
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/sessions</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Parameter</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2"><code>limit</code></td>
                      <td className="py-2 px-2">integer</td>
                      <td className="py-2 px-2 text-muted-foreground">Max results (default: 20)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "sessions": [
    {
      "sessionId": "sess-abc123xyz",
      "status": "completed",
      "progress": { "total": 140+, "completed": 140+, "percentage": 100 },
      "createdAt": "2026-01-22T10:25:00Z",
      "completedAt": "2026-01-22T10:30:47Z"
    }
  ],
  "total": 1
}`}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Credit Refunds */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Automatic Credit Refunds</h2>
        <div className="p-6 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-2 border-amber-500/40 rounded-xl">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span>💰</span> You Only Pay for Results
          </h3>
          <p className="text-muted-foreground mb-4">
            If a tool fails, times out, or gets skipped, <strong>you automatically get those credits back</strong>.
            Check the <code className="bg-muted px-1 rounded">refund</code> field in your completed session.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <pre className="text-sm">{`// In your completed session response:
{
  "status": "completed",
  "refund": {
    "refundedCredits": 150,
    "toolsRefunded": ["tool-that-failed", "tool-that-timed-out"],
    "newBalance": 4850
  }
}`}</pre>
          </div>
        </div>
      </section>

      {/* Session Status Values */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Session Status Values</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>initializing</code></td>
              <td className="py-2 px-2 text-muted-foreground">Session created, tools being prepared</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>running</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tools actively running, results streaming in</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>completed</code></td>
              <td className="py-2 px-2 text-muted-foreground">All tools finished successfully</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>partial</code></td>
              <td className="py-2 px-2 text-muted-foreground">Completed with some tools failed/skipped</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>failed</code></td>
              <td className="py-2 px-2 text-muted-foreground">Session failed (check error field)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Tool Report Status Values */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Tool Report Status Values</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>pending</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tool queued, waiting to run</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>running</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tool currently executing</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>completed</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tool finished with results</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>failed</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tool encountered an error (credits refunded)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>skipped</code></td>
              <td className="py-2 px-2 text-muted-foreground">Tool skipped (circuit breaker open, etc.)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Migration Guide */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Migrating from Scans API</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Upgrade Your Integration</h3>
            <p className="text-slate-400 text-sm mb-3">
              Switch from the old Scans API to the new Sessions API.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Migrate my existing scan integration to use Sessions:

Old code uses:
- POST /api/v1/scans to start
- GET /api/v1/scans/{id} to poll

Change to:
- POST /api/sessions to start (note: different request body)
- GET /api/sessions/{id}?progress=true for quick polls
- GET /api/sessions/{id}?since={timestamp} for incremental results

Key differences:
1. Request body uses "target" object instead of flat fields
2. Response has "sessionId" not "scanId"
3. Real-time progress available immediately
4. Automatic credit refunds for failures

Keep backward compatibility if needed.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Sessions API at https://bugrit.com/docs/api-reference/sessions

Migrate my existing scan integration to use Sessions:

Old code uses:
- POST /api/v1/scans to start
- GET /api/v1/scans/{id} to poll

Change to:
- POST /api/sessions to start (note: different request body)
- GET /api/sessions/{id}?progress=true for quick polls
- GET /api/sessions/{id}?since={timestamp} for incremental results

Key differences:
1. Request body uses "target" object instead of flat fields
2. Response has "sessionId" not "scanId"
3. Real-time progress available immediately
4. Automatic credit refunds for failures

Keep backward compatibility if needed.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

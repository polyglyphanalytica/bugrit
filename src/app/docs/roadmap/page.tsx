export default function RoadmapPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Roadmap</h1>
        <p className="text-lg text-muted-foreground">
          Upcoming features and integrations planned for Bugrit.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Q1 2024</span>
              <h4 className="font-semibold">CLI Tool</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Command-line interface for managing projects, triggering scans, and viewing results
              directly from your terminal.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Q1 2024</span>
              <h4 className="font-semibold">JavaScript/TypeScript SDK</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Official SDK for Node.js with TypeScript support for triggering scans, polling status,
              and retrieving reports programmatically.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Q2 2024</span>
              <h4 className="font-semibold">Webhooks</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Real-time notifications for scan completions, critical findings, and threshold breaches.
              Integrate with Slack, Discord, PagerDuty, and custom endpoints.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Q2 2024</span>
              <h4 className="font-semibold">Slack Integration</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Native Slack app with daily scan digests, critical finding alerts, and slash commands
              for quick status checks.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Q3 2024</span>
              <h4 className="font-semibold">Python SDK</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Official Python SDK for triggering scans and retrieving reports programmatically.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Q3 2024</span>
              <h4 className="font-semibold">Jira Integration</h4>
            </div>
            <p className="text-muted-foreground text-sm">
              Automatic issue creation for critical findings, with finding history linked to Jira tickets.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Feature Requests</h2>
        <p className="text-muted-foreground">
          Have a feature request? Let us know at{' '}
          <a href="mailto:feedback@bugrit.com" className="text-primary hover:underline">
            feedback@bugrit.com
          </a>{' '}
          or open an issue on our{' '}
          <a href="https://github.com/buggered/feedback" className="text-primary hover:underline">
            feedback repository
          </a>.
        </p>
      </section>
    </div>
  );
}

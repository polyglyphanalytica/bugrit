export default function RateLimitsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Rate Limits</h1>
        <p className="text-lg text-muted-foreground">
          API rate limits ensure fair usage and platform stability.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Rate Limits by Tier</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Tier</th>
              <th className="text-left py-3 px-4">Requests/Minute</th>
              <th className="text-left py-3 px-4">Scans/Month</th>
              <th className="text-left py-3 px-4">Projects</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 px-4 font-medium">Starter</td>
              <td className="py-3 px-4">10</td>
              <td className="py-3 px-4">10</td>
              <td className="py-3 px-4">2</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4 font-medium">Pro</td>
              <td className="py-3 px-4">60</td>
              <td className="py-3 px-4">50</td>
              <td className="py-3 px-4">5</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-medium">Business</td>
              <td className="py-3 px-4">300</td>
              <td className="py-3 px-4">200</td>
              <td className="py-3 px-4">20</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Rate Limit Headers</h2>
        <p className="text-muted-foreground mb-4">
          Every API response includes rate limit information in the headers:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Header</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>X-RateLimit-Limit</code></td>
              <td className="py-2 px-2 text-muted-foreground">Maximum requests per window</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>X-RateLimit-Remaining</code></td>
              <td className="py-2 px-2 text-muted-foreground">Remaining requests in current window</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>X-RateLimit-Reset</code></td>
              <td className="py-2 px-2 text-muted-foreground">Unix timestamp when window resets</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>X-RateLimit-Tier</code></td>
              <td className="py-2 px-2 text-muted-foreground">Your subscription tier</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Rate Limit Exceeded</h2>
        <p className="text-muted-foreground mb-4">
          When you exceed the rate limit, the API returns a 429 status:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705318800
Retry-After: 45

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Limit: 60 requests per minute (pro tier)",
    "details": {
      "retryAfter": 45,
      "tier": "pro",
      "limit": 60
    }
  }
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Implement exponential backoff when receiving 429 errors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Batch API requests where possible instead of individual calls</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Cache GET responses where appropriate</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Monitor the X-RateLimit-Remaining header proactively</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

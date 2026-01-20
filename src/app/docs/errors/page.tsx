export default function ErrorCodesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Error Codes</h1>
        <p className="text-lg text-muted-foreground">
          Reference for API error codes and how to handle them.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Error Response Format</h2>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }  // Optional additional info
  }
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Error Codes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">HTTP</th>
              <th className="text-left py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 px-4"><code>INVALID_API_KEY</code></td>
              <td className="py-3 px-4">401</td>
              <td className="py-3 px-4 text-muted-foreground">API key missing or invalid</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4"><code>EXPIRED_API_KEY</code></td>
              <td className="py-3 px-4">401</td>
              <td className="py-3 px-4 text-muted-foreground">API key has expired</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4"><code>FORBIDDEN</code></td>
              <td className="py-3 px-4">403</td>
              <td className="py-3 px-4 text-muted-foreground">Missing permission or access denied</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4"><code>NOT_FOUND</code></td>
              <td className="py-3 px-4">404</td>
              <td className="py-3 px-4 text-muted-foreground">Resource not found</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4"><code>VALIDATION_ERROR</code></td>
              <td className="py-3 px-4">422</td>
              <td className="py-3 px-4 text-muted-foreground">Invalid request data</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4"><code>RATE_LIMITED</code></td>
              <td className="py-3 px-4">429</td>
              <td className="py-3 px-4 text-muted-foreground">Rate limit exceeded</td>
            </tr>
            <tr>
              <td className="py-3 px-4"><code>INTERNAL_ERROR</code></td>
              <td className="py-3 px-4">500</td>
              <td className="py-3 px-4 text-muted-foreground">Server error</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

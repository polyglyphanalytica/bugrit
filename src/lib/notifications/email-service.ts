// Email Notification Service using Resend

import {
  NotificationPayload,
  NotificationResult,
  EmailTemplate,
  TestResultNotification,
  UptimeNotification,
} from './types';

export class EmailNotificationService {
  private apiKey: string | undefined;
  private fromAddress: string;
  private fromName: string;

  constructor(config?: { apiKey?: string; fromAddress?: string; fromName?: string }) {
    this.apiKey = config?.apiKey || process.env.RESEND_API_KEY;
    this.fromAddress = config?.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'noreply@buggered.app';
    this.fromName = config?.fromName || 'Bugrit Testing';
  }

  async send(
    recipients: string[],
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    if (!this.apiKey) {
      console.warn('Email notifications disabled: RESEND_API_KEY not configured');
      return {
        channel: 'email',
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const template = this.buildTemplate(payload);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromAddress}>`,
          to: recipients,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      const data = await response.json();

      return {
        channel: 'email',
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Email notification error:', errorMessage);

      return {
        channel: 'email',
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildTemplate(payload: NotificationPayload): EmailTemplate {
    switch (payload.type) {
      case 'test_result':
        return this.buildTestResultTemplate(payload);
      case 'uptime':
        return this.buildUptimeTemplate(payload);
      default:
        return this.buildGenericTemplate(payload);
    }
  }

  private buildTestResultTemplate(payload: NotificationPayload): EmailTemplate {
    const data = payload.data as TestResultNotification;
    const isSuccess = data.status === 'passed';
    const statusEmoji = isSuccess ? '✅' : data.status === 'partial' ? '⚠️' : '❌';
    const statusText = isSuccess ? 'All Tests Passed' : data.status === 'partial' ? 'Some Tests Failed' : 'Tests Failed';

    const subject = `${statusEmoji} ${payload.applicationName}: ${statusText}`;

    const failedTestsHtml = data.failedTests?.length
      ? `
        <h3 style="color: #dc2626;">Failed Tests:</h3>
        <ul style="padding-left: 20px;">
          ${data.failedTests.map(t => `
            <li style="margin-bottom: 10px;">
              <strong>${t.name}</strong><br/>
              <span style="color: #666;">${t.error}</span>
            </li>
          `).join('')}
        </ul>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
            .status { font-size: 48px; margin-bottom: 10px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; padding: 20px 0; }
            .stat { text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-label { font-size: 12px; color: #666; }
            .passed { color: #22c55e; }
            .failed { color: #dc2626; }
            .skipped { color: #eab308; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
            .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="status">${statusEmoji}</div>
              <h1 style="margin: 0;">${statusText}</h1>
              <p style="color: #666; margin-top: 5px;">${payload.applicationName}</p>
            </div>

            <div class="summary">
              <div class="stat">
                <div class="stat-value">${data.summary.total}</div>
                <div class="stat-label">Total</div>
              </div>
              <div class="stat">
                <div class="stat-value passed">${data.summary.passed}</div>
                <div class="stat-label">Passed</div>
              </div>
              <div class="stat">
                <div class="stat-value failed">${data.summary.failed}</div>
                <div class="stat-label">Failed</div>
              </div>
              <div class="stat">
                <div class="stat-value skipped">${data.summary.skipped}</div>
                <div class="stat-label">Skipped</div>
              </div>
            </div>

            <p><strong>Duration:</strong> ${(data.summary.duration / 1000).toFixed(2)}s</p>
            ${data.browser ? `<p><strong>Browser:</strong> ${data.browser}</p>` : ''}
            ${data.platform ? `<p><strong>Platform:</strong> ${data.platform}</p>` : ''}
            ${data.buildId ? `<p><strong>Build:</strong> ${data.buildId}</p>` : ''}
            ${data.branch ? `<p><strong>Branch:</strong> ${data.branch}</p>` : ''}

            ${failedTestsHtml}

            ${data.reportUrl ? `<a href="${data.reportUrl}" class="btn">View Full Report</a>` : ''}

            <div class="footer">
              <p>Sent by Bugrit Testing Platform</p>
              <p>${payload.timestamp.toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${statusText} - ${payload.applicationName}

Summary:
- Total: ${data.summary.total}
- Passed: ${data.summary.passed}
- Failed: ${data.summary.failed}
- Skipped: ${data.summary.skipped}
- Duration: ${(data.summary.duration / 1000).toFixed(2)}s

${data.failedTests?.length ? `Failed Tests:\n${data.failedTests.map(t => `- ${t.name}: ${t.error}`).join('\n')}` : ''}

${data.reportUrl ? `View report: ${data.reportUrl}` : ''}
    `.trim();

    return { subject, html, text };
  }

  private buildUptimeTemplate(payload: NotificationPayload): EmailTemplate {
    const data = payload.data as UptimeNotification;
    const isUp = data.status === 'up';
    const statusEmoji = isUp ? '✅' : data.status === 'degraded' ? '⚠️' : '🔴';
    const statusText = isUp ? 'Back Online' : data.status === 'degraded' ? 'Degraded Performance' : 'Down';

    const subject = `${statusEmoji} ${data.endpointName}: ${statusText}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .alert-success { background: #dcfce7; color: #166534; }
            .alert-warning { background: #fef9c3; color: #854d0e; }
            .alert-danger { background: #fee2e2; color: #991b1b; }
            .details { background: #f9fafb; padding: 20px; border-radius: 8px; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert ${isUp ? 'alert-success' : data.status === 'degraded' ? 'alert-warning' : 'alert-danger'}">
              <div style="font-size: 32px;">${statusEmoji}</div>
              <h2>${data.endpointName} is ${statusText}</h2>
            </div>

            <div class="details">
              <p><strong>URL:</strong> ${data.endpointUrl}</p>
              ${data.responseTime ? `<p><strong>Response Time:</strong> ${data.responseTime}ms</p>` : ''}
              ${data.statusCode ? `<p><strong>Status Code:</strong> ${data.statusCode}</p>` : ''}
              ${data.error ? `<p><strong>Error:</strong> ${data.error}</p>` : ''}
              ${data.downSince ? `<p><strong>Down Since:</strong> ${data.downSince.toISOString()}</p>` : ''}
            </div>

            <div class="footer">
              <p>Application: ${payload.applicationName}</p>
              <p>${payload.timestamp.toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${data.endpointName} is ${statusText}

URL: ${data.endpointUrl}
${data.responseTime ? `Response Time: ${data.responseTime}ms` : ''}
${data.statusCode ? `Status Code: ${data.statusCode}` : ''}
${data.error ? `Error: ${data.error}` : ''}
${data.downSince ? `Down Since: ${data.downSince.toISOString()}` : ''}

Application: ${payload.applicationName}
    `.trim();

    return { subject, html, text };
  }

  private buildGenericTemplate(payload: NotificationPayload): EmailTemplate {
    const subject = `Bugrit: ${payload.type} notification for ${payload.applicationName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>${payload.type} Notification</h1>
          <p>Application: ${payload.applicationName}</p>
          <pre>${JSON.stringify(payload.data, null, 2)}</pre>
          <p>Time: ${payload.timestamp.toISOString()}</p>
        </body>
      </html>
    `;

    const text = `
${payload.type} Notification
Application: ${payload.applicationName}
Data: ${JSON.stringify(payload.data, null, 2)}
Time: ${payload.timestamp.toISOString()}
    `.trim();

    return { subject, html, text };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Email Notification Service using Resend SDK

import { Resend } from 'resend';
import {
  NotificationPayload,
  NotificationResult,
  EmailTemplate,
  TestResultNotification,
  UptimeNotification,
} from './types';

export class EmailNotificationService {
  private resend: Resend | null;
  private fromAddress: string;
  private fromName: string;

  constructor(config?: { apiKey?: string; fromAddress?: string; fromName?: string }) {
    const apiKey = config?.apiKey || process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = config?.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'noreply@bugrit.com';
    this.fromName = config?.fromName || 'Bugrit Testing';
  }

  async send(
    recipients: string[],
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    if (!this.resend) {
      console.warn('Email notifications disabled: RESEND_API_KEY not configured');
      return {
        channel: 'email',
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const template = this.buildTemplate(payload);

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: recipients,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        channel: 'email',
        success: true,
        messageId: data?.id,
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

// ============================================================================
// Standalone email functions for use by the notification dispatcher
// ============================================================================

const EMAIL_FROM = process.env.EMAIL_FROM_ADDRESS || 'noreply@bugrit.com';
const EMAIL_FROM_NAME = 'Bugrit';

// Lazy-initialized singleton — avoids creating the client if no emails are sent
let _resend: Resend | null | undefined;
function getResendClient(): Resend | null {
  if (_resend !== undefined) return _resend;
  const key = process.env.RESEND_API_KEY;
  _resend = key ? new Resend(key) : null;
  return _resend;
}

/**
 * Send a single email via Resend SDK
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email not configured: RESEND_API_KEY missing');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Email send failed' };
  }
}

/**
 * Build scan completed email
 */
export function buildScanCompletedEmail(params: {
  applicationName: string;
  totalFindings: number;
  critical: number;
  high: number;
  vibeScore?: number;
  reportUrl: string;
}): { subject: string; html: string; text: string } {
  const hasCritical = params.critical > 0;
  const emoji = hasCritical ? '⚠️' : params.totalFindings > 0 ? '📋' : '✅';

  const subject = hasCritical
    ? `${emoji} Scan Complete: ${params.critical} critical issues - ${params.applicationName}`
    : `${emoji} Scan Complete: ${params.totalFindings} findings - ${params.applicationName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .emoji { font-size: 48px; }
          h1 { margin: 15px 0 5px; }
          .subtitle { color: #666; }
          .stats { display: flex; justify-content: center; gap: 20px; margin: 30px 0; flex-wrap: wrap; }
          .stat { text-align: center; padding: 15px 25px; background: #f5f5f5; border-radius: 8px; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
          .critical { color: #dc2626; }
          .high { color: #ea580c; }
          .vibe { color: #8b5cf6; }
          .btn { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 20px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="emoji">${emoji}</div>
          <h1>Scan Complete</h1>
          <p class="subtitle">${params.applicationName}</p>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${params.totalFindings}</div>
            <div class="stat-label">Total Findings</div>
          </div>
          <div class="stat">
            <div class="stat-value critical">${params.critical}</div>
            <div class="stat-label">Critical</div>
          </div>
          <div class="stat">
            <div class="stat-value high">${params.high}</div>
            <div class="stat-label">High</div>
          </div>
          ${params.vibeScore !== undefined ? `
          <div class="stat">
            <div class="stat-value vibe">${params.vibeScore}</div>
            <div class="stat-label">Vibe Score</div>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center;">
          <a href="${params.reportUrl}" class="btn">View Full Report</a>
        </div>

        <div class="footer">
          <p>Bugrit - A vibe coder's best friend</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Scan Complete - ${params.applicationName}

Total Findings: ${params.totalFindings}
Critical: ${params.critical}
High: ${params.high}
${params.vibeScore !== undefined ? `Vibe Score: ${params.vibeScore}/100` : ''}

View report: ${params.reportUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * Build scan failed email
 */
export function buildScanFailedEmail(params: {
  applicationName: string;
  error: string;
  scanUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `❌ Scan Failed - ${params.applicationName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .emoji { font-size: 48px; }
          h1 { margin: 15px 0 5px; color: #dc2626; }
          .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .error-label { font-size: 12px; color: #991b1b; font-weight: 500; margin-bottom: 5px; }
          .error-message { color: #991b1b; }
          .btn { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="emoji">❌</div>
          <h1>Scan Failed</h1>
          <p style="color: #666;">${params.applicationName}</p>
        </div>

        <div class="error-box">
          <div class="error-label">ERROR</div>
          <div class="error-message">${params.error}</div>
        </div>

        <div style="text-align: center;">
          <a href="${params.scanUrl}" class="btn">View Details</a>
        </div>

        <div class="footer">
          <p>Bugrit - A vibe coder's best friend</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Scan Failed - ${params.applicationName}

Error: ${params.error}

View details: ${params.scanUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * Build generic notification email
 */
export function buildGenericEmail(params: {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Bugrit: ${params.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .btn { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${params.title}</h1>
        </div>

        <div class="content">
          <p>${params.message}</p>

          ${params.actionUrl ? `
          <div style="text-align: center; margin-top: 30px;">
            <a href="${params.actionUrl}" class="btn">${params.actionLabel || 'View Details'}</a>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Bugrit - A vibe coder's best friend</p>
        </div>
      </body>
    </html>
  `;

  const text = `
${params.title}

${params.message}

${params.actionUrl ? `${params.actionLabel || 'View details'}: ${params.actionUrl}` : ''}
  `.trim();

  return { subject, html, text };
}

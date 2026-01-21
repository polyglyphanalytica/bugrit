// Microsoft Teams Notification Service

import { NotificationPayload, NotificationResult, ScanNotification } from './types';

export class TeamsNotificationService {
  /**
   * Send notification to Microsoft Teams webhook
   */
  async send(webhookUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const card = this.buildAdaptiveCard(payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        return {
          channel: 'teams',
          success: false,
          error: `Teams API error: ${response.status}`,
        };
      }

      return {
        channel: 'teams',
        success: true,
      };
    } catch (error) {
      return {
        channel: 'teams',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildAdaptiveCard(payload: NotificationPayload): Record<string, unknown> {
    switch (payload.type) {
      case 'scan_completed':
      case 'scan_started':
      case 'scan_failed':
        return this.buildScanCard(payload);

      case 'test_result':
        return this.buildTestResultCard(payload);

      case 'uptime':
        return this.buildUptimeCard(payload);

      default:
        return this.buildGenericCard(payload);
    }
  }

  private buildScanCard(payload: NotificationPayload): Record<string, unknown> {
    const data = payload.data as ScanNotification;

    if (payload.type === 'scan_started') {
      return {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        themeColor: '0099FF',
        summary: 'Security Scan Started',
        sections: [
          {
            activityTitle: '🔍 Security Scan Started',
            facts: [
              { name: 'Project', value: payload.applicationName },
              { name: 'Target', value: data.target.value },
              { name: 'Type', value: data.target.type },
            ],
          },
        ],
      };
    }

    if (payload.type === 'scan_failed') {
      return {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        themeColor: 'FF0000',
        summary: 'Security Scan Failed',
        sections: [
          {
            activityTitle: '❌ Security Scan Failed',
            facts: [
              { name: 'Project', value: payload.applicationName },
              { name: 'Target', value: data.target.value },
              { name: 'Error', value: data.error || 'Unknown error' },
            ],
          },
        ],
      };
    }

    // scan_completed
    const summary = data.summary!;
    const criticals = summary.bySeverity.critical;
    const highs = summary.bySeverity.high;
    const mediums = summary.bySeverity.medium;
    const lows = summary.bySeverity.low;

    let themeColor = '00FF00';
    let title = '✅ Security Scan Passed';
    if (criticals > 0 || highs > 0) {
      themeColor = 'FF0000';
      title = '🚨 Critical Issues Found';
    } else if (mediums > 0) {
      themeColor = 'FFAA00';
      title = '⚠️ Warnings Found';
    }

    const card: Record<string, unknown> = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor,
      summary: `Security Scan: ${payload.applicationName}`,
      sections: [
        {
          activityTitle: title,
          facts: [
            { name: 'Project', value: payload.applicationName },
            { name: '🔴 Critical', value: String(criticals) },
            { name: '🟠 High', value: String(highs) },
            { name: '🟡 Medium', value: String(mediums) },
            { name: '🔵 Low', value: String(lows) },
            { name: '📊 Total', value: String(summary.totalFindings) },
            { name: 'Duration', value: `${Math.round(summary.duration / 1000)}s` },
            { name: 'Tools Run', value: summary.toolsRun.join(', ') },
          ],
        },
      ],
    };

    if (data.topPriorities?.length) {
      (card.sections as Array<{ activityTitle: string; facts: Array<{ name: string; value: string }> }>)[0].facts.push({
        name: 'Top Priority',
        value: data.topPriorities[0].title,
      });
    }

    if (data.reportUrl) {
      card.potentialAction = [
        {
          '@type': 'OpenUri',
          name: 'View Full Report',
          targets: [{ os: 'default', uri: data.reportUrl }],
        },
      ];
    }

    return card;
  }

  private buildTestResultCard(payload: NotificationPayload): Record<string, unknown> {
    const data = payload.data as { status: string; summary: { total: number; passed: number; failed: number; duration: number }; reportUrl?: string };
    const themeColor = data.status === 'passed' ? '00FF00' : data.status === 'partial' ? 'FFAA00' : 'FF0000';
    const emoji = data.status === 'passed' ? '✅' : data.status === 'partial' ? '⚠️' : '❌';

    const card: Record<string, unknown> = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor,
      summary: `Test Results: ${payload.applicationName}`,
      sections: [
        {
          activityTitle: `${emoji} Test Results: ${data.status.toUpperCase()}`,
          facts: [
            { name: 'Project', value: payload.applicationName },
            { name: 'Total Tests', value: String(data.summary.total) },
            { name: 'Passed', value: String(data.summary.passed) },
            { name: 'Failed', value: String(data.summary.failed) },
            { name: 'Duration', value: `${Math.round(data.summary.duration / 1000)}s` },
          ],
        },
      ],
    };

    if (data.reportUrl) {
      card.potentialAction = [
        {
          '@type': 'OpenUri',
          name: 'View Report',
          targets: [{ os: 'default', uri: data.reportUrl }],
        },
      ];
    }

    return card;
  }

  private buildUptimeCard(payload: NotificationPayload): Record<string, unknown> {
    const data = payload.data as { status: string; endpointName: string; endpointUrl: string; responseTime?: number; error?: string };
    const themeColor = data.status === 'up' ? '00FF00' : data.status === 'degraded' ? 'FFAA00' : 'FF0000';
    const emoji = data.status === 'up' ? '🟢' : data.status === 'degraded' ? '🟡' : '🔴';

    const facts = [
      { name: 'Endpoint', value: data.endpointName },
      { name: 'URL', value: data.endpointUrl },
      { name: 'Status', value: data.status.toUpperCase() },
    ];

    if (data.responseTime) {
      facts.push({ name: 'Response Time', value: `${data.responseTime}ms` });
    }

    if (data.error) {
      facts.push({ name: 'Error', value: data.error });
    }

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor,
      summary: `Uptime Alert: ${data.endpointName}`,
      sections: [
        {
          activityTitle: `${emoji} Uptime Alert: ${data.status.toUpperCase()}`,
          facts,
        },
      ],
    };
  }

  private buildGenericCard(payload: NotificationPayload): Record<string, unknown> {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '0099FF',
      summary: `Bugrit: ${payload.type}`,
      sections: [
        {
          activityTitle: `Bugrit Notification: ${payload.type}`,
          facts: [
            { name: 'Project', value: payload.applicationName },
            { name: 'Time', value: payload.timestamp.toISOString() },
          ],
        },
      ],
    };
  }
}

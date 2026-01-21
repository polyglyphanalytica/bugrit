// PagerDuty Notification Service
// Only triggers alerts for critical/high severity findings

import { NotificationPayload, NotificationResult, ScanNotification } from './types';

const PAGERDUTY_EVENTS_API = 'https://events.pagerduty.com/v2/enqueue';

export class PagerDutyNotificationService {
  /**
   * Send alert to PagerDuty
   * Only sends for critical/high severity findings
   */
  async send(
    routingKey: string,
    payload: NotificationPayload,
    minSeverity: 'critical' | 'high' = 'critical'
  ): Promise<NotificationResult> {
    try {
      // Only process scan_completed and scan_failed events
      if (!['scan_completed', 'scan_failed'].includes(payload.type)) {
        return {
          channel: 'pagerduty',
          success: true,
          messageId: 'skipped-not-scan-event',
        };
      }

      const data = payload.data as ScanNotification;

      // For scan_failed, always alert
      if (payload.type === 'scan_failed') {
        return this.triggerAlert(routingKey, payload, data, 'error');
      }

      // For scan_completed, check severity threshold
      const summary = data.summary!;
      const criticals = summary.bySeverity.critical || 0;
      const highs = summary.bySeverity.high || 0;

      const shouldAlert =
        criticals > 0 || (minSeverity === 'high' && highs > 0);

      if (!shouldAlert) {
        return {
          channel: 'pagerduty',
          success: true,
          messageId: 'skipped-below-threshold',
        };
      }

      const severity = criticals > 0 ? 'critical' : 'error';
      return this.triggerAlert(routingKey, payload, data, severity);
    } catch (error) {
      return {
        channel: 'pagerduty',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async triggerAlert(
    routingKey: string,
    payload: NotificationPayload,
    data: ScanNotification,
    severity: 'critical' | 'error' | 'warning' | 'info'
  ): Promise<NotificationResult> {
    const dedupKey = `bugrit-${payload.applicationId}-${data.scanId}`;

    const summary = data.summary
      ? `${data.summary.bySeverity.critical} critical, ${data.summary.bySeverity.high} high vulnerabilities found in ${payload.applicationName}`
      : `Security scan failed for ${payload.applicationName}`;

    const event = {
      routing_key: routingKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary,
        severity,
        source: 'Bugrit Security Scanner',
        component: payload.applicationName,
        group: 'security',
        class: 'vulnerability',
        custom_details: {
          project_id: payload.applicationId,
          project_name: payload.applicationName,
          scan_id: data.scanId,
          target: data.target.value,
          target_type: data.target.type,
          ...(data.summary && {
            critical_count: data.summary.bySeverity.critical,
            high_count: data.summary.bySeverity.high,
            medium_count: data.summary.bySeverity.medium,
            low_count: data.summary.bySeverity.low,
            total_findings: data.summary.totalFindings,
            tools_run: data.summary.toolsRun.join(', '),
          }),
          ...(data.topPriorities && {
            top_priorities: data.topPriorities.slice(0, 5).map(p => ({
              title: p.title,
              severity: p.severity,
              tool: p.tool,
            })),
          }),
          report_url: data.reportUrl,
          error: data.error,
        },
      },
      links: data.reportUrl
        ? [{ href: data.reportUrl, text: 'View Bugrit Report' }]
        : undefined,
    };

    const response = await fetch(PAGERDUTY_EVENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        channel: 'pagerduty',
        success: false,
        error: `PagerDuty API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json() as { dedup_key: string };

    return {
      channel: 'pagerduty',
      success: true,
      messageId: result.dedup_key,
    };
  }

  /**
   * Resolve a previously triggered alert
   */
  async resolve(routingKey: string, scanId: string, applicationId: string): Promise<NotificationResult> {
    try {
      const dedupKey = `bugrit-${applicationId}-${scanId}`;

      const event = {
        routing_key: routingKey,
        event_action: 'resolve',
        dedup_key: dedupKey,
      };

      const response = await fetch(PAGERDUTY_EVENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        return {
          channel: 'pagerduty',
          success: false,
          error: `PagerDuty API error: ${response.status}`,
        };
      }

      return {
        channel: 'pagerduty',
        success: true,
        messageId: dedupKey,
      };
    } catch (error) {
      return {
        channel: 'pagerduty',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Acknowledge a previously triggered alert
   */
  async acknowledge(routingKey: string, scanId: string, applicationId: string): Promise<NotificationResult> {
    try {
      const dedupKey = `bugrit-${applicationId}-${scanId}`;

      const event = {
        routing_key: routingKey,
        event_action: 'acknowledge',
        dedup_key: dedupKey,
      };

      const response = await fetch(PAGERDUTY_EVENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        return {
          channel: 'pagerduty',
          success: false,
          error: `PagerDuty API error: ${response.status}`,
        };
      }

      return {
        channel: 'pagerduty',
        success: true,
        messageId: dedupKey,
      };
    } catch (error) {
      return {
        channel: 'pagerduty',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Discord Notification Service

import { NotificationPayload, NotificationResult, ScanNotification } from './types';

export class DiscordNotificationService {
  /**
   * Send notification to Discord webhook
   */
  async send(webhookUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const embed = this.buildEmbed(payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!response.ok) {
        return {
          channel: 'discord',
          success: false,
          error: `Discord API error: ${response.status}`,
        };
      }

      return {
        channel: 'discord',
        success: true,
      };
    } catch (error) {
      return {
        channel: 'discord',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildEmbed(payload: NotificationPayload): Record<string, unknown> {
    const baseEmbed = {
      timestamp: payload.timestamp.toISOString(),
      footer: { text: `Bugrit | ${payload.applicationName}` },
    };

    switch (payload.type) {
      case 'scan_completed':
      case 'scan_started':
      case 'scan_failed':
        return this.buildScanEmbed(payload, baseEmbed);

      case 'test_result':
        return this.buildTestResultEmbed(payload, baseEmbed);

      case 'uptime':
        return this.buildUptimeEmbed(payload, baseEmbed);

      default:
        return {
          ...baseEmbed,
          title: `Bugrit: ${payload.type}`,
          color: 0x0099ff,
        };
    }
  }

  private buildScanEmbed(
    payload: NotificationPayload,
    baseEmbed: Record<string, unknown>
  ): Record<string, unknown> {
    const data = payload.data as ScanNotification;

    if (payload.type === 'scan_started') {
      return {
        ...baseEmbed,
        title: '🔍 Security Scan Started',
        color: 0x0099ff,
        fields: [
          { name: 'Target', value: data.target.value, inline: true },
          { name: 'Type', value: data.target.type, inline: true },
        ],
      };
    }

    if (payload.type === 'scan_failed') {
      return {
        ...baseEmbed,
        title: '❌ Security Scan Failed',
        color: 0xff0000,
        description: data.error || 'An error occurred during the scan',
        fields: [
          { name: 'Target', value: data.target.value, inline: true },
        ],
      };
    }

    // scan_completed
    const summary = data.summary!;
    const criticals = summary.bySeverity.critical;
    const highs = summary.bySeverity.high;
    const mediums = summary.bySeverity.medium;
    const lows = summary.bySeverity.low;

    let status = '✅ Passed';
    let color = 0x00ff00;
    if (criticals > 0 || highs > 0) {
      status = '🚨 Critical Issues Found';
      color = 0xff0000;
    } else if (mediums > 0) {
      status = '⚠️ Warnings Found';
      color = 0xffaa00;
    }

    const embed: Record<string, unknown> = {
      ...baseEmbed,
      title: `Security Scan ${status}`,
      color,
      url: data.reportUrl,
      fields: [
        { name: '🔴 Critical', value: String(criticals), inline: true },
        { name: '🟠 High', value: String(highs), inline: true },
        { name: '🟡 Medium', value: String(mediums), inline: true },
        { name: '🔵 Low', value: String(lows), inline: true },
        { name: '📊 Total', value: String(summary.totalFindings), inline: true },
        { name: '⏱️ Duration', value: `${Math.round(summary.duration / 1000)}s`, inline: true },
      ],
    };

    if (data.topPriorities?.length) {
      const priorities = data.topPriorities.slice(0, 3)
        .map((p, i) => `${i + 1}. [${p.severity.toUpperCase()}] ${p.title}`)
        .join('\n');
      (embed.fields as Array<{ name: string; value: string; inline?: boolean }>).push({
        name: '🎯 Top Priorities',
        value: priorities,
        inline: false,
      });
    }

    return embed;
  }

  private buildTestResultEmbed(
    payload: NotificationPayload,
    baseEmbed: Record<string, unknown>
  ): Record<string, unknown> {
    const data = payload.data as { status: string; summary: { total: number; passed: number; failed: number; duration: number } };
    const color = data.status === 'passed' ? 0x00ff00 : data.status === 'partial' ? 0xffaa00 : 0xff0000;
    const emoji = data.status === 'passed' ? '✅' : data.status === 'partial' ? '⚠️' : '❌';

    return {
      ...baseEmbed,
      title: `${emoji} Test Results: ${data.status.toUpperCase()}`,
      color,
      fields: [
        { name: 'Total', value: String(data.summary.total), inline: true },
        { name: 'Passed', value: String(data.summary.passed), inline: true },
        { name: 'Failed', value: String(data.summary.failed), inline: true },
        { name: 'Duration', value: `${Math.round(data.summary.duration / 1000)}s`, inline: true },
      ],
    };
  }

  private buildUptimeEmbed(
    payload: NotificationPayload,
    baseEmbed: Record<string, unknown>
  ): Record<string, unknown> {
    const data = payload.data as { status: string; endpointUrl: string; responseTime?: number; error?: string };
    const color = data.status === 'up' ? 0x00ff00 : data.status === 'degraded' ? 0xffaa00 : 0xff0000;
    const emoji = data.status === 'up' ? '🟢' : data.status === 'degraded' ? '🟡' : '🔴';

    return {
      ...baseEmbed,
      title: `${emoji} Uptime Alert: ${data.status.toUpperCase()}`,
      color,
      fields: [
        { name: 'Endpoint', value: data.endpointUrl, inline: false },
        ...(data.responseTime ? [{ name: 'Response Time', value: `${data.responseTime}ms`, inline: true }] : []),
        ...(data.error ? [{ name: 'Error', value: data.error, inline: false }] : []),
      ],
    };
  }
}

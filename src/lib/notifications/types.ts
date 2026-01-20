// Types for notification services

export type NotificationChannel = 'email' | 'slack' | 'webhook';

export interface NotificationConfig {
  // Email configuration
  email?: {
    enabled: boolean;
    recipients: string[];
    notifyOnFailure: boolean;
    notifyOnSuccess: boolean;
    fromAddress?: string;
    fromName?: string;
  };

  // Slack configuration
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string;
    notifyOnFailure: boolean;
    notifyOnSuccess: boolean;
  };

  // Generic webhook configuration
  webhook?: {
    enabled: boolean;
    url: string;
    secret?: string;
    headers?: Record<string, string>;
  };
}

export interface NotificationPayload {
  type: 'test_result' | 'uptime' | 'scheduled' | 'deployment';
  applicationId: string;
  applicationName: string;
  timestamp: Date;
  data: TestResultNotification | UptimeNotification | ScheduledNotification | DeploymentNotification;
}

export interface TestResultNotification {
  executionId: string;
  status: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  failedTests?: Array<{
    name: string;
    error: string;
    duration: number;
  }>;
  browser?: string;
  platform?: string;
  buildId?: string;
  commitSha?: string;
  branch?: string;
  reportUrl?: string;
}

export interface UptimeNotification {
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  previousStatus?: 'up' | 'down' | 'degraded';
  downSince?: Date;
}

export interface ScheduledNotification {
  scheduleType: 'daily_smoke' | 'weekly_regression' | 'custom';
  executionId: string;
  status: 'started' | 'completed' | 'failed';
  summary?: TestResultNotification['summary'];
}

export interface DeploymentNotification {
  deploymentId: string;
  environment: string;
  version: string;
  status: 'started' | 'completed' | 'failed';
  testResults?: TestResultNotification;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn';
    text: string;
  }>;
  accessory?: unknown;
  elements?: unknown[];
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

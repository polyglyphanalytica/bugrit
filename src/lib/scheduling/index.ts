/**
 * Scheduled Scans Module
 *
 * Manages recurring scans using Google Cloud Scheduler.
 * Supports daily, weekly, and custom cron schedules.
 */

import { google } from 'googleapis';
import { ToolCategory } from '../integrations/types';

const scheduler = google.cloudscheduler('v1');

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ScheduledScan {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  userId: string;
  enabled: boolean;

  // Schedule
  frequency: ScheduleFrequency;
  cronExpression: string;
  timezone: string;

  // Scan configuration
  target: {
    type: 'url' | 'repository' | 'api';
    value: string;
    branch?: string;
  };
  categories?: ToolCategory[];
  tools?: string[];

  // Notifications
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  notificationChannels?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time?: string; // HH:MM format for daily/weekly
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  cronExpression?: string; // For custom
  timezone?: string;
}

export interface CloudSchedulerConfig {
  projectId: string;
  region: string;
  serviceAccountEmail?: string;
  targetEndpoint: string;
}

/**
 * Convert schedule config to cron expression
 */
export function toCronExpression(config: ScheduleConfig): string {
  if (config.frequency === 'custom' && config.cronExpression) {
    return config.cronExpression;
  }

  const [hours, minutes] = (config.time || '02:00').split(':').map(Number);

  switch (config.frequency) {
    case 'daily':
      return `${minutes} ${hours} * * *`;

    case 'weekly':
      const dow = config.dayOfWeek ?? 1; // Default to Monday
      return `${minutes} ${hours} * * ${dow}`;

    case 'monthly':
      const dom = config.dayOfMonth ?? 1;
      return `${minutes} ${hours} ${dom} * *`;

    default:
      return `0 2 * * *`; // Default: 2 AM daily
  }
}

/**
 * Parse cron expression to human-readable description
 */
export function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dom, month, dow] = parts;

  // Daily
  if (dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Weekly
  if (dom === '*' && month === '*' && dow !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Every ${days[parseInt(dow, 10)] || dow} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Monthly
  if (dom !== '*' && month === '*' && dow === '*') {
    const suffix = getOrdinalSuffix(parseInt(dom, 10));
    return `Monthly on the ${dom}${suffix} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return cron;
}

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Calculate next run time from cron expression
 */
export function getNextRunTime(cron: string, timezone: string = 'UTC'): Date {
  // Simple implementation - for production, use a library like cron-parser
  const now = new Date();
  const parts = cron.split(' ');
  const [minute, hour, dom, , dow] = parts.map(p => (p === '*' ? -1 : parseInt(p, 10)));

  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (minute >= 0) next.setMinutes(minute);
  if (hour >= 0) next.setHours(hour);

  // If we're past today's time, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // For weekly, find next matching day
  if (dow >= 0) {
    while (next.getDay() !== dow) {
      next.setDate(next.getDate() + 1);
    }
  }

  // For monthly, set the day
  if (dom >= 0) {
    next.setDate(dom);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

/**
 * Cloud Scheduler manager for Bugrit scheduled scans
 */
export class ScheduleManager {
  private config: CloudSchedulerConfig;

  constructor(config: CloudSchedulerConfig) {
    this.config = config;
  }

  /**
   * Get authenticated client
   */
  private async getAuthClient() {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return auth.getClient();
  }

  /**
   * Create a scheduled scan job
   */
  async createScheduledScan(scan: ScheduledScan): Promise<string> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scan.id}`;

    const job = {
      name: jobName,
      description: scan.description || `Bugrit scheduled scan: ${scan.name}`,
      schedule: scan.cronExpression,
      timeZone: scan.timezone || 'UTC',
      httpTarget: {
        uri: `${this.config.targetEndpoint}/api/scans/scheduled`,
        httpMethod: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          scheduledScanId: scan.id,
          projectId: scan.projectId,
          userId: scan.userId,
          target: scan.target,
          categories: scan.categories,
          tools: scan.tools,
          notifyOnComplete: scan.notifyOnComplete,
          notifyOnFailure: scan.notifyOnFailure,
          notificationChannels: scan.notificationChannels,
        })).toString('base64'),
        oidcToken: this.config.serviceAccountEmail
          ? {
              serviceAccountEmail: this.config.serviceAccountEmail,
              audience: this.config.targetEndpoint,
            }
          : undefined,
      },
    };

    try {
      const response = await scheduler.projects.locations.jobs.create({
        parent: `projects/${this.config.projectId}/locations/${this.config.region}`,
        requestBody: job,
      });

      return response.data.name || jobName;
    } catch (error: unknown) {
      const err = error as Error & { code?: number };
      if (err.code === 409) {
        // Job already exists, update instead
        return this.updateScheduledScan(scan);
      }
      throw error;
    }
  }

  /**
   * Update an existing scheduled scan
   */
  async updateScheduledScan(scan: ScheduledScan): Promise<string> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scan.id}`;

    const job = {
      description: scan.description || `Bugrit scheduled scan: ${scan.name}`,
      schedule: scan.cronExpression,
      timeZone: scan.timezone || 'UTC',
      httpTarget: {
        uri: `${this.config.targetEndpoint}/api/scans/scheduled`,
        httpMethod: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          scheduledScanId: scan.id,
          projectId: scan.projectId,
          userId: scan.userId,
          target: scan.target,
          categories: scan.categories,
          tools: scan.tools,
          notifyOnComplete: scan.notifyOnComplete,
          notifyOnFailure: scan.notifyOnFailure,
          notificationChannels: scan.notificationChannels,
        })).toString('base64'),
      },
    };

    const response = await scheduler.projects.locations.jobs.patch({
      name: jobName,
      updateMask: 'description,schedule,timeZone,httpTarget',
      requestBody: job,
    });

    return response.data.name || jobName;
  }

  /**
   * Delete a scheduled scan
   */
  async deleteScheduledScan(scanId: string): Promise<void> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scanId}`;

    await scheduler.projects.locations.jobs.delete({ name: jobName });
  }

  /**
   * Pause a scheduled scan
   */
  async pauseScheduledScan(scanId: string): Promise<void> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scanId}`;

    await scheduler.projects.locations.jobs.pause({ name: jobName });
  }

  /**
   * Resume a paused scheduled scan
   */
  async resumeScheduledScan(scanId: string): Promise<void> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scanId}`;

    await scheduler.projects.locations.jobs.resume({ name: jobName });
  }

  /**
   * Trigger a scheduled scan immediately
   */
  async triggerNow(scanId: string): Promise<void> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scanId}`;

    await scheduler.projects.locations.jobs.run({ name: jobName });
  }

  /**
   * Get the status of a scheduled scan job
   */
  async getJobStatus(scanId: string): Promise<{
    state: 'ENABLED' | 'PAUSED' | 'DISABLED' | 'UPDATE_FAILED';
    lastAttemptTime?: string;
    scheduleTime?: string;
  }> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const jobName = `projects/${this.config.projectId}/locations/${this.config.region}/jobs/bugrit-scan-${scanId}`;

    const response = await scheduler.projects.locations.jobs.get({ name: jobName });

    return {
      state: response.data.state as 'ENABLED' | 'PAUSED' | 'DISABLED' | 'UPDATE_FAILED',
      lastAttemptTime: response.data.lastAttemptTime || undefined,
      scheduleTime: response.data.scheduleTime || undefined,
    };
  }

  /**
   * List all scheduled scan jobs
   */
  async listJobs(): Promise<Array<{ name: string; state: string; schedule: string }>> {
    const authClient = await this.getAuthClient();
    google.options({ auth: authClient as unknown as string });

    const response = await scheduler.projects.locations.jobs.list({
      parent: `projects/${this.config.projectId}/locations/${this.config.region}`,
    } as { parent: string });

    const data = response as unknown as { data: { jobs?: Array<{ name?: string; state?: string; schedule?: string }> } };
    return (data.data.jobs || []).map((job: { name?: string; state?: string; schedule?: string }) => ({
      name: job.name || '',
      state: job.state || 'UNKNOWN',
      schedule: job.schedule || '',
    }));
  }
}

/**
 * Create a schedule manager with default configuration
 */
export function createScheduleManager(): ScheduleManager | null {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const region = process.env.CLOUD_SCHEDULER_REGION || 'us-central1';
  const targetEndpoint = process.env.BUGRIT_API_ENDPOINT;

  if (!projectId || !targetEndpoint) {
    console.warn('Missing GOOGLE_CLOUD_PROJECT or BUGRIT_API_ENDPOINT');
    return null;
  }

  return new ScheduleManager({
    projectId,
    region,
    targetEndpoint,
    serviceAccountEmail: process.env.SCHEDULER_SERVICE_ACCOUNT,
  });
}

// Preset schedules for common use cases
export const PRESET_SCHEDULES: Record<string, ScheduleConfig> = {
  'daily-2am': {
    frequency: 'daily',
    time: '02:00',
  },
  'daily-6am': {
    frequency: 'daily',
    time: '06:00',
  },
  'weekly-monday': {
    frequency: 'weekly',
    time: '02:00',
    dayOfWeek: 1,
  },
  'weekly-friday': {
    frequency: 'weekly',
    time: '18:00',
    dayOfWeek: 5,
  },
  'monthly-1st': {
    frequency: 'monthly',
    time: '02:00',
    dayOfMonth: 1,
  },
  'monthly-15th': {
    frequency: 'monthly',
    time: '02:00',
    dayOfMonth: 15,
  },
};

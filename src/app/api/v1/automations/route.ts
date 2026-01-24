/**
 * Automations API
 *
 * GET /api/v1/automations - List automations
 * POST /api/v1/automations - Create a new automation
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import { getDb } from '@/lib/firestore';
import { nanoid } from 'nanoid';

// Automation types
export type TriggerType =
  | 'github_push'
  | 'github_pr'
  | 'gitlab_push'
  | 'gitlab_mr'
  | 'schedule'
  | 'webhook'
  | 'docker_push'
  | 'npm_publish';

export interface AutomationTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'scan';
  config: {
    platform: 'web' | 'ios' | 'android' | 'desktop';
    tools?: string | string[];
    sourceOverride?: {
      type: string;
      targetUrl?: string;
    };
    failOn?: 'critical' | 'high' | 'medium' | 'low' | null;
    notifications?: {
      slack?: string;
      email?: string[];
    };
  };
}

export interface Automation {
  id: string;
  name: string;
  projectId: string;
  organizationId: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  webhookUrl?: string | null;
  enabled: boolean;
  lastTriggeredAt?: string | null;
  triggerCount: number;
  // Credit budget tracking
  creditsPerScan?: number;
  estimatedTriggersPerMonth?: number;
  estimatedMonthlyCredits?: number;
  createdAt: string;
  updatedAt: string;
}

const VALID_TRIGGER_TYPES: TriggerType[] = [
  'github_push',
  'github_pr',
  'gitlab_push',
  'gitlab_mr',
  'schedule',
  'webhook',
  'docker_push',
  'npm_publish',
];

// Validate cron expression (basic validation)
function isValidCron(cron: string): boolean {
  const parts = cron.split(' ');
  return parts.length === 5 || parts.length === 6;
}

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'automations:read');

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const enabled = url.searchParams.get('enabled');
    const triggerType = url.searchParams.get('trigger_type');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);

    const db = getDb();

    if (!db) {
      // Database not available - return error instead of mock data
      return handleError(new Error('Database connection unavailable'));
    }

    // Build query
    let query = db
      .collection('automations')
      .where('organizationId', '==', context.organizationId);

    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }

    if (enabled !== null) {
      query = query.where('enabled', '==', enabled === 'true');
    }

    if (triggerType) {
      query = query.where('trigger.type', '==', triggerType);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const automations: Automation[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Automation[];

    // Paginate
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedAutomations = automations.slice(start, end);

    const response = successResponse(
      { automations: paginatedAutomations },
      200,
      { page, perPage, total: automations.length }
    );

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'automations:write');

    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return Errors.missingField('name');
    }
    if (!body.projectId) {
      return Errors.missingField('projectId');
    }
    if (!body.trigger) {
      return Errors.missingField('trigger');
    }
    if (!body.action) {
      return Errors.missingField('action');
    }

    // Validate trigger type
    if (!VALID_TRIGGER_TYPES.includes(body.trigger.type)) {
      return Errors.validationError(`Invalid trigger type: ${body.trigger.type}`, {
        validTypes: VALID_TRIGGER_TYPES,
      });
    }

    // Validate schedule trigger
    if (body.trigger.type === 'schedule') {
      const cron = body.trigger.config?.cron;
      if (!cron || !isValidCron(cron)) {
        return Errors.validationError('Invalid cron expression for schedule trigger');
      }
    }

    // Validate action
    if (body.action.type !== 'scan') {
      return Errors.validationError('Only "scan" action type is currently supported');
    }

    const db = getDb();

    if (!db) {
      // Database not available - return error instead of mock data
      return handleError(new Error('Database connection unavailable'));
    }

    // Verify project access
    const projectDoc = await db.collection('projects').doc(body.projectId).get();
    if (!projectDoc.exists) {
      return Errors.notFound('Project');
    }
    const projectData = projectDoc.data();
    if (projectData?.organizationId !== context.organizationId) {
      return Errors.forbidden('No access to this project');
    }

    // Check automation limit (based on tier)
    const existingAutomations = await db
      .collection('automations')
      .where('organizationId', '==', context.organizationId)
      .count()
      .get();

    const tierLimits: Record<string, number> = {
      free: 2,
      starter: 5,
      pro: 20,
      business: 100,
      enterprise: -1, // unlimited
    };

    const limit = tierLimits[context.tier] ?? 2;
    if (limit !== -1 && existingAutomations.data().count >= limit) {
      return Errors.validationError(
        `Automation limit reached for ${context.tier} tier (${limit} automations)`,
        { limit, current: existingAutomations.data().count, tier: context.tier }
      );
    }

    // Create automation
    const automationId = `auto-${nanoid(10)}`;
    const now = new Date().toISOString();

    const automation: Automation = {
      id: automationId,
      name: body.name.trim(),
      projectId: body.projectId,
      organizationId: context.organizationId,
      trigger: body.trigger,
      action: body.action,
      webhookUrl: body.trigger.type === 'webhook'
        ? `https://bugrit.com/api/webhooks/${automationId}`
        : null,
      enabled: body.enabled !== false,
      lastTriggeredAt: null,
      triggerCount: 0,
      creditsPerScan: body.creditsPerScan,
      estimatedTriggersPerMonth: body.estimatedTriggersPerMonth,
      estimatedMonthlyCredits: body.estimatedMonthlyCredits,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('automations').doc(automationId).set(automation);

    const response = successResponse({ automation }, 201);

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

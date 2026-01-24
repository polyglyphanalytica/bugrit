/**
 * Automation by ID API
 *
 * GET /api/v1/automations/:automationId - Get a single automation
 * PATCH /api/v1/automations/:automationId - Update an automation
 * DELETE /api/v1/automations/:automationId - Delete an automation
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import { getDb } from '@/lib/firestore';
import { Automation, TriggerType } from '../route';

interface RouteParams {
  params: Promise<{ automationId: string }>;
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

function isValidCron(cron: string): boolean {
  const parts = cron.split(' ');
  return parts.length === 5 || parts.length === 6;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'automations:read');
    const { automationId } = await params;

    const db = getDb();

    if (!db) {
      return handleError(new Error('Database connection unavailable'));
    }

    const automationDoc = await db.collection('automations').doc(automationId).get();

    if (!automationDoc.exists) {
      return Errors.notFound('Automation');
    }

    const automation = { id: automationDoc.id, ...automationDoc.data() } as Automation;

    // Verify organization access
    if (automation.organizationId !== context.organizationId) {
      return Errors.forbidden('No access to this automation');
    }

    const response = successResponse({ automation });

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'automations:write');
    const { automationId } = await params;

    const body = await request.json();

    const db = getDb();

    if (!db) {
      return handleError(new Error('Database connection unavailable'));
    }

    const automationDoc = await db.collection('automations').doc(automationId).get();

    if (!automationDoc.exists) {
      return Errors.notFound('Automation');
    }

    const existingAutomation = { id: automationDoc.id, ...automationDoc.data() } as Automation;

    // Verify organization access
    if (existingAutomation.organizationId !== context.organizationId) {
      return Errors.forbidden('No access to this automation');
    }

    // Validate trigger type if provided
    if (body.trigger?.type && !VALID_TRIGGER_TYPES.includes(body.trigger.type)) {
      return Errors.validationError(`Invalid trigger type: ${body.trigger.type}`, {
        validTypes: VALID_TRIGGER_TYPES,
      });
    }

    // Validate schedule trigger if provided
    if (body.trigger?.type === 'schedule') {
      const cron = body.trigger.config?.cron;
      if (!cron || !isValidCron(cron)) {
        return Errors.validationError('Invalid cron expression for schedule trigger');
      }
    }

    // Validate action if provided
    if (body.action && body.action.type !== 'scan') {
      return Errors.validationError('Only "scan" action type is currently supported');
    }

    // Build update object
    const updates: Partial<Automation> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updates.name = body.name.trim();
    }
    if (body.trigger !== undefined) {
      updates.trigger = body.trigger;
      // Update webhook URL if trigger type changed to/from webhook
      if (body.trigger.type === 'webhook' && !existingAutomation.webhookUrl) {
        updates.webhookUrl = `https://bugrit.com/api/webhooks/${automationId}`;
      } else if (body.trigger.type !== 'webhook') {
        updates.webhookUrl = null;
      }
    }
    if (body.action !== undefined) {
      updates.action = body.action;
    }
    if (body.enabled !== undefined) {
      updates.enabled = body.enabled;
    }

    await db.collection('automations').doc(automationId).update(updates);

    const updatedAutomation: Automation = {
      ...existingAutomation,
      ...updates,
    };

    const response = successResponse({ automation: updatedAutomation });

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'automations:write');
    const { automationId } = await params;

    const db = getDb();

    if (!db) {
      return handleError(new Error('Database connection unavailable'));
    }

    const automationDoc = await db.collection('automations').doc(automationId).get();

    if (!automationDoc.exists) {
      return Errors.notFound('Automation');
    }

    const automation = automationDoc.data() as Automation;

    // Verify organization access
    if (automation.organizationId !== context.organizationId) {
      return Errors.forbidden('No access to this automation');
    }

    await db.collection('automations').doc(automationId).delete();

    const response = successResponse({
      success: true,
      message: 'Automation deleted successfully',
    });

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

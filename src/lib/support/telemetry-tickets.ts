/**
 * Telemetry Ticket Creation
 *
 * Auto-creates support tickets when critical errors or user flow
 * failures are detected. Superadmin gets notified via Sensei.
 */

import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

interface TelemetryTicketOptions {
  /** User who experienced the issue (optional for system errors) */
  userId?: string;
  /** Error category for triage */
  category: 'scan_failure' | 'billing_error' | 'auth_error' | 'api_error' | 'system_error';
  /** Brief subject line */
  subject: string;
  /** Detailed description of what happened */
  message: string;
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** Additional metadata (error details, stack traces, request info) */
  metadata?: Record<string, unknown>;
}

/**
 * Create a support ticket from telemetry/error monitoring.
 * Notifies the superadmin via the notification system.
 */
export async function createTelemetryTicket(options: TelemetryTicketOptions): Promise<string | null> {
  try {
    const db = getDb();
    if (!db) return null;

    const ticketId = generateId('tkt');
    const now = new Date().toISOString();

    const ticket = {
      id: ticketId,
      userId: options.userId || null,
      name: 'System Telemetry',
      email: 'system@bugrit.com',
      category: options.category,
      subject: options.subject,
      message: options.message,
      source: 'api',
      channel: 'web',
      status: 'open',
      priority: options.priority || 'normal',
      assignedTo: null,
      responses: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      metadata: options.metadata || {},
    };

    await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).set(ticket);

    // Notify superadmin
    const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
    if (superadminEmail) {
      const adminSnapshot = await db.collection('users')
        .where('email', '==', superadminEmail)
        .limit(1)
        .get();

      if (!adminSnapshot.empty) {
        const adminUserId = adminSnapshot.docs[0].id;
        await db.collection('notifications').doc(generateId('ntf')).set({
          userId: adminUserId,
          type: 'support_ticket_new',
          title: `[${options.category}] ${options.subject}`,
          message: options.message.slice(0, 200),
          severity: options.priority === 'urgent' ? 'error' : 'warning',
          metadata: { ticketId, category: options.category, affectedUser: options.userId },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    // If a user was affected, notify them too
    if (options.userId) {
      await db.collection('notifications').doc(generateId('ntf')).set({
        userId: options.userId,
        type: 'support_ticket_created',
        title: 'We noticed an issue',
        message: `We detected a problem and our team has been notified: "${options.subject}". No action needed from you.`,
        severity: 'info',
        metadata: { ticketId },
        read: false,
        createdAt: new Date(),
      });
    }

    logger.info('Telemetry ticket created', { ticketId, category: options.category, priority: options.priority });
    return ticketId;
  } catch (error) {
    logger.error('Failed to create telemetry ticket', { error, options });
    return null;
  }
}

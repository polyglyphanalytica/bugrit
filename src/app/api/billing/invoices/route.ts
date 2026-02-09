/**
 * GET /api/billing/invoices
 *
 * Returns paginated invoice history for authenticated user from Stripe.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifySession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { db } from '@/lib/firebase-admin';

// Initialize Stripe with environment-aware key selection
function getStripe(): Stripe {
  const { isProduction } = require('@/lib/environment');
  const secretKey = isProduction()
    ? process.env.STRIPE_SECRET_KEY
    : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new Error(`Stripe secret key not configured (${isProduction() ? 'STRIPE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY'})`);
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  });
}

export interface InvoiceItem {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  description: string | null;
  created: number;
  periodStart: number;
  periodEnd: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
  paid: boolean;
  paymentIntent: string | null;
}

export interface InvoicesResponse {
  invoices: InvoiceItem[];
  hasMore: boolean;
  totalCount: number;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user via session cookie
    const user = await verifySession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.uid;

    // Get Stripe customer ID from user record
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      // No Stripe customer - return empty list
      return NextResponse.json({
        invoices: [],
        hasMore: false,
        totalCount: 0,
      });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const startingAfter = searchParams.get('starting_after') || undefined;

    // Fetch invoices from Stripe
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit,
      starting_after: startingAfter,
    });

    // Map to response format
    const invoiceItems: InvoiceItem[] = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status || 'unknown',
      amount: invoice.amount_due,
      currency: invoice.currency,
      description: invoice.description || getInvoiceDescription(invoice),
      created: invoice.created,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
      paid: invoice.paid,
      paymentIntent: typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id || null,
    }));

    return NextResponse.json({
      invoices: invoiceItems,
      hasMore: invoices.has_more,
      totalCount: invoices.data.length,
    });
  } catch (error) {
    logger.error('Failed to fetch invoices', {
      path: '/api/billing/invoices',
      error,
    });
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

function getInvoiceDescription(invoice: Stripe.Invoice): string {
  // Try to get description from line items
  const lineItems = invoice.lines?.data || [];
  if (lineItems.length > 0) {
    const descriptions = lineItems
      .map((item) => item.description)
      .filter(Boolean)
      .slice(0, 2);
    if (descriptions.length > 0) {
      return descriptions.join(', ');
    }
  }

  // Fallback based on billing reason
  switch (invoice.billing_reason) {
    case 'subscription_create':
      return 'New subscription';
    case 'subscription_cycle':
      return 'Subscription renewal';
    case 'subscription_update':
      return 'Subscription update';
    case 'manual':
      return 'Credit purchase';
    default:
      return 'Invoice';
  }
}

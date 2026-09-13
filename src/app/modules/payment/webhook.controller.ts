/**
 * @fileoverview Stripe Webhook handler.
 * Processes Stripe events to keep local subscription and payment
 * records in sync with Stripe's source of truth.
 * 
 * IMPORTANT: This route must receive the raw body for signature
 * verification. It must be mounted BEFORE body-parser middleware.
 */
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../../config/stripe.config';
import { Subscription } from '../subscription/subscription.model';
import { getStripePeriod } from '../subscription/subscription.service';
import { Payment } from './payment.model';

/**
 * Handle incoming Stripe webhook events.
 * Verifies the event signature and processes relevant event types.
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!stripe) {
    console.warn('[Webhook] Stripe not configured, ignoring webhook');
    return res.status(200).json({ received: true });
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event type — log for visibility
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Webhook] Event processing error:', err);
    // Still return 200 so Stripe doesn't retry
  }

  return res.status(200).json({ received: true });
};

// ─── Event Handlers ──────────────────────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const billingInterval = session.metadata?.billingInterval;

  if (!userId || !plan) {
    console.warn('[Webhook] Missing metadata in checkout session');
    return;
  }

  // Upsert subscription record
  await Subscription.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      plan,
      status: 'active',
      billingInterval: billingInterval || 'month',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      cancelAtPeriodEnd: false,
    },
    { upsert: true, new: true },
  );
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: sub.id },
    {
      status: sub.status as any,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      // Period keys are only set when Stripe returned valid timestamps.
      ...getStripePeriod(sub),
    },
  );
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: sub.id },
    {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    },
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscription = await Subscription.findOne({ stripeCustomerId: customerId });

  if (subscription) {
    await Payment.create({
      user: subscription.user,
      amount: invoice.amount_paid || 0,
      currency: invoice.currency || 'usd',
      status: 'succeeded',
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: (invoice as any).payment_intent as string,
      description: `Invoice ${invoice.number || invoice.id}`,
    });
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscription = await Subscription.findOne({ stripeCustomerId: customerId });

  if (subscription) {
    await Payment.create({
      user: subscription.user,
      amount: invoice.amount_due || 0,
      currency: invoice.currency || 'usd',
      status: 'failed',
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: (invoice as any).payment_intent as string,
      description: `Failed invoice ${invoice.number || invoice.id}`,
    });

    // Update subscription status
    await Subscription.findOneAndUpdate(
      { stripeCustomerId: customerId },
      { status: 'past_due' },
    );
  }
}

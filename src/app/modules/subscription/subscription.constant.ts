/**
 * @fileoverview Subscription plan constants.
 */

export const PLAN_TIERS = ['free', 'starter', 'professional', 'enterprise'] as const;

export const SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
] as const;

export const BILLING_INTERVALS = ['month', 'year'] as const;

/** Default plan configurations */
export const PLAN_CONFIGS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['5 cases', 'Basic document storage', 'Community access'],
    casesLimit: 5,
    storageGB: 1,
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 1999, // $19.99 in cents
    yearlyPrice: 19990, // $199.90 in cents
    features: ['25 cases', '10 GB storage', 'AI tools (basic)', 'Email support'],
    casesLimit: 25,
    storageGB: 10,
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 4999, // $49.99 in cents
    yearlyPrice: 49990, // $499.90 in cents
    features: ['Unlimited cases', '50 GB storage', 'AI tools (full)', 'Priority support', 'Analytics'],
    casesLimit: -1, // unlimited
    storageGB: 50,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 9999, // $99.99 in cents
    yearlyPrice: 99990, // $999.90 in cents
    features: ['Unlimited everything', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Team management'],
    casesLimit: -1,
    storageGB: 500,
  },
};

export const SUBSCRIPTION_ERROR_MESSAGES = {
  PLAN_NOT_FOUND: 'Subscription plan not found',
  ALREADY_SUBSCRIBED: 'User already has an active subscription to this plan',
  NO_ACTIVE_SUBSCRIPTION: 'No active subscription found',
  STRIPE_NOT_CONFIGURED: 'Stripe is not configured. Cannot process payment.',
  CHECKOUT_FAILED: 'Failed to create checkout session',
  CANCEL_FAILED: 'Failed to cancel subscription',
};

/**
 * @fileoverview Subscription TypeScript interfaces.
 */
import { Types } from 'mongoose';
import { PLAN_TIERS, SUBSCRIPTION_STATUSES, BILLING_INTERVALS } from './subscription.constant';

export type TPlanTier = typeof PLAN_TIERS[number];
export type TSubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];
export type TBillingInterval = typeof BILLING_INTERVALS[number];

export interface ISubscription {
  user: Types.ObjectId;
  plan: TPlanTier;
  status: TSubscriptionStatus;
  billingInterval: TBillingInterval;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckoutSessionRequest {
  plan: TPlanTier;
  billingInterval: TBillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface IPortalSessionRequest {
  returnUrl: string;
}

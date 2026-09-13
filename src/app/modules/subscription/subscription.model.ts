/**
 * @fileoverview Subscription Mongoose model.
 */
import { Schema, model } from 'mongoose';
import { ISubscription } from './subscription.interface';
import { PLAN_TIERS, SUBSCRIPTION_STATUSES, BILLING_INTERVALS } from './subscription.constant';

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: PLAN_TIERS,
      required: true,
      default: 'free',
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
      default: 'active',
    },
    billingInterval: {
      type: String,
      enum: BILLING_INTERVALS,
      default: 'month',
    },
    stripeCustomerId: {
      type: String,
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    stripePriceId: {
      type: String,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialEnd: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: one active subscription per user
subscriptionSchema.index(
  { user: 1, status: 1 },
  { unique: false },
);

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);

/**
 * @fileoverview Payment TypeScript interfaces.
 */
import { Types } from 'mongoose';

export type TPaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';

export interface IPayment {
  user: Types.ObjectId;
  amount: number;
  currency: string;
  status: TPaymentStatus;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

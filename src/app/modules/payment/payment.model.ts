/**
 * @fileoverview Payment Mongoose model.
 * Stores a record of every payment/invoice for audit and history.
 */
import { Schema, model } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['succeeded', 'pending', 'failed', 'refunded'],
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },
    stripeInvoiceId: {
      type: String,
      sparse: true,
    },
    stripeChargeId: {
      type: String,
    },
    description: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);

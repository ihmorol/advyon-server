/**
 * @fileoverview Payment/Subscription API contracts.
 */

export interface ICheckoutSessionRequest {
  plan: 'starter' | 'professional' | 'enterprise';
  billingInterval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

export interface ICheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface IPortalSessionRequest {
  returnUrl: string;
}

export interface IPortalSessionResponse {
  url: string;
}

export interface ISubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  casesLimit: number;
  storageGB: number;
}

export interface IPaymentRecord {
  _id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description?: string;
  createdAt: string;
}

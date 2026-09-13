/**
 * @fileoverview Subscription Zod validation schemas.
 */
import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    plan: z.enum(['starter', 'professional', 'enterprise']),
    billingInterval: z.enum(['month', 'year']),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  }),
});

export const createPortalSessionSchema = z.object({
  body: z.object({
    returnUrl: z.string().url(),
  }),
});

export const verifyCheckoutSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1),
  }),
});

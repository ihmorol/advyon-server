/**
 * @fileoverview Payment routes.
 */
import express from 'express';
import { PaymentController } from './payment.controller';
import { handleStripeWebhook } from './webhook.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { getPaymentsQuerySchema } from './payment.validation';

const router = express.Router();

/**
 * POST /payments/webhook — Stripe webhook endpoint.
 * IMPORTANT: The raw body parser for this path is registered in app.ts
 * (before the global JSON parser) so that Stripe signature verification
 * receives the raw body. No body-parsing middleware must be added here.
 */
router.post('/webhook', handleStripeWebhook);

/** GET /payments/me — Current user's payment history */
router.get(
  '/me',
  auth(),
  validateRequest(getPaymentsQuerySchema),
  PaymentController.getUserPayments,
);

/** GET /payments/all — All payments (admin only) */
router.get(
  '/all',
  auth('admin', 'superAdmin'),
  validateRequest(getPaymentsQuerySchema),
  PaymentController.getAllPayments,
);

export const PaymentRoutes = router;

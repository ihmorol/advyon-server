/**
 * @fileoverview Subscription routes.
 */
import express from 'express';
import { SubscriptionController } from './subscription.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  createCheckoutSessionSchema,
  createPortalSessionSchema,
  verifyCheckoutSchema,
} from './subscription.validation';

const router = express.Router();

/** GET /subscriptions/plans — Public plan listing */
router.get('/plans', SubscriptionController.getPlans);

/** GET /subscriptions/me — Current user's subscription */
router.get('/me', auth(), SubscriptionController.getUserSubscription);

/** POST /subscriptions/checkout — Create Stripe Checkout session */
router.post(
  '/checkout',
  auth(),
  validateRequest(createCheckoutSessionSchema),
  SubscriptionController.createCheckoutSession,
);

/** POST /subscriptions/portal — Create Stripe Customer Portal session */
router.post(
  '/portal',
  auth(),
  validateRequest(createPortalSessionSchema),
  SubscriptionController.createPortalSession,
);

/** POST /subscriptions/cancel — Cancel subscription at period end */
router.post('/cancel', auth(), SubscriptionController.cancelSubscription);

/** POST /subscriptions/verify-checkout — Verify completed checkout and sync subscription */
router.post(
  '/verify-checkout',
  auth(),
  validateRequest(verifyCheckoutSchema),
  SubscriptionController.verifyCheckout,
);

export const SubscriptionRoutes = router;

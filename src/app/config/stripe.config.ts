/**
 * @fileoverview Server-side Stripe SDK configuration.
 * Initializes the Stripe client with the secret key from environment.
 * All Stripe operations should import the instance from this module.
 */
import Stripe from 'stripe';
import config from '../config';

const STRIPE_SECRET_KEY = config.stripe_secret_key || process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn(
    '[Stripe] STRIPE_SECRET_KEY is not set. Payment features will be unavailable.',
  );
}

/**
 * Singleton Stripe SDK instance.
 * Configured with the Stripe SDK-supported pinned API version.
 */
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  : null;

export const STRIPE_WEBHOOK_SECRET =
  config.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '';

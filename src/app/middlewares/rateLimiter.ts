/**
 * @fileoverview Global and per-route rate limiting middleware.
 * Uses express-rate-limit (already installed) to protect against abuse.
 *
 * @module rateLimiter
 */
import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — applied to all routes.
 * Allows 100 requests per 15-minute window per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * Allows 10 requests per 15-minute window per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many login attempts. Please wait 15 minutes.',
  },
});

/**
 * Payment-specific rate limiter.
 * Allows 20 requests per 15-minute window per IP.
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many payment requests. Please try again later.',
  },
});

export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many contact submissions. Please wait before trying again.',
  },
});

/**
 * Webhook rate limiter — higher threshold for Stripe webhooks.
 * Allows 200 requests per minute per IP (Stripe may send bursts).
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

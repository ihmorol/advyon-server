import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AnalyticsControllers } from './analytics.controller';
import { AnalyticsValidation } from './analytics.validation';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Dashboard metrics and reports
 */

/**
 * @swagger
 * /analytics/metrics/cases:
 *   get:
 *     summary: Get case metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Case metrics (counts, distribution, trends)
 */
router.get(
  '/metrics/cases',
  auth(),
  validateRequest(AnalyticsValidation.getMetricsValidation),
  AnalyticsControllers.getCaseMetrics,
);

/**
 * @swagger
 * /analytics/metrics/clients:
 *   get:
 *     summary: Get client metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Client metrics (total, active, retention)
 */
router.get(
  '/metrics/clients',
  auth(),
  validateRequest(AnalyticsValidation.getMetricsValidation),
  AnalyticsControllers.getClientMetrics,
);

/**
 * @swagger
 * /analytics/metrics/deadlines:
 *   get:
 *     summary: Get upcoming deadlines
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of upcoming deadlines
 */
router.get(
  '/metrics/deadlines',
  auth(),
  validateRequest(AnalyticsValidation.getMetricsValidation),
  AnalyticsControllers.getUpcomingDeadlines,
);

/**
 * @swagger
 * /analytics/metrics/revenue:
 *   get:
 *     summary: Get revenue metrics (stub)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Revenue metrics (stub)
 */
router.get(
  '/metrics/revenue',
  auth(),
  validateRequest(AnalyticsValidation.getMetricsValidation),
  AnalyticsControllers.getRevenueMetrics,
);

router.get(
  '/support-tickets',
  auth('admin', 'superAdmin'),
  validateRequest(AnalyticsValidation.getSupportKpiValidation),
  AnalyticsControllers.getSupportTicketKpis,
);

export const AnalyticsRoutes = router;

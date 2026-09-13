/**
 * @fileoverview Health check route for uptime monitoring (WBS-SM-MVP-06).
 */
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /health — Lightweight health check.
 * Returns server and database status for SLO monitoring.
 */
router.get('/', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      server: 'running',
    },
  });
});

export const HealthRoutes = router;

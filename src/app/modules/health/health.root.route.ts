/**
 * @fileoverview Root-level health check routes for Render deployment.
 * Render's health checks expect endpoints at /health (not /api/v1/health).
 */
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /health — Basic liveness probe
 * Returns 200 if server is running (no DB check)
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      server: 'running',
    },
  });
});

/**
 * GET /health/live — Liveness probe for container orchestration
 * Returns 200 if the container/process is alive
 */
router.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready — Readiness probe
 * Returns 200 only if server can handle requests (includes DB check)
 */
router.get('/ready', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  const isReady = dbState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      server: 'running',
    },
  });
});

export default router;

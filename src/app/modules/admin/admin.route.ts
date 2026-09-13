/**
 * @fileoverview Admin module routes.
 * Provides endpoints for user management, case oversight,
 * system settings, analytics overview, bulk operations, and audit logs.
 * All routes require admin or superAdmin role.
 */
import express from 'express';
import { AdminController } from './admin.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';

import {
  getUsersQuerySchema,
  getUserParamsSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  deleteUserParamsSchema,
  bulkUpdateUsersSchema,
  updateSystemSettingsSchema,
  getAuditLogsQuerySchema,
} from './admin.validation';

const router = express.Router();

// ─── User Management ─────────────────────────────────────────────

/** GET /admin/users — List all users with pagination and filtering */
router.get(
  '/users',
  auth('admin', 'superAdmin'),
  validateRequest(getUsersQuerySchema),
  AdminController.getAllUsers,
);

/** GET /admin/users/:id — Get a single user by ID */
router.get(
  '/users/:id',
  auth('admin', 'superAdmin'),
  validateRequest(getUserParamsSchema),
  AdminController.getSingleUser,
);

/** PATCH /admin/users/:id/role — Update user role (superAdmin only) */
router.patch(
  '/users/:id/role',
  auth('superAdmin'),
  validateRequest(updateUserRoleSchema),
  AdminController.updateUserRole,
);

/** PATCH /admin/users/:id/status — Update user status */
router.patch(
  '/users/:id/status',
  auth('admin', 'superAdmin'),
  validateRequest(updateUserStatusSchema),
  AdminController.updateUserStatus,
);

/** DELETE /admin/users/:id — Soft delete user */
router.delete(
  '/users/:id',
  auth('admin', 'superAdmin'),
  validateRequest(deleteUserParamsSchema),
  AdminController.softDeleteUser,
);

// ─── Bulk Operations ─────────────────────────────────────────────

/** POST /admin/users/bulk — Bulk activate/block/delete users */
router.post(
  '/users/bulk',
  auth('admin', 'superAdmin'),
  validateRequest(bulkUpdateUsersSchema),
  AdminController.bulkUpdateUsers,
);

// ─── Case Oversight ──────────────────────────────────────────────

/** GET /admin/cases/overview — Aggregated case stats */
router.get(
  '/cases/overview',
  auth('admin', 'superAdmin'),
  AdminController.getCaseOverview,
);

// ─── System Settings ─────────────────────────────────────────────

/** GET /admin/settings — Get system settings */
router.get(
  '/settings',
  auth('admin', 'superAdmin'),
  AdminController.getSystemSettings,
);

/** PATCH /admin/settings — Update system settings */
router.patch(
  '/settings',
  auth('admin', 'superAdmin'),
  validateRequest(updateSystemSettingsSchema),
  AdminController.updateSystemSettings,
);

// ─── Analytics Overview ──────────────────────────────────────────

/** GET /admin/analytics — Admin analytics summary */
router.get(
  '/analytics',
  auth('admin', 'superAdmin'),
  AdminController.getAnalyticsOverview,
);

// ─── Audit Logs ──────────────────────────────────────────────────

/** GET /admin/audit-logs — Paginated audit log entries */
router.get(
  '/audit-logs',
  auth('admin', 'superAdmin'),
  validateRequest(getAuditLogsQuerySchema),
  AdminController.getAuditLogs,
);

// ─── Lawyer Verification ─────────────────────────────────────────

/** GET /admin/verifications — Get pending lawyer verifications */
router.get(
  '/verifications',
  auth('admin', 'superAdmin'),
  AdminController.getPendingLawyerVerifications,
);

/** PATCH /admin/verifications/:lawyerId — Review lawyer verification */
router.patch(
  '/verifications/:lawyerId',
  auth('admin', 'superAdmin'),
  AdminController.reviewLawyerVerification,
);

export const AdminRoutes = router;

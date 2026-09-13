/**
 * @fileoverview Admin module Zod validation schemas.
 * Covers user management, bulk operations, system settings,
 * and audit log query parameters.
 */
import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

// Custom ObjectId validator
const objectIdSchema = z.string().refine((val) => isValidObjectId(val), {
  message: 'Invalid user ID format',
});

// ─── User Management Schemas ─────────────────────────────────────
export const getUserParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    role: z.enum(['superAdmin', 'admin', 'lawyer', 'client', 'judge']),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(['active', 'blocked', 'in-progress']),
  }),
});

export const deleteUserParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'email', 'fullName', 'role', 'status'])
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    role: z.enum(['superAdmin', 'admin', 'lawyer', 'client', 'judge']).optional(),
    status: z.enum(['active', 'blocked', 'in-progress']).optional(),
  }),
});

// ─── Bulk Operations Schema ──────────────────────────────────────
export const bulkUpdateUsersSchema = z.object({
  body: z.object({
    userIds: z
      .array(objectIdSchema)
      .min(1, 'At least one user ID is required')
      .max(100, 'Cannot update more than 100 users at once'),
    action: z.enum(['activate', 'block', 'delete']),
  }),
});

// ─── System Settings Schema ──────────────────────────────────────
export const updateSystemSettingsSchema = z.object({
  body: z.object({
    siteName: z.string().min(1).max(100).optional(),
    maintenanceMode: z.boolean().optional(),
    allowRegistration: z.boolean().optional(),
    maxUploadSizeMB: z.number().min(1).max(100).optional(),
    defaultUserRole: z.enum(['client', 'lawyer']).optional(),
    sessionTimeoutMinutes: z.number().min(5).max(1440).optional(),
    features: z
      .object({
        aiTools: z.boolean().optional(),
        communityHub: z.boolean().optional(),
        billing: z.boolean().optional(),
        notifications: z.boolean().optional(),
      })
      .optional(),
  }),
});

// ─── Audit Logs Query Schema ─────────────────────────────────────
export const getAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    action: z.string().optional(),
    actorId: z.string().optional(),
    targetType: z
      .enum(['user', 'case', 'setting', 'payment', 'system'])
      .optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

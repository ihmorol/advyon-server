/**
 * @fileoverview Admin controller layer.
 * Handles HTTP request/response for all admin operations.
 */
import { Request, Response } from 'express';
import httpStatus from 'http-status';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/appError';

import { AdminService } from './admin.service';
import { TUserRole, TUserStatus } from './admin.interface';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from './admin.constant';

// ─── User Management ─────────────────────────────────────────────
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    search: req.query.search as string | undefined,
    role: req.query.role as TUserRole | undefined,
    status: req.query.status as TUserStatus | undefined,
  };

  const page = Number(req.query.page) || DEFAULT_PAGE;
  const limit = Number(req.query.limit) || DEFAULT_LIMIT;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? '' : '-';

  const options = {
    page,
    limit,
    sort: `${sortOrder}${sortBy}`,
    skip: (page - 1) * limit,
  };

  const result = await AdminService.getAllUsers(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users fetched successfully',
    data: result.data,
  });
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getSingleUser(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const result = await AdminService.updateUserRole(
    req.params.id,
    req.body.role,
    requestingUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User role updated successfully',
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const result = await AdminService.updateUserStatus(
    req.params.id,
    req.body.status,
    requestingUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully',
    data: result,
  });
});

const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const result = await AdminService.softDeleteUser(
    req.params.id,
    requestingUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

// ─── Bulk Operations ─────────────────────────────────────────────
const bulkUpdateUsers = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const result = await AdminService.bulkUpdateUsers(req.body, requestingUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Bulk operation completed. ${result.modifiedCount} users affected.`,
    data: result,
  });
});

// ─── Case Oversight ──────────────────────────────────────────────
const getCaseOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getCaseOverview();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case overview fetched successfully',
    data: result,
  });
});

// ─── System Settings ─────────────────────────────────────────────
const getSystemSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getSystemSettings();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'System settings fetched successfully',
    data: result,
  });
});

const updateSystemSettings = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const result = await AdminService.updateSystemSettings(
    req.body,
    requestingUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'System settings updated successfully',
    data: result,
  });
});

// ─── Analytics Overview ──────────────────────────────────────────
const getAnalyticsOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getAnalyticsOverview();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Analytics overview fetched successfully',
    data: result,
  });
});

// ─── Audit Logs ──────────────────────────────────────────────────
const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    action: req.query.action as string | undefined,
    actorId: req.query.actorId as string | undefined,
    targetType: req.query.targetType as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const page = Number(req.query.page) || DEFAULT_PAGE;
  const limit = Number(req.query.limit) || DEFAULT_LIMIT;

  const options = {
    page,
    limit,
    sort: '-createdAt',
    skip: (page - 1) * limit,
  };

  const result = await AdminService.getAuditLogs(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Audit logs fetched successfully',
    data: result.data,
  });
});

// ─── Lawyer Verification ─────────────────────────────────────────
const getPendingLawyerVerifications = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || DEFAULT_PAGE;
  const limit = Number(req.query.limit) || DEFAULT_LIMIT;

  const options = {
    page,
    limit,
    sort: '-createdAt',
    skip: (page - 1) * limit,
  };

  const result = await AdminService.getPendingLawyerVerifications(options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending verifications fetched successfully',
    data: result.data,
  });
});

const reviewLawyerVerification = catchAsync(async (req: Request, res: Response) => {
  const requestingUserId = req.user.userId;
  const { lawyerId } = req.params;
  const { status, notes } = req.body;

  if (!['verified', 'rejected'].includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Status must be either verified or rejected');
  }

  const result = await AdminService.reviewLawyerVerification(
    lawyerId,
    status,
    notes,
    requestingUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Lawyer verification ${status} successfully`,
    data: result,
  });
});

export const AdminController = {
  // User management
  getAllUsers,
  getSingleUser,
  updateUserRole,
  updateUserStatus,
  softDeleteUser,
  // WBS-11.1 features
  bulkUpdateUsers,
  getCaseOverview,
  getSystemSettings,
  updateSystemSettings,
  getAnalyticsOverview,
  getAuditLogs,
  getPendingLawyerVerifications,
  reviewLawyerVerification,
};

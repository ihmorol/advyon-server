/**
 * @fileoverview Admin service layer.
 * Handles user management, case oversight, system settings,
 * analytics overview, bulk operations, and audit logging.
 */
import httpStatus from 'http-status';
import { User } from '../user/user.model';
import AppError from '../../errors/appError';
import {
  TUserFilter,
  TUserRole,
  TUserStatus,
  TPaginationOptions,
  TBulkUserUpdate,
  TSystemSettingsUpdate,
  TAuditLogFilter,
} from './admin.interface';
import { ADMIN_ERROR_MESSAGES } from './admin.constant';
import { AuditLog } from './auditLog.model';
import {
  SystemSettings,
  getOrCreateSettings,
} from './systemSettings.model';

// ─── Audit Log Helper ────────────────────────────────────────────
/**
 * Write an entry to the audit log.
 * Called internally after every admin mutation.
 */
const writeAuditLog = async (entry: {
  action: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  target?: string;
  targetType?: 'user' | 'case' | 'setting' | 'payment' | 'system';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await AuditLog.create({
      action: entry.action,
      actor: entry.actorId,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      target: entry.target,
      targetType: entry.targetType,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  } catch {
    // Audit log write should never block main operations
    console.error('[AuditLog] Failed to write audit entry:', entry.action);
  }
};

// ─── User Management (existing) ─────────────────────────────────
const getAllUsers = async (
  filters: TUserFilter,
  options: TPaginationOptions,
): Promise<{ meta: { total: number; page: number; limit: number }; data: any[] }> => {
  const { search, role, status } = filters;
  const andConditions: any[] = [{ isDeleted: false }];

  if (search) {
    andConditions.push({
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
      ],
    });
  }
  if (role) andConditions.push({ role });
  if (status) andConditions.push({ status });

  const whereConditions = andConditions.length ? { $and: andConditions } : {};

  const result = await User.find(whereConditions)
    .skip(options.skip)
    .limit(options.limit)
    .sort(options.sort)
    .select('-password');

  const total = await User.countDocuments(whereConditions);

  return {
    meta: { total, page: options.page, limit: options.limit },
    data: result,
  };
};

const getSingleUser = async (id: string): Promise<any> => {
  const user = await User.findById(id).select('-password');
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, ADMIN_ERROR_MESSAGES.USER_NOT_FOUND);
  }
  return user;
};

const updateUserRole = async (
  id: string,
  role: TUserRole,
  requestingUserId: string,
): Promise<any> => {
  const requestingUser = await User.findOne({ id: requestingUserId });
  if (requestingUser?._id.toString() === id) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot change your own role.');
  }

  const targetUser = await User.findById(id);
  if (!targetUser) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  if (targetUser.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot change role of a deleted user');
  }

  if (targetUser.role === 'superAdmin' && role !== 'superAdmin') {
    const superAdminCount = await User.countDocuments({
      role: 'superAdmin',
      isDeleted: false,
      status: { $ne: 'blocked' },
    });
    if (superAdminCount <= 1) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        ADMIN_ERROR_MESSAGES.CANNOT_DELETE_LAST_SUPERADMIN,
      );
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true },
  ).select('-password');

  if (!updatedUser) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update user role');
  }

  // Audit log
  if (requestingUser) {
    await writeAuditLog({
      action: 'UPDATE_USER_ROLE',
      actorId: requestingUser._id.toString(),
      actorEmail: requestingUser.email,
      actorRole: requestingUser.role || 'unknown',
      target: id,
      targetType: 'user',
      details: { previousRole: targetUser.role, newRole: role },
    });
  }

  return updatedUser;
};

const updateUserStatus = async (
  id: string,
  status: TUserStatus,
  requestingUserId: string,
): Promise<any> => {
  const requestingUser = await User.findOne({ id: requestingUserId });
  if (requestingUser?._id.toString() === id) {
    throw new AppError(httpStatus.FORBIDDEN, ADMIN_ERROR_MESSAGES.CANNOT_MODIFY_SELF);
  }

  const user = await User.findById(id);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, ADMIN_ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (user.role === 'superAdmin' && status === 'blocked') {
    const activeSuperAdminCount = await User.countDocuments({
      role: 'superAdmin',
      isDeleted: false,
      status: { $ne: 'blocked' },
    });
    if (activeSuperAdminCount <= 1) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        ADMIN_ERROR_MESSAGES.CANNOT_BLOCK_LAST_SUPERADMIN,
      );
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).select('-password');

  // Audit log
  if (requestingUser) {
    await writeAuditLog({
      action: 'UPDATE_USER_STATUS',
      actorId: requestingUser._id.toString(),
      actorEmail: requestingUser.email,
      actorRole: requestingUser.role || 'unknown',
      target: id,
      targetType: 'user',
      details: { previousStatus: user.status, newStatus: status },
    });
  }

  return updatedUser;
};

const softDeleteUser = async (
  id: string,
  requestingUserId: string,
): Promise<any> => {
  const requestingUser = await User.findOne({ id: requestingUserId });
  if (requestingUser?._id.toString() === id) {
    throw new AppError(httpStatus.FORBIDDEN, ADMIN_ERROR_MESSAGES.CANNOT_MODIFY_SELF);
  }

  const user = await User.findById(id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, ADMIN_ERROR_MESSAGES.USER_NOT_FOUND);
  if (user.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, ADMIN_ERROR_MESSAGES.USER_ALREADY_DELETED);
  }

  if (user.role === 'superAdmin') {
    const activeSuperAdminCount = await User.countDocuments({
      role: 'superAdmin',
      isDeleted: false,
    });
    if (activeSuperAdminCount <= 1) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        ADMIN_ERROR_MESSAGES.CANNOT_DELETE_LAST_SUPERADMIN,
      );
    }
  }

  const deletedUser = await User.findByIdAndUpdate(
    id,
    { isDeleted: true, status: 'blocked', deletedAt: new Date() },
    { new: true },
  ).select('-password');

  // Audit log
  if (requestingUser) {
    await writeAuditLog({
      action: 'SOFT_DELETE_USER',
      actorId: requestingUser._id.toString(),
      actorEmail: requestingUser.email,
      actorRole: requestingUser.role || 'unknown',
      target: id,
      targetType: 'user',
      details: { deletedEmail: user.email },
    });
  }

  return deletedUser;
};

// ─── Bulk Operations ─────────────────────────────────────────────
/**
 * Perform a bulk action on multiple users at once.
 */
const bulkUpdateUsers = async (
  payload: TBulkUserUpdate,
  requestingUserId: string,
): Promise<{ modifiedCount: number }> => {
  const { userIds, action } = payload;

  const requestingUser = await User.findOne({ id: requestingUserId });
  if (!requestingUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Requesting user not found');
  }

  // Prevent self-modification
  const selfId = requestingUser._id.toString();
  if (userIds.includes(selfId)) {
    throw new AppError(httpStatus.FORBIDDEN, ADMIN_ERROR_MESSAGES.CANNOT_MODIFY_SELF);
  }

  let updatePayload = {};
  switch (action) {
    case 'activate':
      updatePayload = { status: 'active' };
      break;
    case 'block':
      updatePayload = { status: 'blocked' };
      break;
    case 'delete':
      updatePayload = { isDeleted: true, status: 'blocked', deletedAt: new Date() };
      break;
    default:
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid bulk action');
  }

  const result = await User.updateMany(
    { _id: { $in: userIds }, isDeleted: false },
    updatePayload,
  );

  // Audit log
  await writeAuditLog({
    action: `BULK_${action.toUpperCase()}_USERS`,
    actorId: requestingUser._id.toString(),
    actorEmail: requestingUser.email,
    actorRole: requestingUser.role || 'unknown',
    targetType: 'user',
    details: { userIds, modifiedCount: result.modifiedCount },
  });

  return { modifiedCount: result.modifiedCount };
};

// ─── Case Oversight ──────────────────────────────────────────────
/**
 * Get aggregated case statistics for admin oversight.
 */
const getCaseOverview = async (): Promise<any> => {
  try {
    // Dynamically import Case model to avoid circular dependencies
    const { Case } = await import('../case/case.model');

    const [totalCases, statusAgg, recentCases] = await Promise.all([
      Case.countDocuments({ isDeleted: false }),
      Case.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Case.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title status caseNumber createdAt'),
    ]);

    const casesByStatus: Record<string, number> = {};
    statusAgg.forEach((s: any) => {
      casesByStatus[s._id || 'unknown'] = s.count;
    });

    return {
      totalCases,
      activeCases: casesByStatus['active'] || 0,
      pendingCases: casesByStatus['pending'] || 0,
      reviewCases: casesByStatus['review'] || 0,
      closedCases: casesByStatus['closed'] || 0,
      casesByStatus,
      recentCases,
    };
  } catch {
    // Case model may not exist yet in isolated module tests
    return {
      totalCases: 0,
      activeCases: 0,
      pendingCases: 0,
      reviewCases: 0,
      closedCases: 0,
      casesByStatus: {},
      recentCases: [],
    };
  }
};

// ─── System Settings ─────────────────────────────────────────────
/**
 * Get current system settings.
 */
const getSystemSettings = async () => {
  return getOrCreateSettings();
};

/**
 * Update system settings.
 */
const updateSystemSettings = async (
  updates: TSystemSettingsUpdate,
  requestingUserId: string,
) => {
  const requestingUser = await User.findOne({ id: requestingUserId });

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { ...updates, updatedBy: requestingUserId },
    { new: true, upsert: true },
  );

  // Audit log
  if (requestingUser) {
    await writeAuditLog({
      action: 'UPDATE_SYSTEM_SETTINGS',
      actorId: requestingUser._id.toString(),
      actorEmail: requestingUser.email,
      actorRole: requestingUser.role || 'unknown',
      targetType: 'setting',
      details: { updatedFields: Object.keys(updates) },
    });
  }

  return settings;
};

// ─── Analytics Overview ──────────────────────────────────────────
/**
 * Get a high-level analytics summary for the admin dashboard.
 */
const getAnalyticsOverview = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    recentRegistrations,
    roleAgg,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, status: 'active' }),
    User.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
    User.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ]);

  const usersByRole: Record<string, number> = {};
  roleAgg.forEach((r: any) => {
    usersByRole[r._id || 'unknown'] = r.count;
  });

  // Try to get case and document counts
  let totalCases = 0;
  let totalDocuments = 0;
  try {
    const { Case } = await import('../case/case.model');
    totalCases = await Case.countDocuments({ isDeleted: false });
  } catch { /* module may not be loaded */ }
  try {
    const { DocumentModel } = await import('../document/document.model');
    totalDocuments = await DocumentModel.countDocuments({});
  } catch { /* module may not be loaded */ }

  return {
    totalUsers,
    activeUsers,
    totalCases,
    totalDocuments,
    recentRegistrations,
    usersByRole,
  };
};

// ─── Audit Logs ──────────────────────────────────────────────────
/**
 * Retrieve paginated audit log entries with optional filters.
 */
const getAuditLogs = async (
  filters: TAuditLogFilter,
  options: TPaginationOptions,
) => {
  const conditions: any[] = [];

  if (filters.action) conditions.push({ action: filters.action });
  if (filters.actorId) conditions.push({ actor: filters.actorId });
  if (filters.targetType) conditions.push({ targetType: filters.targetType });
  if (filters.startDate || filters.endDate) {
    const dateFilter: any = {};
    if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
    conditions.push({ createdAt: dateFilter });
  }

  const where = conditions.length ? { $and: conditions } : {};

  const [data, total] = await Promise.all([
    AuditLog.find(where)
      .populate('actor', 'fullName email role')
      .skip(options.skip)
      .limit(options.limit)
      .sort(options.sort || '-createdAt'),
    AuditLog.countDocuments(where),
  ]);

  return {
    meta: { total, page: options.page, limit: options.limit },
    data,
  };
};

// ─── Lawyer Verification ─────────────────────────────────────────
/**
 * Get all lawyer profiles with pending verification status
 */
const getPendingLawyerVerifications = async (options: TPaginationOptions) => {
  const { LawyerProfile } = await import('../user/profile.model');

  const pendingProfiles = await LawyerProfile.find({ verificationStatus: 'pending' })
    .skip(options.skip)
    .limit(options.limit)
    .sort(options.sort || '-createdAt')
    .populate('userId', 'fullName email status avatarUrl id'); // Populate user data

  const total = await LawyerProfile.countDocuments({ verificationStatus: 'pending' });

  return {
    meta: { total, page: options.page, limit: options.limit },
    data: pendingProfiles,
  };
};

/**
 * Approve or Reject a lawyer's verification request
 */
const reviewLawyerVerification = async (
  lawyerId: string,
  status: 'verified' | 'rejected',
  notes: string,
  requestingUserId: string,
) => {
  const { LawyerProfile } = await import('../user/profile.model');
  const requestingUser = await User.findOne({ id: requestingUserId });

  const profile = await LawyerProfile.findOne({ id: lawyerId });
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lawyer profile not found');
  }

  profile.verificationStatus = status;
  if (notes) profile.verificationNotes = notes;
  
  await profile.save();

  // Audit log
  if (requestingUser) {
    await writeAuditLog({
      action: `REVIEW_LAWYER_VERIFICATION`,
      actorId: requestingUser._id.toString(),
      actorEmail: requestingUser.email,
      actorRole: requestingUser.role || 'unknown',
      target: lawyerId,
      targetType: 'user',
      details: { newStatus: status, notes },
    });
  }

  return profile;
};

export const AdminService = {
  // User management
  getAllUsers,
  getSingleUser,
  updateUserRole,
  updateUserStatus,
  softDeleteUser,
  // New WBS-11.1 features
  bulkUpdateUsers,
  getCaseOverview,
  getSystemSettings,
  updateSystemSettings,
  getAnalyticsOverview,
  getAuditLogs,
  // Lawyer Verification
  getPendingLawyerVerifications,
  reviewLawyerVerification,
};

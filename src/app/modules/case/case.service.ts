/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { TCreateCasePayload, TCaseQuery, TUpdateCasePayload } from './case.interface';
import { Case } from './case.model';
import { generateCaseId, generateCaseNumber } from './case.utils';
import { DEFAULT_CASE_FOLDERS } from './case.constant';
import { ActivityService } from '../activity/activity.service';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import { DocumentModel } from '../document/document.model';

/**
 * Create a new case
 */
const createCase = async (userId: string, payload: TCreateCasePayload) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Generate unique case ID
  const caseId = await generateCaseId();

  // Generate unique case number if not provided
  const caseNumber = payload.caseNumber || (await generateCaseNumber());

  // Use default folders if not provided
  const folders = payload.folders || DEFAULT_CASE_FOLDERS;

  // Create case
  const newCase = await Case.create({
    id: caseId,
    caseNumber,
    title: payload.title,
    caseType: payload.caseType,
    urgency: payload.urgency,
    nextDeadline: payload.nextDeadline,
    nextDeadlineDescription: payload.nextDeadlineDescription,
    folders,
    createdBy: user._id,
    progress: 0,
    status: 'active',
    templateId: payload.templateId,
  });

  // Log activity
  await ActivityService.logActivity({
    type: 'case_created',
    message: `New case created: ${newCase.title} (${newCase.caseNumber})`,
    userId: user._id,
    caseId: newCase._id,
  });

  // WBS-5.1: Auto-generate tasks from template
  if (payload.templateId) {
    // We run this asynchronously or await it depending on requirement. 
    // Awaiting ensures case is fully set up before return.
    // We must import TaskGenerator first.
    const { TaskGenerator } = await import('./task.generator');
    await TaskGenerator.generateTasksFromTemplate(newCase.id, payload.templateId, userId);
  }

  return await Case.findById(newCase._id).populate('createdBy', 'id fullName email');
};

/**
 * Get all cases for a user with filtering and pagination
 */
const getAllCases = async (userId: string, query: TCaseQuery) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { search, status, urgency, includeArchived, page = 1, limit = 10 } = query;

  // Build filter
  // Find cases where user is owner OR has shared access
  const sharedCaseAccess = await CaseAccessModel.find({
    userId: user._id,
    status: 'active'
  }).select('caseId');

  const sharedCaseIds = sharedCaseAccess.map(access => access.caseId);

  const accessScope: any[] = [
    { createdBy: user._id },
    { _id: { $in: sharedCaseIds } },
    { clientId: user._id },
  ];

  const filter: any = {
    isDeleted: { $ne: true }
  };

  if (search) {
    filter.$and = [
      { $or: accessScope },
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { caseNumber: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  } else {
    filter.$or = accessScope;
  }

  // Phase 7: Exclude archived by default unless explicitly requested
  if (!includeArchived && !status) {
    filter.status = { $ne: 'archived' };
  }

  if (status) {
    filter.status = status;
  }

  if (urgency) {
    filter.urgency = urgency;
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  const cases = await Case.find(filter)
    .populate('createdBy', 'id fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Case.countDocuments(filter);

  return {
    data: cases,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get a single case by ID
 */
const getCaseById = async (caseId: string, userId: string) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  let caseData = await Case.findOne({ id: caseId }).populate(
    'createdBy',
    'id fullName email',
  );

  if (!caseData && /^[a-fA-F0-9]{24}$/.test(caseId)) {
    caseData = await Case.findById(caseId).populate(
      'createdBy',
      'id fullName email',
    );
  }

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  const isOwner = caseData.createdBy._id.toString() === user._id.toString();
  const isPrimaryClient = caseData.clientId?.toString() === user._id.toString();
  const hasSharedAccess = await CaseAccessModel.exists({
    caseId: caseData._id,
    userId: user._id,
    status: 'active',
  });
  const isPrivileged = user.role === 'admin' || user.role === 'superAdmin';

  if (!isOwner && !isPrimaryClient && !hasSharedAccess && !isPrivileged) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to access this case');
  }

  // Fetch documents for the case
  const documents = await DocumentModel.find({ caseId: caseData._id })
    .populate('uploadedBy', 'id fullName email')
    .sort({ uploadedAt: -1 });

  // Convert mongoose doc to object and attach documents
  const caseObj = caseData.toObject();
  return { ...caseObj, documents };
};

/**
 * Update a case
 */
const updateCase = async (
  caseId: string,
  userId: string,
  payload: TUpdateCasePayload,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const caseData = await Case.findOne({ id: caseId });

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  // Verify user owns the case
  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to update this case');
  }

  // Update case
  const updatedCase = await Case.findOneAndUpdate(
    { id: caseId },
    { $set: payload },
    { new: true, runValidators: true },
  ).populate('createdBy', 'id fullName email');

  // Log activity
  if (updatedCase) {
    await ActivityService.logActivity({
      type: 'case_updated',
      message: `Case updated: ${updatedCase.title}`,
      userId: user._id,
      caseId: updatedCase._id,
    });
  }

  return updatedCase;
};

/**
 * Delete a case (soft delete)
 */
const deleteCase = async (caseId: string, userId: string) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const caseData = await Case.findOne({ id: caseId });

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  // Verify user owns the case
  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to delete this case');
  }

  // Soft delete
  await Case.findOneAndUpdate(
    { _id: caseData._id },
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  return { message: 'Case deleted successfully' };
};

/**
 * Archive a case (WBS-4.2 â€” enhanced with audit trail)
 */
const archiveCase = async (caseId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const caseData = await Case.findOne({ id: caseId });
  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to archive this case');
  }

  if (caseData.status === 'archived') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Case is already archived');
  }

  const archivedCase = await Case.findOneAndUpdate(
    { id: caseId },
    {
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: user._id,
      autoArchiveScheduled: false,
    },
    { new: true },
  ).populate('createdBy', 'id fullName email');

  await ActivityService.logActivity({
    type: 'case_archived',
    message: `Case archived: ${caseData.title}`,
    userId: user._id,
    caseId: caseData._id,
  });

  return archivedCase;
};

/**
 * Restore an archived case (WBS-4.2 â€” enhanced with validation)
 */
const restoreCase = async (caseId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const caseData = await Case.findOne({ id: caseId });
  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to restore this case');
  }

  if (caseData.status !== 'archived') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Case is not archived');
  }

  const restoredCase = await Case.findOneAndUpdate(
    { id: caseId },
    {
      status: 'active',
      archivedAt: null,
      archivedBy: null,
      autoArchiveScheduled: false,
      permanentDeleteAt: null,
    },
    { new: true },
  ).populate('createdBy', 'id fullName email');

  await ActivityService.logActivity({
    type: 'case_restored',
    message: `Case restored: ${caseData.title}`,
    userId: user._id,
    caseId: caseData._id,
  });

  return restoredCase;
};

/**
 * Get archived cases with search/pagination (WBS-4.2)
 */
const getArchivedCases = async (userId: string, query: TCaseQuery) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { search, page = 1, limit = 10 } = query;

  const filter: any = {
    createdBy: user._id,
    status: 'archived',
    isDeleted: { $ne: true },
  };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { caseNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const cases = await Case.find(filter)
    .populate('createdBy', 'id fullName email')
    .populate('archivedBy', 'id fullName email')
    .sort({ archivedAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Case.countDocuments(filter);

  return {
    data: cases,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Permanent delete a case (WBS-4.2 â€” admin/owner only, requires archived status)
 */
const permanentDeleteCase = async (caseId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const caseData = await Case.findOne({ id: caseId });
  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  // Only owner or admin can permanently delete
  const isOwner = caseData.createdBy.toString() === user._id.toString();
  const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

  if (!isOwner && !isAdmin) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to permanently delete this case');
  }

  if (caseData.status !== 'archived') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Case must be archived before permanent deletion');
  }

  await Case.findOneAndDelete({ id: caseId });

  await ActivityService.logActivity({
    type: 'case_deleted',
    message: `Case permanently deleted: ${caseData.title} (${caseData.caseNumber})`,
    userId: user._id,
    caseId: caseData._id,
  });

  return { message: 'Case permanently deleted' };
};

/**
 * Check for duplicate cases (WBS-5.1)
 */
const checkDuplicateCase = async (userId: string, title: string, caseNumber?: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const conditions: any[] = [];

  if (title) {
    conditions.push({ title: { $regex: title, $options: 'i' }, createdBy: user._id });
  }
  if (caseNumber) {
    conditions.push({ caseNumber: { $regex: caseNumber, $options: 'i' } });
  }

  if (conditions.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  const matches = await Case.find({
    $or: conditions,
    isDeleted: { $ne: true },
  })
    .select('id title caseNumber status caseType createdAt')
    .limit(5);

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
};

/**
 * Auto-archive check: archive cases inactive for >30 days (WBS-4.2)
 * Called by the cron scheduler.
 */
const autoArchiveCheck = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Case.updateMany(
    {
      status: { $in: ['active', 'pending'] },
      updatedAt: { $lt: thirtyDaysAgo },
      isDeleted: { $ne: true },
      autoArchiveScheduled: { $ne: true },
    },
    {
      $set: {
        status: 'archived',
        archivedAt: new Date(),
        autoArchiveScheduled: true,
      },
    },
  );

  return { archivedCount: result.modifiedCount };
};

export const CaseServices = {
  createCase,
  getAllCases,
  getCaseById,
  updateCase,
  deleteCase,
  archiveCase,
  restoreCase,
  getArchivedCases,
  permanentDeleteCase,
  checkDuplicateCase,
  autoArchiveCheck,
};

import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CaseServices } from './case.service';
import { CASE_TEMPLATES } from './case.template';

/**
 * Create a new case
 * POST /cases
 */
const createCase = catchAsync(async (req, res) => {
  const { userId } = req.user;

  // Map frontend fields to backend model fields
  const payload = {
    ...req.body,
    caseNumber: req.body.ref || req.body.caseNumber,
    caseType: req.body.type || req.body.caseType,
    urgency: req.body.priority || req.body.urgency,
    // description: req.body.description // Model doesn't seem to have description in create payload type, need to check interface?
  };

  const result = await CaseServices.createCase(userId, payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Case created successfully',
    data: result,
  });
});

/**
 * Get all cases with filters
 * GET /cases
 */
const getAllCases = catchAsync(async (req, res) => {
  const { userId } = req.user;

  const result = await CaseServices.getAllCases(userId, req.query);

  const mappedData = result.data.map((c: any) => ({
    id: c.id,
    title: c.title,
    ref: c.caseNumber,
    type: c.caseType,
    status: c.status,
    urgency: c.urgency,
    nextDeadline: c.nextDeadline,
    progress: c.progress
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cases retrieved successfully',
    data: mappedData,
    meta: result.meta,
  });
});

/**
 * Get a single case by ID
 * GET /cases/:caseId
 */
const getCaseById = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.getCaseById(caseId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case retrieved successfully',
    data: result,
  });
});

/**
 * Update a case
 * PUT /cases/:caseId
 */
const updateCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.updateCase(caseId, userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case updated successfully',
    data: result,
  });
});

/**
 * Delete a case
 * DELETE /cases/:caseId
 */
const deleteCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.deleteCase(caseId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Archive a case (Phase 7)
 * PATCH /cases/:caseId/archive
 */
const archiveCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.archiveCase(caseId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case archived successfully',
    data: result,
  });
});

/**
 * Restore an archived case (Phase 7)
 * PATCH /cases/:caseId/restore
 */
const restoreCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.restoreCase(caseId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case restored successfully',
    data: result,
  });
});

/**
 * WBS-4.2: Get archived cases
 * GET /cases/archived
 */
const getArchivedCases = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await CaseServices.getArchivedCases(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived cases retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * WBS-4.2: Permanent delete a case
 * DELETE /cases/:caseId/permanent
 */
const permanentDeleteCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await CaseServices.permanentDeleteCase(caseId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * WBS-5.1: Check for duplicate cases
 * POST /cases/check-duplicate
 */
const checkDuplicateCase = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { title, caseNumber } = req.body;

  const result = await CaseServices.checkDuplicateCase(userId, title, caseNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isDuplicate ? 'Potential duplicates found' : 'No duplicates found',
    data: result,
  });
});

/**
 * WBS-5.1: Get case templates
 * GET /cases/templates
 */
const getCaseTemplates = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case templates retrieved',
    data: CASE_TEMPLATES,
  });
});

export const CaseControllers = {
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
  getCaseTemplates,
};

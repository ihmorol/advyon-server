import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CaseAccessService } from './caseAccess.service';

const shareCase = catchAsync(async (req: Request, res: Response) => {
  const result = await CaseAccessService.shareCaseWithUser(
    req.body, 
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Case shared successfully',
    data: result,
  });
});

const getCaseSharedUsers = catchAsync(async (req: Request, res: Response) => {
  const { caseId } = req.params;
  const result = await CaseAccessService.getSharedUsersForCase(caseId, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Shared users fetched successfully',
    data: result,
  });
});

const revokeCaseAccess = catchAsync(async (req: Request, res: Response) => {
  const { caseId, userId } = req.params;
  const result = await CaseAccessService.revokeAccess(caseId, userId, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Access revoked successfully',
    data: result,
  });
});

export const CaseAccessController = {
  shareCase,
  getCaseSharedUsers,
  revokeCaseAccess,
};

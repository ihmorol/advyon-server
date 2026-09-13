import { Types } from 'mongoose';
import { CaseAccessModel } from './caseAccess.model';
import { TAccessRole } from './caseAccess.interface';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';
import AppError from '../../errors/appError';
import httpStatus from 'http-status';

type TShareCasePayload = {
  caseId?: string;
  email?: string;
  userId?: string;
  role?: TAccessRole;
  expiresAt?: Date;
};

const resolveUserByIdentifier = async (identifier: string) => {
  if (!identifier) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User identifier is required');
  }

  let user = null;
  const looksLikeEmail = identifier.includes('@');

  if (looksLikeEmail) {
    user = await User.findOne({ email: identifier });
  } else if (Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier);
    if (!user) {
      user = await User.findOne({ id: identifier });
    }
  } else {
    user = await User.findOne({ id: identifier });
    if (!user) {
      user = await User.findOne({ email: identifier });
    }
  }

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const resolveCaseByIdentifier = async (caseId: string) => {
  if (!caseId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'caseId is required');
  }

  let caseData = null;

  if (Types.ObjectId.isValid(caseId)) {
    caseData = await Case.findById(caseId);
  }

  if (!caseData) {
    caseData = await Case.findOne({ id: caseId });
  }

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  return caseData;
};

const canManageCase = (granter: { role?: string; _id: Types.ObjectId }, caseData: { createdBy: Types.ObjectId }) => {
  if (granter.role === 'admin' || granter.role === 'superAdmin') {
    return true;
  }

  return caseData.createdBy.toString() === granter._id.toString();
};

const shareCaseWithUser = async (payload: TShareCasePayload, granterUserId: string) => {
  const granter = await resolveUserByIdentifier(granterUserId);
  const caseData = await resolveCaseByIdentifier(payload.caseId as string);

  if (!canManageCase(granter, caseData)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to share this case');
  }

  const recipientIdentifier = payload.email || payload.userId;
  if (!recipientIdentifier) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide recipient email or userId');
  }

  const recipient = await resolveUserByIdentifier(recipientIdentifier);

  if (recipient._id.toString() === granter._id.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot share a case with yourself');
  }

  const result = await CaseAccessModel.findOneAndUpdate(
    { caseId: caseData._id, userId: recipient._id },
    {
      caseId: caseData._id,
      userId: recipient._id,
      grantedBy: granter._id,
      role: payload.role || 'viewer',
      expiresAt: payload.expiresAt,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .populate('userId', 'id fullName email avatarUrl role')
    .populate('caseId', 'id title caseNumber');

  return result;
};

const getSharedUsersForCase = async (caseId: string, requesterUserId: string) => {
  const requester = await resolveUserByIdentifier(requesterUserId);
  const caseData = await resolveCaseByIdentifier(caseId);

  if (!canManageCase(requester, caseData)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to view case members');
  }

  const result = await CaseAccessModel.find({ caseId: caseData._id, status: 'active' })
    .populate('userId', 'fullName email profileImg')
    .sort({ createdAt: -1 });

  return result;
};

const revokeAccess = async (caseId: string, userId: string, requesterUserId: string) => {
  const requester = await resolveUserByIdentifier(requesterUserId);
  const caseData = await resolveCaseByIdentifier(caseId);

  if (!canManageCase(requester, caseData)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to revoke case access');
  }

  const targetUser = await resolveUserByIdentifier(userId);

  const result = await CaseAccessModel.findOneAndUpdate(
    { caseId: caseData._id, userId: targetUser._id },
    { status: 'revoked' },
    { new: true },
  );

  return result;
};

export const CaseAccessService = {
  shareCaseWithUser,
  getSharedUsersForCase,
  revokeAccess,
};

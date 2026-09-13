/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../../config';
import AppError from '../../errors/appError';
import { TUser } from './user.interface';
import { User } from './user.model';
import { Case } from '../case/case.model';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import { ClientProfile, JudgeProfile, LawyerProfile } from './profile.model';
import {
  generateAdminId,
  generateClientId,
  generateJudgeId,
  generateLawyerId,
} from './user.utils';
import { UserRole } from './user-role.model';
import { Role } from './role.model';

const createUser = async (file: any, payload: any) => {
  const { password, user: userData, client, lawyer, judge } = payload;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    userData.password = password || (config.default_password as string);

    let generatedId = '';
    if (userData.role === 'client') {
      generatedId = await generateClientId();
    } else if (userData.role === 'lawyer') {
      generatedId = await generateLawyerId();
    } else if (userData.role === 'judge') {
      generatedId = await generateJudgeId();
    } else if (userData.role === 'admin') {
      generatedId = await generateAdminId();
    } else {
      // Fallback or error
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid role for user creation');
    }

    userData.id = generatedId;

    // Create User
    const newUser = await User.create([userData], { session });

    if (!newUser.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create user');
    }

    const userId = newUser[0].id;
    const user_id = newUser[0]._id; // ObjectId

    // Create Profile based on role
    if (userData.role === 'client' && client) {
      client.id = userId;
      client.userId = user_id;
      await ClientProfile.create([client], { session });
    } else if (userData.role === 'lawyer' && lawyer) {
      lawyer.id = userId;
      lawyer.userId = user_id;
      await LawyerProfile.create([lawyer], { session });
    } else if (userData.role === 'judge' && judge) {
      judge.id = userId;
      judge.userId = user_id;
      await JudgeProfile.create([judge], { session });
    }

    await session.commitTransaction();
    await session.endSession();

    return newUser[0];
  } catch (err: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(err);
  }
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const users = await User.find(query);
  return users;
};

const getSingleUser = async (id: string) => {
  const user = await User.findOne({ id });
  return user;
};

const updateUser = async (id: string, payload: Partial<TUser>) => {
  const result = await User.findOneAndUpdate({ id }, payload, {
    new: true,
  });
  return result;
};

const deleteUser = async (id: string) => {
  const result = await User.findOneAndUpdate(
    { id },
    { isDeleted: true },
    { new: true },
  );
  return result;
};


const getMyProfile = async (userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Fetch basic details including role
  const profile: any = {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.fullName,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    preferredLanguage: user.preferredLanguage,
    timezone: user.timezone,
    isEmailVerified: user.isEmailVerified,
    phone: '', // Placeholder
    address: '', // Placeholder
  };

  // Try to fetch additional details from role-specific profiles
  // This is a simplified lookup; in a real app, we'd use the relationship
  // Assuming the user.id is the link or user._id
  let roleProfile: any;
  if (user.role === 'client') {
    roleProfile = await ClientProfile.findOne({ id: userId });
  } else if (user.role === 'lawyer') {
    roleProfile = await LawyerProfile.findOne({ id: userId });
  } else if (user.role === 'judge') {
    roleProfile = await JudgeProfile.findOne({ id: userId });
  }

  if (roleProfile) {
    profile.phone = roleProfile.phoneNumber || roleProfile.contactNumber || '';
    profile.address = roleProfile.address || '';
    if (user.role === 'lawyer' || user.role === 'judge') {
      profile.verificationStatus = roleProfile.verificationStatus || 'pending';
      profile.verificationNotes = roleProfile.verificationNotes || '';
    }
  }

  return profile;
};

// Phase 1.1: Get User Preferences
const getPreferences = async (userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Return preferences with defaults if not set
  return user.preferences || {
    theme: 'system',
    notifications: {
      emailDigest: true,
      pushAlerts: false,
      hearingReminders: true,
    },
    dashboardConfig: {
      showActivityFeed: true,
      showAIInsights: true,
      defaultView: 'classic',
    },
  };
};

// Phase 1.1: Update User Preferences
const updatePreferences = async (userId: string, preferences: any) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Merge existing preferences with new ones (deep merge)
  const currentPrefs = user.preferences as any || {};
  const mergedPreferences = {
    theme: preferences.theme ?? currentPrefs.theme ?? 'system',
    notifications: {
      emailDigest: preferences.notifications?.emailDigest ?? currentPrefs.notifications?.emailDigest ?? true,
      pushAlerts: preferences.notifications?.pushAlerts ?? currentPrefs.notifications?.pushAlerts ?? false,
      hearingReminders: preferences.notifications?.hearingReminders ?? currentPrefs.notifications?.hearingReminders ?? true,
    },
    dashboardConfig: {
      showActivityFeed: preferences.dashboardConfig?.showActivityFeed ?? currentPrefs.dashboardConfig?.showActivityFeed ?? true,
      showAIInsights: preferences.dashboardConfig?.showAIInsights ?? currentPrefs.dashboardConfig?.showAIInsights ?? true,
      defaultView: preferences.dashboardConfig?.defaultView ?? currentPrefs.dashboardConfig?.defaultView ?? 'classic',
    },
  };

  const result = await User.findOneAndUpdate(
    { id: userId },
    { preferences: mergedPreferences },
    { new: true }
  );

  return result?.preferences;
};

// Update own profile (for profile page)
const updateMyProfile = async (userId: string, payload: Partial<TUser>) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Fields that can be updated by the user (exclude sensitive fields like email, role, password)
  const allowedFields = [
    'fullName',
    'displayName',
    'avatarUrl',
    'preferredLanguage',
    'timezone',
    'phone',
    'address',
    'bio',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if ((payload as any)[field] !== undefined) {
      updateData[field] = (payload as any)[field];
    }
  }

  const result = await User.findOneAndUpdate(
    { id: userId },
    updateData,
    { new: true }
  );

  return result;
};

// Change password
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findOne({ id: userId }).select('+password');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if current password is correct
  if (user.password) {
    const isPasswordValid = await User.isPasswordMatched(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Current password is incorrect');
    }
  }

  // Hash and update new password
  const bcrypt = await import('bcrypt');
  const saltRounds = Number(config.bcrypt_salt_rounds) || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const result = await User.findOneAndUpdate(
    { id: userId },
    {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      needsPasswordChange: false,
    },
    { new: true }
  );

  return { message: 'Password changed successfully' };
};

// Phase 2: Get Lawyers Clients
const getLawyerClients = async (lawyerId: string) => {
  const user = await User.findOne({ id: lawyerId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lawyer not found');
  }

  // Find cases created by this lawyer
  const cases = await Case.find({ createdBy: user._id });
  const caseIds = cases.map((c) => c._id);

  // Find users with access to these cases
  const accesses = await CaseAccessModel.find({
    caseId: { $in: caseIds },
    status: 'active',
  })
    .populate('userId')
    .populate('caseId', 'id caseNumber title');

  // Extract unique clients
  const uniqueClients = new Map<string, any>();

  for (const access of accesses) {
    const clientUser = access.userId as any; // Populated user
    if (clientUser && clientUser.role === 'client') {
      if (!uniqueClients.has(clientUser.id)) {
        // Fetch client profile for additional details
        const clientProfile = await ClientProfile.findOne({ userId: clientUser._id });

        uniqueClients.set(clientUser.id, {
          id: clientUser.id,
          fullName: clientUser.fullName,
          email: clientUser.email,
          displayName: clientUser.displayName,
          avatarUrl: clientUser.avatarUrl,
          phone: clientProfile?.phoneNumber || '',
          address: clientProfile?.address || '',
          accessStatus: access.status, // Status in the case
          caseId: (access.caseId as any)?.id || String(access.caseId),
        });
      }
    }
  }

  // Also getting users who are explicitly clientId in Case model
  const casesWithClientId = await Case.find({
    createdBy: user._id,
    clientId: { $exists: true }
  }).populate('clientId');

  for (const c of casesWithClientId) {
    const clientUser = c.clientId as any;
    if (clientUser && !uniqueClients.has(clientUser.id)) {
      const clientProfile = await ClientProfile.findOne({ userId: clientUser._id });
      uniqueClients.set(clientUser.id, {
        id: clientUser.id,
        fullName: clientUser.fullName,
        email: clientUser.email,
        displayName: clientUser.displayName,
        avatarUrl: clientUser.avatarUrl,
        phone: clientProfile?.phoneNumber || '',
        address: clientProfile?.address || '',
        accessStatus: 'primary',
        caseId: c._id,
      });
    }
  }

  return Array.from(uniqueClients.values());
};

/**
 * WBS-7.1: Get Client Detail with aggregated info
 */
const getClientDetail = async (clientId: string) => {
  // 1. Get User info
  const clientUser = await User.findOne({ id: clientId });
  if (!clientUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'Client not found');
  }

  // 2. Get Profile info
  const clientProfile = await ClientProfile.findOne({ userId: clientUser._id });

  // 3. Get Associated Cases
  // Cases where they are the primary client or have access
  const primaryCases = await Case.find({ clientId: clientUser._id });

  // Also check CaseAccess
  const accessRecords = await CaseAccessModel.find({ userId: clientUser._id }).populate('caseId');
  const accessCases = accessRecords.map(a => a.caseId);

  // Merge cases (dedup)
  const allCasesMap = new Map();
  primaryCases.forEach(c => allCasesMap.set(c.id, c));
  accessCases.forEach((c: any) => allCasesMap.set(c.id, c));

  // 4. Billing stub
  const billingHistory = [
    { id: 'inv-001', date: '2023-11-01', amount: 500, status: 'paid' },
    { id: 'inv-002', date: '2023-12-01', amount: 350, status: 'pending' },
  ];

  return {
    user: {
      id: clientUser.id,
      fullName: clientUser.fullName,
      email: clientUser.email,
      phone: clientProfile?.phoneNumber,
      address: clientProfile?.address,
      avatarUrl: clientUser.avatarUrl,
    },
    cases: Array.from(allCasesMap.values()),
    billing: billingHistory,
    stats: {
      totalCases: allCasesMap.size,
      openCases: Array.from(allCasesMap.values()).filter((c: any) => c.status !== 'closed' && c.status !== 'archived').length,
    }
  };
};

/**
 * Archive Client (Soft delete)
 */
const archiveClient = async (clientId: string) => {
  const result = await User.findOneAndUpdate(
    { id: clientId },
    { status: 'inactive' }, // Or isDeleted: true? 'archived' status not in enum yet, using 'inactive'
    { new: true }
  );
  return result;
};

/**
 * Get all lawyers with their profiles for the lawyer directory.
 * Supports search (by name), filter (by practiceArea), and pagination.
 */
const getAllLawyers = async (query: Record<string, unknown>) => {
  const {
    search,
    practiceArea,
    page = 1,
    limit = 12,
  } = query as {
    search?: string;
    practiceArea?: string;
    page?: number;
    limit?: number;
  };

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build user filter
  const userFilter: Record<string, unknown> = {
    role: 'lawyer',
    isDeleted: { $ne: true },
    status: 'active',
  };

  if (search) {
    userFilter.fullName = { $regex: search, $options: 'i' };
  }

  // Get all matching lawyer users
  const totalUsers = await User.countDocuments(userFilter);
  const lawyerUsers = await User.find(userFilter)
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 });

  // Get lawyer profiles for these users
  const userIds = lawyerUsers.map((u) => u._id);
  const profiles = await LawyerProfile.find({ userId: { $in: userIds } });
  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  // Merge & optionally filter by practiceArea
  let results = lawyerUsers.map((user) => {
    const profile = profileMap.get(String(user._id));
    return {
      id: user.id,
      fullName: user.fullName,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      phone: user.phone,
      address: user.address,
      // Lawyer-specific fields
      barRegistrationNumber: profile?.barRegistrationNumber || '',
      barCouncilName: profile?.barCouncilName || '',
      yearsOfExperience: profile?.yearsOfExperience || 0,
      primaryPracticeArea: profile?.primaryPracticeArea || '',
      verificationStatus: profile?.verificationStatus || 'pending',
    };
  });

  // Filter by practice area if specified
  if (practiceArea && practiceArea !== 'all') {
    results = results.filter(
      (r) => r.primaryPracticeArea.toLowerCase() === practiceArea.toLowerCase(),
    );
  }

  return {
    lawyers: results,
    meta: {
      total: practiceArea && practiceArea !== 'all' ? results.length : totalUsers,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(
        (practiceArea && practiceArea !== 'all' ? results.length : totalUsers) / limitNum,
      ),
    },
  };
};

/**
 * Submit Lawyer Verification Request
 */
const submitVerificationRequest = async (userId: string, payload: any) => {
  // Find lawyer profile by custom user id
  const profile = await LawyerProfile.findOne({ id: userId });
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lawyer profile not found');
  }

  const { barRegistrationNumber, barCouncilName } = payload;
  
  const updateData: any = { verificationStatus: 'pending' };
  if (barRegistrationNumber) updateData.barRegistrationNumber = barRegistrationNumber;
  if (barCouncilName) updateData.barCouncilName = barCouncilName;

  const updatedProfile = await LawyerProfile.findOneAndUpdate(
    { id: userId },
    updateData,
    { new: true }
  );

  return updatedProfile;
};

export const UserServices = {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  getMyProfile,
  getPreferences,
  updatePreferences,
  updateMyProfile,
  changePassword,
  getLawyerClients,
  getClientDetail, // WBS-7.1
  archiveClient,   // WBS-7.1
  getAllLawyers,    // Lawyer Directory
  addClient: createUser, // Reusing create for now, logic handled by role payload
  submitVerificationRequest,
};

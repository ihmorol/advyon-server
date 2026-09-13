/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import {
  ClientProfile,
  LawyerProfile,
  JudgeProfile,
} from '../user/profile.model';
import { TOnboardPayload, TUpdateProfilePayload } from './auth.interface';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { generateUserId, getUserWithProfile } from './auth.utils';

/**
 * Sync user from Clerk
 * Creates a new user if doesn't exist, returns existing user otherwise
 */
const syncUserFromClerk = async (clerkUserId: string, email: string) => {
  // Fetch from Clerk API to get the latest email and profile picture
  let clerkUser: any;
  let finalEmail = email;
  let avatarUrl = '';
  try {
    clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (!finalEmail && clerkUser?.emailAddresses?.length > 0) {
      const primaryEmail = clerkUser.emailAddresses.find((e: any) => e.id === clerkUser.primaryEmailAddressId);
      finalEmail = primaryEmail ? primaryEmail.emailAddress : clerkUser.emailAddresses[0].emailAddress;
    }
    if (clerkUser?.imageUrl) {
      avatarUrl = clerkUser.imageUrl;
    }
  } catch (error) {
    console.error('Failed to fetch user from Clerk:', error);
  }

  // Check if user already exists
  let existingUser = await User.findOne({ clerkUserId });
  
  if (!existingUser && finalEmail) {
    // Check if user exists by email (legacy user or first time logging in with this email via Clerk)
    existingUser = await User.findOne({ email: finalEmail });
    
    if (existingUser) {
      // Link Clerk ID to existing user
      existingUser.clerkUserId = clerkUserId;
    }
  }

  if (existingUser) {
    // Update last login time and sync latest avatar
    existingUser.lastLoginAt = new Date();
    if (avatarUrl && existingUser.avatarUrl !== avatarUrl) {
      existingUser.avatarUrl = avatarUrl;
    }
    await existingUser.save();

    return {
      id: existingUser.id,
      clerkUserId: existingUser.clerkUserId,
      email: existingUser.email,
      role: existingUser.role,
      status: existingUser.status,
      needsOnboarding:
        existingUser.status === 'in-progress' || !existingUser.role,
    };
  }

  // Create new user with temporary default role
  const userId = await generateUserId('client'); // Temporary default

  // Final fallback: create a UNIQUE placeholder to avoid E11000 duplicate key error.
  if (!finalEmail) {
      finalEmail = `guest_${clerkUserId}@advyon.com`.toLowerCase();
  } else {
     // Check one last time if email became taken by race condition (optional, but good practice)
     const emailCheck = await User.findOne({ email: finalEmail });
     if (emailCheck) {
        // If we found it now, link and return
        emailCheck.clerkUserId = clerkUserId;
        emailCheck.lastLoginAt = new Date();
        await emailCheck.save();
        return {
            id: emailCheck.id,
            clerkUserId: emailCheck.clerkUserId,
            email: emailCheck.email,
            role: emailCheck.role,
            status: emailCheck.status,
            needsOnboarding: emailCheck.status === 'in-progress' || !emailCheck.role,
        };
     }
  }

  const newUser = await User.create({
    id: userId,
    clerkUserId,
    email: finalEmail,
    role: 'client', // Temporary default, will be set during onboarding
    status: 'in-progress',
    fullName: clerkUser?.firstName 
                ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
                : 'Guest User',
    avatarUrl,
    isEmailVerified: true, // Clerk handles email verification
    needsPasswordChange: false, // Clerk handles authentication
    lastLoginAt: new Date(),
  });

  return {
    id: newUser.id,
    clerkUserId: newUser.clerkUserId,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status,
    needsOnboarding: true,
  };
};

/**
 * Onboard user with role selection and profile creation
 */
const onboardUser = async (clerkUserId: string, payload: TOnboardPayload) => {
  // Find user by Clerk ID
  const user = await User.findOne({ clerkUserId });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if user can change role
  const canChangeRole =
    user.status === 'in-progress' ||
    (user.status === 'active' && (!user.role || user.role === 'client'));

  if (!canChangeRole) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Role has already been set and cannot be changed',
    );
  }

  // If role is changing, generate new ID
  let newUserId = user.id;
  if (user.role !== payload.role) {
    newUserId = await generateUserId(payload.role);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Update user data
    user.id = newUserId;
    user.role = payload.role;
    user.fullName = payload.profile.fullName;
    user.displayName = payload.profile.displayName;
    user.avatarUrl = payload.profile.avatarUrl;
    user.preferredLanguage = payload.profile.preferredLanguage;
    user.timezone = payload.profile.timezone;
    user.status = 'active';

    await user.save({ session });

    // Create role-specific profile
    let profile: any = null;

    switch (payload.role) {
      case 'client':
        profile = await ClientProfile.create(
          [
            {
              id: `CP-${newUserId}`,
              userId: user._id,
              phoneNumber: payload.profile.phone,
              address: payload.profile.address,
            },
          ],
          { session },
        );
        break;

      case 'lawyer':
        profile = await LawyerProfile.create(
          [
            {
              id: `LP-${newUserId}`,
              userId: user._id,
              barRegistrationNumber: payload.profile.barRegistrationNumber!,
              barCouncilName: payload.profile.barCouncilName!,
              yearsOfExperience: payload.profile.yearsOfExperience,
              primaryPracticeArea: payload.profile.primaryPracticeArea,
              verificationStatus: 'pending',
            },
          ],
          { session },
        );
        break;

      case 'judge':
        profile = await JudgeProfile.create(
          [
            {
              id: `JP-${newUserId}`,
              userId: user._id,
              courtName: payload.profile.courtName!,
              designation: payload.profile.designation!,
              verificationStatus: 'pending',
            },
          ],
          { session },
        );
        break;
    }

    await session.commitTransaction();
    await session.endSession();

    // Return user with profile
    return await getUserWithProfile(newUserId, payload.role);
  } catch (error: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to onboard user',
    );
  }
};

/**
 * Get current user with profile
 */
const getCurrentUser = async (clerkUserId: string) => {
  const user = await User.findOne({ clerkUserId });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User has not completed onboarding',
    );
  }

  return await getUserWithProfile(user.id, user.role);
};

/**
 * Update user profile
 */
const updateUserProfile = async (
  clerkUserId: string,
  payload: TUpdateProfilePayload,
) => {
  const user = await User.findOne({ clerkUserId });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.status !== 'active') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User must complete onboarding first',
    );
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Update user fields
    if (payload.fullName) user.fullName = payload.fullName;
    if (payload.displayName !== undefined)
      user.displayName = payload.displayName;
    if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;
    if (payload.preferredLanguage !== undefined)
      user.preferredLanguage = payload.preferredLanguage;
    if (payload.timezone !== undefined) user.timezone = payload.timezone;

    await user.save({ session });

    // Update role-specific profile
    switch (user.role) {
      case 'client':
        await ClientProfile.findOneAndUpdate(
          { userId: user._id },
          {
            phoneNumber: payload.phone,
            address: payload.address,
          },
          { session, new: true },
        );
        break;

      case 'lawyer':
        await LawyerProfile.findOneAndUpdate(
          { userId: user._id },
          {
            barRegistrationNumber: payload.barRegistrationNumber,
            barCouncilName: payload.barCouncilName,
            yearsOfExperience: payload.yearsOfExperience,
            primaryPracticeArea: payload.primaryPracticeArea,
          },
          { session, new: true },
        );
        break;

      case 'judge':
        await JudgeProfile.findOneAndUpdate(
          { userId: user._id },
          {
            courtName: payload.courtName,
            designation: payload.designation,
          },
          { session, new: true },
        );
        break;
    }

    await session.commitTransaction();
    await session.endSession();

    return await getUserWithProfile(user.id, user.role);
  } catch (error: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to update profile',
    );
  }
};

export const AuthServices = {
  syncUserFromClerk,
  onboardUser,
  getCurrentUser,
  updateUserProfile,
};

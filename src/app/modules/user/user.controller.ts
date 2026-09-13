import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { PersonalizationService } from './personalization.service';

const createUser = catchAsync(async (req, res) => {
  const result = await UserServices.createUser(req.file, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is created succesfully',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsers(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    data: result,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.getSingleUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.updateUser(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User updated successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.deleteUser(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});


const getMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.getMyProfile(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

// Phase 1.1: Get My Preferences
const getMyPreferences = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.getPreferences(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User preferences retrieved successfully',
    data: result,
  });
});

// Phase 1.1: Update My Preferences
const updateMyPreferences = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.updatePreferences(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User preferences updated successfully',
    data: result,
  });
});

// Update my profile
const updateMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.updateMyProfile(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

// Change password
const changePassword = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Current password and new password are required',
      data: null,
    });
    return;
  }

  const result = await UserServices.changePassword(userId, currentPassword, newPassword);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully',
    data: result,
  });
});

// Phase 2: Get Lawyer Clients
const getLawyerClients = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.getLawyerClients(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Clients retrieved successfully',
    data: result,
  });
});

// WBS-7.1: Get Client Detail
const getClientDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.getClientDetail(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Client details retrieved successfully',
    data: result,
  });
});

// WBS-7.1: Archive Client
const archiveClient = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserServices.archiveClient(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Client archived successfully',
    data: result,
  });
});

// WBS-4.1: Get personalization data
const getPersonalization = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await PersonalizationService.getPersonalization(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Personalization data retrieved successfully',
    data: result,
  });
});

// WBS-4.1: Update personalization preferences
const updatePersonalization = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await PersonalizationService.updatePersonalization(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Personalization updated successfully',
    data: result,
  });
});

// WBS-4.1: Track behavior event (async, non-blocking)
const trackBehavior = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await PersonalizationService.trackBehavior(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Behavior tracked',
    data: result,
  });
});

// Lawyer Directory: Get all lawyers with profiles
const getAllLawyers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllLawyers(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lawyers retrieved successfully',
    data: result,
  });
});

const submitVerificationRequest = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserServices.submitVerificationRequest(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Verification request submitted successfully',
    data: result,
  });
});

export const UserControllers = {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  getMyProfile,
  getMyPreferences,
  updateMyPreferences,
  updateMyProfile,
  changePassword,
  getLawyerClients,
  getClientDetail,
  archiveClient,
  getPersonalization,
  updatePersonalization,
  trackBehavior,
  getAllLawyers,
  submitVerificationRequest,
};

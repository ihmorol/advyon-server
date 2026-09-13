import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { MessageServices } from './message.service';

const getMessagesForUser = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await MessageServices.getMessagesForUser(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

const getPendingCount = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await MessageServices.getPendingCount(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending messages count retrieved successfully',
    data: result,
  });
});

const getMessageById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const result = await MessageServices.getMessageById(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message retrieved successfully',
    data: result,
  });
});

const createMessage = catchAsync(async (req, res) => {
  const { userId } = req.user;
  // req.file processing if attachments are uploaded via separate middleware,
  // or req.body.attachments if pre-uploaded to cloud.
  // Assuming req.body contains attachments metadata for now.
  const result = await MessageServices.createMessage(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const result = await MessageServices.markAsRead(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message marked as read',
    data: result,
  });
});

const archiveMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const result = await MessageServices.archiveMessage(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message archived successfully',
    data: result,
  });
});

const toggleStar = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const result = await MessageServices.toggleStar(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message star status updated',
    data: result
  });
});

const getCaseThreads = catchAsync(async (req, res) => {
  const { caseId } = req.params;
  const result = await MessageServices.getCaseThreads(caseId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case threads retrieved successfully',
    data: result
  });
});

export const MessageControllers = {
  getMessagesForUser,
  getPendingCount,
  getMessageById,
  createMessage,
  markAsRead,
  archiveMessage,
  toggleStar,
  getCaseThreads
};

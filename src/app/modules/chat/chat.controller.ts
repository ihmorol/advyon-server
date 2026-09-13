import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ChatService } from './chat.service';

/**
 * Chat Controller — handles HTTP request/response for chat endpoints
 */

const getOrCreateConversation = catchAsync(async (req, res) => {
  const { otherUserId } = req.body;
  const result = await ChatService.getOrCreateConversation(req.user.userId, otherUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved',
    data: result,
  });
});

const getConversations = catchAsync(async (req, res) => {
  const result = await ChatService.getConversations(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversations retrieved',
    data: result,
  });
});

const getMessages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const result = await ChatService.getMessages(
    id,
    req.user.userId,
    Number(page),
    Number(limit)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved',
    data: result,
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const result = await ChatService.sendMessage(id, req.user.userId, content);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await ChatService.markAsRead(id, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages marked as read',
    data: result,
  });
});

export const ChatControllers = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};

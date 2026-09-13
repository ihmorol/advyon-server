/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import AppError from '../../errors/appError';
import { Message } from './message.model';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';
import { socketService, SOCKET_EVENTS } from '../socket/socket.service';

/**
 * WBS-7.2: Message Service
 * Enhanced with threading, attachments, and search.
 */

const resolveCaseObjectId = async (caseIdentifier: string) => {
  const caseData = Types.ObjectId.isValid(caseIdentifier)
    ? await Case.findById(caseIdentifier)
    : await Case.findOne({ id: caseIdentifier });

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  return caseData._id;
};

// Get messages for a user (receiver) with pagination
const getMessagesForUser = async (
  userId: string,
  query: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    threadId?: string;
  }
) => {
  const { status, page = 1, limit = 10, search, threadId } = query;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const filter: any = {
    $or: [{ receiverId: user._id }, { senderId: user._id }] // Get both sent/received
  };

  if (status) {
    filter.status = status;
  }

  if (threadId) {
    filter.threadId = threadId;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('senderId', 'fullName displayName email avatarUrl')
      .populate('caseId', 'title caseNumber')
      .lean(),
    Message.countDocuments(filter),
  ]);

  return {
    messages,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

// Get pending/unread messages count
const getPendingCount = async (userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const count = await Message.countDocuments({
    receiverId: user._id,
    status: 'unread',
  });

  return { count };
};

// Get a single message by ID
const getMessageById = async (messageId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const message = await Message.findOne({
    _id: new Types.ObjectId(messageId),
    $or: [{ receiverId: user._id }, { senderId: user._id }],
  })
    .populate('senderId', 'fullName displayName email avatarUrl')
    .populate('receiverId', 'fullName displayName email avatarUrl')
    .populate('caseId', 'title caseNumber');

  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  return message;
};

// Create a new message
const createMessage = async (
  senderId: string,
  payload: {
    receiverId: string;
    caseId?: string;
    subject: string;
    content: string;
    priority?: 'low' | 'medium' | 'high';
    threadId?: string;
    parentMessageId?: string;
    attachments?: { name: string; url: string; type: string; size?: number }[];
  }
) => {
  const sender = await User.findOne({ id: senderId });
  if (!sender) {
    throw new AppError(httpStatus.NOT_FOUND, 'Sender not found');
  }

  // Receiver can be user Id string or ObjectId
  let receiver: any;
  if (Types.ObjectId.isValid(payload.receiverId)) {
    receiver = await User.findById(payload.receiverId);
  } else {
    receiver = await User.findOne({ id: payload.receiverId });
  }

  if (!receiver) {
    throw new AppError(httpStatus.NOT_FOUND, 'Receiver not found');
  }

  const messageData: any = {
    senderId: sender._id,
    receiverId: receiver._id,
    subject: payload.subject,
    content: payload.content,
    priority: payload.priority || 'medium',
    status: 'unread',
    attachments: payload.attachments || [],
    threadId: payload.threadId || (payload.caseId ? undefined : randomUUID()), // If caseId provided, maybe use caseId as thread grouping key, or generate one
  };

  if (payload.caseId) {
    const caseObjectId = await resolveCaseObjectId(payload.caseId);
    messageData.caseId = caseObjectId;
    if (!messageData.threadId) messageData.threadId = payload.caseId; // Default threadId to caseId if not explicit
  }

  if (payload.parentMessageId) {
    messageData.parentMessageId = new Types.ObjectId(payload.parentMessageId);
    // Inherit threadId if replying
    const parent = await Message.findById(payload.parentMessageId);
    if (parent) messageData.threadId = parent.threadId;
  }

  const message = await Message.create(messageData);

  // Notify receiver via Socket
  socketService.notifyNewMessage(receiver.id, {
    id: message._id,
    subject: message.subject,
    sender: {
      id: sender.id,
      name: sender.fullName
    },
    createdAt: message.createdAt
  });

  return message;
};

// Mark message as read
const markAsRead = async (messageId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const message = await Message.findOneAndUpdate(
    {
      _id: new Types.ObjectId(messageId),
      receiverId: user._id,
      status: 'unread',
    },
    {
      status: 'read',
      readAt: new Date(),
    },
    { new: true }
  );

  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found or already read');
  }

  return message;
};

// Archive a message
const archiveMessage = async (messageId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const message = await Message.findOneAndUpdate(
    {
      _id: new Types.ObjectId(messageId),
      receiverId: user._id, // Only receiver can archive? Or sender too?
    },
    { status: 'archived' },
    { new: true }
  );

  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  return message;
};

// Toggle Star
const toggleStar = async (messageId: string, userId: string) => {
  const user = await User.findOne({ id: userId });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const message = await Message.findOne({ _id: messageId, $or: [{ receiverId: user._id }, { senderId: user._id }] });
  if (!message) throw new AppError(httpStatus.NOT_FOUND, 'Message not found');

  message.isStarred = !message.isStarred;
  await message.save();
  return message;
};

// Get threads for a case
const getCaseThreads = async (caseId: string) => {
  const caseObjectId = await resolveCaseObjectId(caseId);

  const messages = await Message.aggregate([
    { $match: { caseId: caseObjectId } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$threadId",
        lastMessage: { $last: "$$ROOT" },
        messageCount: { $sum: 1 },
        messages: { $push: "$$ROOT" } // Might be too heavy if many messages
      }
    },
    { $sort: { "lastMessage.createdAt": -1 } }
  ]);
  return messages;
};

export const MessageServices = {
  getMessagesForUser,
  getPendingCount,
  getMessageById,
  createMessage,
  markAsRead,
  archiveMessage,
  toggleStar,
  getCaseThreads
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { NotificationModel } from './notification.model';
import { TNotification } from './notification.interface';
import { Types } from 'mongoose';
import { Case } from '../case/case.model';

/**
 * WBS-9.1: Notification Service
 * Handles multi-channel notification dispatch.
 */

// Mock email sender (replace with actual email service later)
const sendEmail = async (to: string, subject: string, body: string) => {
  console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${body}`);
  return true;
};

// Mock web push sender (replace with actual push service later)
const sendWebPush = async (userId: string, title: string, body: string) => {
  console.log(`[WEBPUSH MOCK] User: ${userId}, Title: ${title}, Body: ${body}`);
  return true;
};

const resolveUserByIdentifier = async (userIdentifier: string | Types.ObjectId) => {
  const identifier = String(userIdentifier);

  const user = Types.ObjectId.isValid(identifier)
    ? await User.findById(identifier)
    : await User.findOne({ id: identifier });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const sendNotification = async (payload: Partial<TNotification>) => {
  if (!payload.recipientId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Recipient is required');
  }

  const recipient = await resolveUserByIdentifier(payload.recipientId as any);
  const sender = payload.senderId
    ? await resolveUserByIdentifier(payload.senderId as any)
    : null;

  let caseObjectId: Types.ObjectId | undefined;
  if (payload.caseId) {
    const caseIdentifier = String(payload.caseId);
    const caseData = Types.ObjectId.isValid(caseIdentifier)
      ? await Case.findById(caseIdentifier)
      : await Case.findOne({ id: caseIdentifier });

    if (!caseData) {
      throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
    }

    caseObjectId = caseData._id;
  }

  // Idempotency check
  if (payload.idempotencyKey) {
    const existing = await NotificationModel.findOne({ idempotencyKey: payload.idempotencyKey });
    if (existing) {
      return existing; // Return existing notification without re-sending
    }
  }

  // Save in-app notification
  const notification = await NotificationModel.create({
    ...payload,
    recipientId: recipient._id,
    senderId: sender?._id,
    caseId: caseObjectId,
    isRead: false,
  });

  // Multi-channel dispatch
  if (payload.channels?.email && recipient.email) {
    await sendEmail(recipient.email, payload.title || 'New Notification', payload.message || '');
  }

  if (payload.channels?.webPush) {
    await sendWebPush(recipient.id, payload.title || 'New Notification', payload.message || '');
  }

  // Real-time socket event (handled by socket service listening to DB stream or direct call)
  // For now, assume socket service handles it separately or we call it here if circular dependencies allow.
  // const socketService = require('../socket/socket.service'); 
  // socketService.emitToUser(recipient.id, 'notification', notification);

  return notification;
};

const getUserNotifications = async (userId: string, query: any) => {
  const user = await resolveUserByIdentifier(userId);
  const { page = 1, limit = 10, isRead } = query;
  const filter: any = { recipientId: user._id };

  if (isRead !== undefined) {
    filter.isRead = isRead === 'true';
  }

  const skip = (Number(page) - 1) * Number(limit);

  const notifications = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await NotificationModel.countDocuments(filter);
  const unreadCount = await NotificationModel.countDocuments({ recipientId: user._id, isRead: false });

  return {
    data: notifications,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
      unreadCount,
    },
  };
};

const markAsRead = async (notificationId: string, userId: string) => {
  const user = await resolveUserByIdentifier(userId);

  const notification = await NotificationModel.findOne({
    _id: notificationId,
    recipientId: user._id
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

const markAllAsRead = async (userId: string) => {
  const user = await resolveUserByIdentifier(userId);

  await NotificationModel.updateMany(
    { recipientId: user._id, isRead: false },
    { $set: { isRead: true } }
  );
  return { message: 'All notifications marked as read' };
};

const deleteNotification = async (notificationId: string, userId: string) => {
  const user = await resolveUserByIdentifier(userId);

  const result = await NotificationModel.findOneAndDelete({
    _id: notificationId,
    recipientId: user._id,
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return result;
};

export const NotificationServices = {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

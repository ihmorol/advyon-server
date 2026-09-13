import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NotificationServices } from './notification.service';

/**
 * WBS-9.1: Notification Controller
 */

const getUserNotifications = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await NotificationServices.getUserNotifications(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  const result = await NotificationServices.markAsRead(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const { userId } = req.user;
  await NotificationServices.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  await NotificationServices.deleteNotification(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: null,
  });
});

// Internal use or admin testing
const sendTestNotification = catchAsync(async (req, res) => {
  const { userId } = req.user; // sender
  const result = await NotificationServices.sendNotification({
    ...req.body,
    senderId: userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Notification sent successfully',
    data: result,
  });
});

export const NotificationControllers = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendTestNotification,
};

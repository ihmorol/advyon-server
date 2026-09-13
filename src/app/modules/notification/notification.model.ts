import { Schema, model } from 'mongoose';
import { TNotification } from './notification.interface';

const notificationSchema = new Schema<TNotification>(
  {
    type: {
      type: String,
      required: true,
      enum: ['alert', 'request', 'message', 'case_update', 'document_upload', 'hearing_reminder', 'deadline', 'ai_analysis_complete'],
    },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
    },
    // WBS-9.1: Idempotency key to prevent duplicate notifications
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    // WBS-9.1: Channels this notification was sent through
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      webPush: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const NotificationModel = model<TNotification>('Notification', notificationSchema);

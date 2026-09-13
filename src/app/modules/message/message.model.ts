import { Schema, model, Types } from 'mongoose';
import { IMessage } from './message.interface';

/**
 * WBS-7.2: Enhanced Message Model
 */

const attachmentSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: Number
}, { _id: false });

const readReceiptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date, default: Date.now }
}, { _id: false });

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    threadId: {
      type: String, // Can be caseId or generated UUID
      index: true,
    },
    parentMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'replied', 'archived'],
      default: 'unread',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    attachments: [attachmentSchema],
    readAt: {
      type: Date,
    },
    readReceipts: [readReceiptSchema],
    isStarred: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
messageSchema.index({ subject: 'text', content: 'text' });
// Index for retrieval
messageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);

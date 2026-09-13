import { Model, Types } from 'mongoose';

export type TMessageStatus = 'unread' | 'read' | 'replied' | 'archived';
export type TMessagePriority = 'low' | 'medium' | 'high';

export interface IAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  caseId?: Types.ObjectId;

  // Threading
  threadId?: string; // Could be caseId or conversationId
  parentMessageId?: Types.ObjectId;

  subject: string;
  content: string;

  status: TMessageStatus;
  priority: TMessagePriority;

  attachments?: IAttachment[];

  // Read tracking
  readAt?: Date; // For 1:1
  readReceipts?: IReadReceipt[]; // For group contexts

  isStarred: boolean;
  templateId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type MessageModel = Model<IMessage>;

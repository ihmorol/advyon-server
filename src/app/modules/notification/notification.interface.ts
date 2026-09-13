import { Types } from 'mongoose';

export type TNotificationType = 'alert' | 'request' | 'message' | 'case_update' | 'document_upload' | 'hearing_reminder' | 'deadline' | 'ai_analysis_complete';
export type TNotificationPriority = 'low' | 'medium' | 'high';

export interface TNotification {
  type: TNotificationType;
  priority: TNotificationPriority;
  title: string;
  message: string;
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  caseId?: Types.ObjectId;
  isRead: boolean;
  metadata?: Record<string, unknown>;

  // WBS-9.1 additions
  idempotencyKey?: string;
  channels?: {
    inApp: boolean;
    email: boolean;
    webPush: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

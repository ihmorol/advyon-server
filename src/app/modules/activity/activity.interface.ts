import { Types } from 'mongoose';

export type TActivityType = 'case_created' | 'case_updated' | 'case_archived' | 'case_restored' | 'case_deleted' | 'document_uploaded' | 'document_deleted' | 'system_alert' | 'user_joined' | 'document_moved';

export interface TActivity {
  type: TActivityType;
  message: string;
  userId: Types.ObjectId;
  caseId?: Types.ObjectId;
  documentId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

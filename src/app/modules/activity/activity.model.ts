import { Schema, model } from 'mongoose';
import { TActivity } from './activity.interface';

const activitySchema = new Schema<TActivity>(
  {
    type: {
      type: String,
      required: true,
      enum: ['case_created', 'case_updated', 'document_uploaded', 'document_deleted', 'system_alert', 'user_joined', 'document_moved', 'case_archived', 'case_deleted', 'case_restored'],
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
    },
    metadata: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Index for performance
activitySchema.index({ createdAt: -1 });
activitySchema.index({ userId: 1 });
activitySchema.index({ caseId: 1 });

export const ActivityModel = model<TActivity>('Activity', activitySchema);

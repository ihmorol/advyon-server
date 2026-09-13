import { Schema, model } from 'mongoose';
import {
  TModerationAppeal,
  TModerationReview,
} from './community.moderation.interface';

const moderationReviewSchema = new Schema<TModerationReview>(
  {
    targetType: { type: String, enum: ['thread', 'reply'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['Thread', 'Reply'], required: true },
    authorId: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'review', 'approved', 'rejected', 'error'],
      default: 'queued',
    },
    decision: {
      type: String,
      enum: ['approved', 'flagged', 'rejected'],
      default: 'approved',
    },
    threshold: { type: Number, default: 0.72 },
    confidence: { type: Number, default: 0 },
    toxicityScore: { type: Number, default: 0 },
    spamScore: { type: Number, default: 0 },
    offTopicScore: { type: Number, default: 0 },
    reasons: [{ type: String }],
    notes: { type: String },
    contentPreview: { type: String, required: true, maxlength: 500 },
    processedAt: { type: Date },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

moderationReviewSchema.index({ status: 1, createdAt: 1 });
moderationReviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const moderationAppealSchema = new Schema<TModerationAppeal>(
  {
    targetType: { type: String, enum: ['thread', 'reply'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    reviewId: { type: Schema.Types.ObjectId, ref: 'ModerationReview', required: true },
    authorId: { type: String, required: true },
    reason: { type: String, required: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    resolutionNotes: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

moderationAppealSchema.index({ status: 1, createdAt: 1 });
moderationAppealSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const ModerationReview = model<TModerationReview>(
  'ModerationReview',
  moderationReviewSchema,
);

export const ModerationAppeal = model<TModerationAppeal>(
  'ModerationAppeal',
  moderationAppealSchema,
);


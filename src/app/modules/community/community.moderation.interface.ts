import { Types } from 'mongoose';

export type TModerationTargetType = 'thread' | 'reply';
export type TModerationDecision = 'approved' | 'flagged' | 'rejected';
export type TModerationQueueStatus =
  | 'queued'
  | 'processing'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'error';

export type TAppealStatus = 'pending' | 'approved' | 'rejected';

export interface TModerationSnapshot {
  status: 'pending' | 'approved' | 'review' | 'rejected' | 'appealed';
  confidence: number;
  threshold: number;
  toxicityScore: number;
  spamScore: number;
  offTopicScore: number;
  reasons: string[];
  reviewId?: Types.ObjectId;
  lastCheckedAt?: Date;
}

export interface TModerationReview {
  _id?: Types.ObjectId;
  targetType: TModerationTargetType;
  targetId: Types.ObjectId;
  targetModel: 'Thread' | 'Reply';
  authorId: string;
  status: TModerationQueueStatus;
  decision: TModerationDecision;
  threshold: number;
  confidence: number;
  toxicityScore: number;
  spamScore: number;
  offTopicScore: number;
  reasons: string[];
  notes?: string;
  contentPreview: string;
  processedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TModerationAppeal {
  _id?: Types.ObjectId;
  targetType: TModerationTargetType;
  targetId: Types.ObjectId;
  reviewId: Types.ObjectId;
  authorId: string;
  reason: string;
  status: TAppealStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TModerationAssessment {
  decision: TModerationDecision;
  confidence: number;
  toxicityScore: number;
  spamScore: number;
  offTopicScore: number;
  reasons: string[];
  threshold: number;
}


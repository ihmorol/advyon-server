import { Schema, model } from 'mongoose';

export type TCommunityEngagementEventType =
  | 'thread_create'
  | 'reply_create'
  | 'thread_vote'
  | 'reply_vote'
  | 'thread_search'
  | 'thread_view'
  | 'thread_resolved';

type TCommunityEngagementEvent = {
  userId?: string;
  eventType: TCommunityEngagementEventType;
  threadId?: Schema.Types.ObjectId;
  replyId?: Schema.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

const communityEngagementSchema = new Schema<TCommunityEngagementEvent>(
  {
    userId: { type: String },
    eventType: {
      type: String,
      enum: [
        'thread_create',
        'reply_create',
        'thread_vote',
        'reply_vote',
        'thread_search',
        'thread_view',
        'thread_resolved',
      ],
      required: true,
      index: true,
    },
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread' },
    replyId: { type: Schema.Types.ObjectId, ref: 'Reply' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

communityEngagementSchema.index({ createdAt: -1, eventType: 1 });

export const CommunityEngagementEventModel = model<TCommunityEngagementEvent>(
  'CommunityEngagementEvent',
  communityEngagementSchema,
);

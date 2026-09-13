import { Schema, model } from 'mongoose';
import { TReply, TThread } from './community.interface';

const moderationSnapshotSchema = new Schema(
    {
        status: {
            type: String,
            enum: ['pending', 'approved', 'review', 'rejected', 'appealed'],
            default: 'pending',
        },
        confidence: { type: Number, default: 0 },
        threshold: { type: Number, default: 0.72 },
        toxicityScore: { type: Number, default: 0 },
        spamScore: { type: Number, default: 0 },
        offTopicScore: { type: Number, default: 0 },
        reasons: [{ type: String }],
        reviewId: { type: Schema.Types.ObjectId, ref: 'ModerationReview' },
        lastCheckedAt: { type: Date },
    },
    { _id: false },
);

const replySchema = new Schema<TReply>({
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isAcceptedAnswer: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    moderation: { type: moderationSnapshotSchema, default: () => ({ status: 'pending' }) },
}, { timestamps: true });

const threadSchema = new Schema<TThread>({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
        type: String,
        enum: ['Family Law', 'Criminal Defense', 'Civil Litigation', 'Property Law', 'Corporate', 'Intellectual Property', 'Others'],
        required: true
    },
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    upvotesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    isSolved: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    moderation: { type: moderationSnapshotSchema, default: () => ({ status: 'pending' }) },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const Reply = model<TReply>('Reply', replySchema);
export const Thread = model<TThread>('Thread', threadSchema);

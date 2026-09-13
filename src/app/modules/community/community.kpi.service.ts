import { Types } from 'mongoose';
import { CommunityEngagementEventModel } from './community.kpi.model';

const trackCommunityEvent = async (params: {
  userId?: string;
  eventType:
    | 'thread_create'
    | 'reply_create'
    | 'thread_vote'
    | 'reply_vote'
    | 'thread_search'
    | 'thread_view'
    | 'thread_resolved';
  threadId?: string;
  replyId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await CommunityEngagementEventModel.create({
      userId: params.userId,
      eventType: params.eventType,
      threadId:
        params.threadId && Types.ObjectId.isValid(params.threadId)
          ? new Types.ObjectId(params.threadId)
          : undefined,
      replyId:
        params.replyId && Types.ObjectId.isValid(params.replyId)
          ? new Types.ObjectId(params.replyId)
          : undefined,
      metadata: params.metadata,
    });
  } catch (error) {
    console.warn('[CommunityKPI] Failed to track event', error);
  }
};

const getEngagementMetrics = async (query: { from?: string; to?: string }) => {
  const match: Record<string, unknown> = {};
  if (query.from || query.to) {
    const createdAt: Record<string, Date> = {};
    if (query.from) createdAt.$gte = new Date(query.from);
    if (query.to) createdAt.$lte = new Date(query.to);
    match.createdAt = createdAt;
  }

  const [byType, byDay] = await Promise.all([
    CommunityEngagementEventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    CommunityEngagementEventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                date: '$createdAt',
                format: '%Y-%m-%d',
              },
            },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': -1 } },
    ]),
  ]);

  return { byType, byDay };
};

export const CommunityKPIService = {
  trackCommunityEvent,
  getEngagementMetrics,
};

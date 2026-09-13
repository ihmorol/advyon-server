import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { sanitizeTagList, sanitizeUserGeneratedText } from '../ai/input-sanitizer';
import { GamificationService } from '../gamification/gamification.service';
import { User } from '../user/user.model';
import { CommunityAIAssistService } from './community.ai-assist.service';
import { TReply, TThread } from './community.interface';
import { CommunityKPIService } from './community.kpi.service';
import { Thread, Reply } from './community.model';
import { CommunityModerationService } from './community.moderation.service';

// Helper to get MongoDB ObjectId from custom user id
const getUserObjectId = async (customUserId: string) => {
  const user = await User.findOne({ id: customUserId });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  return user._id;
};

const createThread = async (payload: TThread & { author: string }) => {
  const authorObjectId = await getUserObjectId(payload.author as any);
  const safeTitle = sanitizeUserGeneratedText(payload.title);
  const safeContent = sanitizeUserGeneratedText(payload.content);
  const safeTags = sanitizeTagList(payload.tags || []);

  const assessment = await CommunityModerationService.runFastGate(
    `${safeTitle}\n${safeContent}`,
  );

  if (assessment.decision === 'rejected') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your post violates community guidelines and cannot be published.',
    );
  }

  const result = await Thread.create({
    ...payload,
    title: safeTitle,
    content: safeContent,
    tags: safeTags,
    author: authorObjectId,
    isVisible: assessment.decision === 'approved',
    moderation: CommunityModerationService.buildInitialSnapshot(assessment),
  });

  await CommunityModerationService.registerCreatedContent({
    targetType: 'thread',
    targetId: result._id,
    authorId: payload.author,
    content: `${safeTitle}\n${safeContent}`,
    assessment,
  });

  if (assessment.decision === 'approved') {
    GamificationService.awardPoints(
      payload.author,
      'CREATE_THREAD',
      result._id.toString(),
    );
  }

  void CommunityKPIService.trackCommunityEvent({
    userId: payload.author,
    eventType: 'thread_create',
    threadId: result._id.toString(),
    metadata: {
      moderatedStatus: assessment.decision,
      category: payload.category,
    },
  });

  const refreshedResult = await Thread.findById(result._id);
  return refreshedResult || result;
};

const buildRepliesLookupStage = (includeHidden: boolean) => ({
  $lookup: {
    from: 'replies',
    let: { threadRef: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$threadId', '$$threadRef'] },
              {
                $cond: {
                  if: includeHidden,
                  then: true,
                  else: { $ne: ['$isVisible', false] },
                },
              },
            ],
          },
        },
      },
    ],
    as: 'repliesArray',
  },
});

const getAllThreads = async (
  query: Record<string, unknown>,
  options?: { allowHidden?: boolean },
) => {
  const pipeline: any[] = [];
  const includeHidden = options?.allowHidden === true && query.includeHidden === 'true';

  if (!includeHidden) {
    pipeline.push({ $match: { isVisible: { $ne: false } } });
  }

  pipeline.push({
    $addFields: {
      upvotesCount: { $size: { $ifNull: ['$upvotes', []] } },
      downvotesCount: { $size: { $ifNull: ['$downvotes', []] } },
    },
  });

  if (query.searchTerm) {
    void CommunityKPIService.trackCommunityEvent({
      eventType: 'thread_search',
      metadata: {
        searchTerm: String(query.searchTerm).slice(0, 100),
      },
    });

    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query.searchTerm, $options: 'i' } },
          { content: { $regex: query.searchTerm, $options: 'i' } },
          { tags: { $regex: query.searchTerm, $options: 'i' } },
        ],
      },
    });
  }

  if (query.category) {
    pipeline.push({ $match: { category: query.category } });
  }

  pipeline.push(buildRepliesLookupStage(includeHidden));

  pipeline.push({
    $addFields: {
      repliesCount: { $size: '$repliesArray' },
    },
  });

  if (query.repliesCount !== undefined) {
    pipeline.push({
      $match: { repliesCount: Number(query.repliesCount) },
    });
  }

  pipeline.push({
    $project: {
      repliesArray: 0,
    },
  });

  const sortField = (query.sort as string) || '-createdAt';
  const sortOrder = sortField.startsWith('-') ? -1 : 1;
  const sortKey = sortField.replace(/^-/, '');
  pipeline.push({ $sort: { [sortKey]: sortOrder } });

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'authorData',
    },
  });
  pipeline.push({
    $addFields: {
      author: { $arrayElemAt: ['$authorData', 0] },
    },
  });
  pipeline.push({
    $project: {
      authorData: 0,
      'author.password': 0,
      'author.__v': 0,
    },
  });

  const result = await Thread.aggregate(pipeline);

  const countPipeline: any[] = [];
  if (!includeHidden) {
    countPipeline.push({ $match: { isVisible: { $ne: false } } });
  }
  if (query.searchTerm) {
    countPipeline.push({
      $match: {
        $or: [
          { title: { $regex: query.searchTerm, $options: 'i' } },
          { content: { $regex: query.searchTerm, $options: 'i' } },
          { tags: { $regex: query.searchTerm, $options: 'i' } },
        ],
      },
    });
  }
  if (query.category) {
    countPipeline.push({ $match: { category: query.category } });
  }
  if (query.repliesCount !== undefined) {
    countPipeline.push(buildRepliesLookupStage(includeHidden));
    countPipeline.push({
      $addFields: { repliesCount: { $size: '$repliesArray' } },
    });
    countPipeline.push({
      $match: { repliesCount: Number(query.repliesCount) },
    });
  }
  countPipeline.push({ $count: 'total' });

  const countResult = await Thread.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  const meta = {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit),
  };

  return { meta, result };
};

const getThreadById = async (id: string) => {
  const thread = await Thread.findOne({
    _id: id,
    isVisible: { $ne: false },
  }).populate('author', 'fullName role avatarUrl');

  if (!thread) return null;

  thread.views = (thread.views || 0) + 1;
  await thread.save();

  const replies = await Reply.find({
    threadId: id,
    isVisible: { $ne: false },
  })
    .populate('author', 'fullName role avatarUrl')
    .sort({ createdAt: 1 });

  void CommunityKPIService.trackCommunityEvent({
    eventType: 'thread_view',
    threadId: id,
  });

  return { thread, replies };
};

const addReply = async (payload: TReply & { author: string }) => {
  const authorObjectId = await getUserObjectId(payload.author as any);
  const safeContent = sanitizeUserGeneratedText(payload.content);
  const assessment = await CommunityModerationService.runFastGate(safeContent);

  if (assessment.decision === 'rejected') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your reply violates community guidelines and cannot be published.',
    );
  }

  const result = await Reply.create({
    ...payload,
    content: safeContent,
    author: authorObjectId,
    isVisible: assessment.decision === 'approved',
    moderation: CommunityModerationService.buildInitialSnapshot(assessment),
  });

  await CommunityModerationService.registerCreatedContent({
    targetType: 'reply',
    targetId: result._id,
    authorId: payload.author,
    content: safeContent,
    assessment,
  });

  if (assessment.decision === 'approved') {
    await Thread.findByIdAndUpdate(payload.threadId, { $inc: { repliesCount: 1 } });
    GamificationService.awardPoints(payload.author, 'ADD_REPLY', result._id.toString());
  }

  void CommunityKPIService.trackCommunityEvent({
    userId: payload.author,
    eventType: 'reply_create',
    threadId: String(payload.threadId),
    replyId: result._id.toString(),
    metadata: {
      moderatedStatus: assessment.decision,
    },
  });

  const refreshedResult = await Reply.findById(result._id);
  return refreshedResult || result;
};

const voteThread = async (
  threadId: string,
  userId: string,
  direction: 'up' | 'down',
) => {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new AppError(httpStatus.NOT_FOUND, 'Thread not found');

  const userObjectId = await getUserObjectId(userId);
  const userIdStr = userObjectId.toString();

  if (!thread.downvotes) thread.downvotes = [];

  const isUpvoted = thread.upvotes.map(id => id.toString()).includes(userIdStr);
  const isDownvoted = thread.downvotes.map(id => id.toString()).includes(userIdStr);

  if (direction === 'up') {
    if (isUpvoted) return thread;
    if (isDownvoted) {
      thread.downvotes = thread.downvotes.filter(id => id.toString() !== userIdStr);
    }
    thread.upvotes.push(userObjectId as any);
  } else {
    if (isDownvoted) return thread;
    if (isUpvoted) {
      thread.upvotes = thread.upvotes.filter(id => id.toString() !== userIdStr);
    }
    thread.downvotes.push(userObjectId as any);
  }

  thread.upvotesCount = thread.upvotes.length;
  await thread.save();

  void CommunityKPIService.trackCommunityEvent({
    userId,
    eventType: 'thread_vote',
    threadId,
    metadata: { direction },
  });

  return thread;
};

const voteReply = async (
  replyId: string,
  userId: string,
  direction: 'up' | 'down',
) => {
  const reply = await Reply.findById(replyId);
  if (!reply) throw new AppError(httpStatus.NOT_FOUND, 'Reply not found');

  const userObjectId = await getUserObjectId(userId);
  const userIdStr = userObjectId.toString();

  if (!reply.downvotes) reply.downvotes = [];

  const isUpvoted = reply.upvotes.map(id => id.toString()).includes(userIdStr);
  const isDownvoted = reply.downvotes.map(id => id.toString()).includes(userIdStr);

  if (direction === 'up') {
    if (isUpvoted) return reply;
    if (isDownvoted) {
      reply.downvotes = reply.downvotes.filter(id => id.toString() !== userIdStr);
    }
    reply.upvotes.push(userObjectId as any);
  } else {
    if (isDownvoted) return reply;
    if (isUpvoted) {
      reply.upvotes = reply.upvotes.filter(id => id.toString() !== userIdStr);
    }
    reply.downvotes.push(userObjectId as any);
  }

  await reply.save();

  const replyAuthor = await User.findById(reply.author);
  if (replyAuthor) {
    if (direction === 'up' && !isUpvoted) {
      GamificationService.awardPoints(replyAuthor.id, 'UPVOTE_RECEIVED', replyId);
    } else if (direction === 'down' && !isDownvoted) {
      GamificationService.deductPoints(replyAuthor.id, 'DOWNVOTE_RECEIVED', replyId);
    }
  }

  void CommunityKPIService.trackCommunityEvent({
    userId,
    eventType: 'reply_vote',
    replyId,
    threadId: reply.threadId.toString(),
    metadata: { direction },
  });

  return reply;
};

const markAsSolved = async (threadId: string, replyId: string, userId: string) => {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new AppError(httpStatus.NOT_FOUND, 'Thread not found');

  const userObjectId = await getUserObjectId(userId);
  if (thread.author.toString() !== userObjectId.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the thread author can mark as solved',
    );
  }

  await Reply.updateMany({ threadId }, { isAcceptedAnswer: false });

  const reply = await Reply.findByIdAndUpdate(
    replyId,
    { isAcceptedAnswer: true },
    { new: true },
  ).populate('author');

  thread.isSolved = true;
  await thread.save();

  if (reply && reply.author) {
    const replyAuthor = await User.findById(reply.author);
    if (replyAuthor) {
      GamificationService.awardPoints(replyAuthor.id, 'ACCEPTED_ANSWER', replyId);
    }
  }

  void CommunityKPIService.trackCommunityEvent({
    userId,
    eventType: 'thread_resolved',
    threadId,
    replyId,
  });

  return { thread, reply };
};

const getCommunityStats = async () => {
  const totalThreads = await Thread.countDocuments({ isVisible: { $ne: false } });
  const totalReplies = await Reply.countDocuments({ isVisible: { $ne: false } });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeUsers = await User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyQuestions = await Thread.countDocuments({
    createdAt: { $gte: today },
    isVisible: { $ne: false },
  });

  return {
    totalThreads,
    totalReplies,
    activeUsers,
    dailyQuestions,
  };
};

const getTrendingTopics = async (limit = 10) => {
  const result = await Thread.aggregate([
    { $match: { isVisible: { $ne: false } } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: '$_id',
        count: 1,
      },
    },
  ]);

  return result;
};

const getTopContributors = async (limit = 10) => {
  const contributors = await User.find({ isDeleted: false })
    .sort({ points: -1 })
    .limit(limit)
    .select('id fullName avatarUrl role points weeklyPoints');

  return contributors;
};

const getModerationQueue = async (query: {
  status?: string;
  page?: string;
  limit?: string;
}) => CommunityModerationService.getReviewQueue(query);

const reviewModerationItem = async (
  reviewId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
) =>
  CommunityModerationService.reviewModerationItem(
    reviewId,
    reviewerId,
    decision,
    notes,
  );

const createModerationAppeal = async (payload: {
  targetType: 'thread' | 'reply';
  targetId: string;
  reason: string;
  authorId: string;
}) => CommunityModerationService.createAppeal(payload);

const getModerationAppeals = async (query: {
  status?: string;
  page?: string;
  limit?: string;
}) => CommunityModerationService.getAppeals(query);

const resolveModerationAppeal = async (
  appealId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
) =>
  CommunityModerationService.resolveAppeal(
    appealId,
    reviewerId,
    decision,
    notes,
  );

const getSimilarThreadSuggestions = async (payload: {
  title: string;
  content: string;
  threadId?: string;
  limit?: number;
}) => CommunityAIAssistService.findSimilarThreads(payload);

const getSmartTagSuggestions = async (payload: {
  title: string;
  content: string;
}) => CommunityAIAssistService.suggestSmartTags(payload.title, payload.content);

const getThreadAISummary = async (threadId: string, userId: string) =>
  CommunityAIAssistService.summarizeThread({ threadId, userId });

const getAnswerSuggestion = async (payload: {
  userId: string;
  threadId?: string;
  draft?: string;
}) => CommunityAIAssistService.generateAnswerSuggestion(payload);

const getLegalReferenceSuggestions = async (payload: {
  userId: string;
  content: string;
}) => CommunityAIAssistService.recommendLegalReferences(payload);

const getEngagementMetrics = async (query: { from?: string; to?: string }) =>
  CommunityKPIService.getEngagementMetrics(query);

export const CommunityService = {
  createThread,
  getAllThreads,
  getThreadById,
  addReply,
  voteThread,
  voteReply,
  markAsSolved,
  getCommunityStats,
  getTrendingTopics,
  getTopContributors,
  getModerationQueue,
  reviewModerationItem,
  createModerationAppeal,
  getModerationAppeals,
  resolveModerationAppeal,
  getSimilarThreadSuggestions,
  getSmartTagSuggestions,
  getThreadAISummary,
  getAnswerSuggestion,
  getLegalReferenceSuggestions,
  getEngagementMetrics,
};

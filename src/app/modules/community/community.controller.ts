import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CommunityService } from './community.service';

const createThread = catchAsync(async (req, res) => {
  const result = await CommunityService.createThread({
    ...req.body,
    author: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      result?.isVisible === false
        ? 'Thread submitted for moderation review'
        : 'Thread created successfully',
    data: result,
  });
});

const getAllThreads = catchAsync(async (req, res) => {
  const result = await CommunityService.getAllThreads(req.query, {
    allowHidden: false,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Threads retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getModerationThreads = catchAsync(async (req, res) => {
  const result = await CommunityService.getAllThreads(req.query, {
    allowHidden: true,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Moderation threads retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getThreadById = catchAsync(async (req, res) => {
  const result = await CommunityService.getThreadById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Thread retrieved successfully',
    data: result,
  });
});

const addReply = catchAsync(async (req, res) => {
  const result = await CommunityService.addReply({
    ...req.body,
    threadId: req.params.threadId,
    author: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      result?.isVisible === false
        ? 'Reply submitted for moderation review'
        : 'Reply added successfully',
    data: result,
  });
});

const voteThread = catchAsync(async (req, res) => {
  const direction = req.body.direction || 'up';
  const result = await CommunityService.voteThread(
    req.params.id,
    req.user.userId,
    direction,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vote updated',
    data: result,
  });
});

const voteReply = catchAsync(async (req, res) => {
  const direction = req.body.direction || 'up';
  const result = await CommunityService.voteReply(
    req.params.replyId,
    req.user.userId,
    direction,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply vote updated',
    data: result,
  });
});

const markAsSolved = catchAsync(async (req, res) => {
  const result = await CommunityService.markAsSolved(
    req.params.id,
    req.body.replyId,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Thread marked as solved',
    data: result,
  });
});

const getCommunityStats = catchAsync(async (req, res) => {
  const result = await CommunityService.getCommunityStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Community stats retrieved',
    data: result,
  });
});

const getTrendingTopics = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await CommunityService.getTrendingTopics(limit);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trending topics retrieved',
    data: result,
  });
});

const getTopContributors = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await CommunityService.getTopContributors(limit);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Top contributors retrieved',
    data: result,
  });
});

const getModerationQueue = catchAsync(async (req, res) => {
  const result = await CommunityService.getModerationQueue(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Moderation queue retrieved',
    meta: result.meta,
    data: result.result,
  });
});

const reviewModerationItem = catchAsync(async (req, res) => {
  const result = await CommunityService.reviewModerationItem(
    req.params.reviewId,
    req.user.userId,
    req.body.decision,
    req.body.notes,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Moderation decision recorded',
    data: result,
  });
});

const createModerationAppeal = catchAsync(async (req, res) => {
  const result = await CommunityService.createModerationAppeal({
    ...req.body,
    authorId: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Appeal submitted successfully',
    data: result,
  });
});

const getModerationAppeals = catchAsync(async (req, res) => {
  const result = await CommunityService.getModerationAppeals(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appeals retrieved',
    meta: result.meta,
    data: result.result,
  });
});

const resolveModerationAppeal = catchAsync(async (req, res) => {
  const result = await CommunityService.resolveModerationAppeal(
    req.params.appealId,
    req.user.userId,
    req.body.decision,
    req.body.notes,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appeal resolved',
    data: result,
  });
});

const getSimilarThreadSuggestions = catchAsync(async (req, res) => {
  const result = await CommunityService.getSimilarThreadSuggestions(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Similar thread suggestions retrieved',
    data: result,
  });
});

const getSmartTagSuggestions = catchAsync(async (req, res) => {
  const result = await CommunityService.getSmartTagSuggestions(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Smart tag suggestions retrieved',
    data: result,
  });
});

const getThreadAISummary = catchAsync(async (req, res) => {
  const result = await CommunityService.getThreadAISummary(
    req.params.id,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Thread AI summary generated',
    data: result,
  });
});

const getAnswerSuggestion = catchAsync(async (req, res) => {
  const result = await CommunityService.getAnswerSuggestion({
    userId: req.user.userId,
    threadId: req.body.threadId,
    draft: req.body.draft,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI answer suggestion generated',
    data: result,
  });
});

const getLegalReferenceSuggestions = catchAsync(async (req, res) => {
  const result = await CommunityService.getLegalReferenceSuggestions({
    userId: req.user.userId,
    content: req.body.content,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Legal reference suggestions generated',
    data: result,
  });
});

const getEngagementMetrics = catchAsync(async (req, res) => {
  const result = await CommunityService.getEngagementMetrics({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Community engagement metrics retrieved',
    data: result,
  });
});

export const CommunityController = {
  createThread,
  getAllThreads,
  getModerationThreads,
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

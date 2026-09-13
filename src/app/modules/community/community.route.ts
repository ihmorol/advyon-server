import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CommunityController } from './community.controller';
import { CommunityValidation } from './community.validation';

const router = express.Router();

// Stats endpoint (public)
router.get('/stats', CommunityController.getCommunityStats);

// Trending topics endpoint (public)
router.get('/trending-topics', CommunityController.getTrendingTopics);

// Top contributors endpoint (public)
router.get('/top-contributors', CommunityController.getTopContributors);
router.get(
  '/metrics/engagement',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.engagementMetricsValidation),
  CommunityController.getEngagementMetrics,
);

// Community AI assistance (non-blocking helper endpoints)
router.post(
  '/assist/similar',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.similarThreadsValidation),
  CommunityController.getSimilarThreadSuggestions,
);

router.post(
  '/assist/smart-tags',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.smartTagValidation),
  CommunityController.getSmartTagSuggestions,
);

router.post(
  '/assist/answer-suggestion',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.answerSuggestionValidation),
  CommunityController.getAnswerSuggestion,
);

router.post(
  '/assist/legal-references',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.legalReferenceValidation),
  CommunityController.getLegalReferenceSuggestions,
);

// Moderation workflow endpoints
router.get(
  '/moderation/reviews',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.moderationQueueValidation),
  CommunityController.getModerationQueue,
);

router.patch(
  '/moderation/reviews/:reviewId',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.moderationDecisionValidation),
  CommunityController.reviewModerationItem,
);

router.post(
  '/moderation/appeals',
  auth('client', 'lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.createAppealValidation),
  CommunityController.createModerationAppeal,
);

router.get(
  '/moderation/appeals',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.appealQueueValidation),
  CommunityController.getModerationAppeals,
);

router.patch(
  '/moderation/appeals/:appealId',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(CommunityValidation.resolveAppealValidation),
  CommunityController.resolveModerationAppeal,
);

router.get(
  '/moderation/threads',
  auth('lawyer', 'admin', 'superAdmin'),
  CommunityController.getModerationThreads,
);

// Thread routes
router.post(
  '/threads',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.createThreadValidation),
  CommunityController.createThread,
);
router.get('/threads', CommunityController.getAllThreads);
router.get(
  '/threads/:id/summary-ai',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.threadSummaryValidation),
  CommunityController.getThreadAISummary,
);
router.get('/threads/:id', CommunityController.getThreadById);
router.post(
  '/threads/:threadId/reply',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.addReplyValidation),
  CommunityController.addReply,
);
router.patch(
  '/threads/:id/vote',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.voteThreadValidation),
  CommunityController.voteThread,
);
router.patch(
  '/threads/:id/solve',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.markAsSolvedValidation),
  CommunityController.markAsSolved,
);

// Reply routes
router.patch(
  '/replies/:replyId/vote',
  auth('client', 'lawyer', 'admin'),
  validateRequest(CommunityValidation.voteReplyValidation),
  CommunityController.voteReply,
);

export const CommunityRoutes = router;

import { z } from 'zod';

const categoryEnum = z.enum([
  'Family Law',
  'Criminal Defense',
  'Civil Litigation',
  'Property Law',
  'Corporate',
  'Intellectual Property',
  'Others',
]);

export const CommunityValidation = {
  createThreadValidation: z.object({
    body: z.object({
      title: z.string().trim().min(8).max(180),
      content: z.string().trim().min(20).max(5000),
      category: categoryEnum,
      tags: z.array(z.string().trim().min(1).max(40)).max(10).optional().default([]),
    }),
  }),

  addReplyValidation: z.object({
    body: z.object({
      content: z.string().trim().min(5).max(5000),
    }),
    params: z.object({
      threadId: z.string().trim().min(1),
    }),
  }),

  voteThreadValidation: z.object({
    body: z.object({
      direction: z.enum(['up', 'down']).optional(),
    }),
    params: z.object({
      id: z.string().trim().min(1),
    }),
  }),

  voteReplyValidation: z.object({
    body: z.object({
      direction: z.enum(['up', 'down']).optional(),
    }),
    params: z.object({
      replyId: z.string().trim().min(1),
    }),
  }),

  markAsSolvedValidation: z.object({
    body: z.object({
      replyId: z.string().trim().min(1),
    }),
    params: z.object({
      id: z.string().trim().min(1),
    }),
  }),

  moderationQueueValidation: z.object({
    query: z.object({
      status: z
        .enum(['queued', 'processing', 'review', 'approved', 'rejected', 'error'])
        .optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),

  moderationDecisionValidation: z.object({
    params: z.object({
      reviewId: z.string().trim().min(1),
    }),
    body: z.object({
      decision: z.enum(['approved', 'rejected']),
      notes: z.string().trim().max(1000).optional(),
    }),
  }),

  createAppealValidation: z.object({
    body: z.object({
      targetType: z.enum(['thread', 'reply']),
      targetId: z.string().trim().min(1),
      reason: z.string().trim().min(10).max(1000),
    }),
  }),

  appealQueueValidation: z.object({
    query: z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),

  resolveAppealValidation: z.object({
    params: z.object({
      appealId: z.string().trim().min(1),
    }),
    body: z.object({
      decision: z.enum(['approved', 'rejected']),
      notes: z.string().trim().max(1000).optional(),
    }),
  }),

  similarThreadsValidation: z.object({
    body: z.object({
      title: z.string().trim().min(5).max(180),
      content: z.string().trim().min(5).max(5000),
      threadId: z.string().trim().optional(),
      limit: z.number().int().min(1).max(10).optional(),
    }),
  }),

  smartTagValidation: z.object({
    body: z.object({
      title: z.string().trim().min(5).max(180),
      content: z.string().trim().min(5).max(5000),
    }),
  }),

  threadSummaryValidation: z.object({
    params: z.object({
      id: z.string().trim().min(1),
    }),
  }),

  answerSuggestionValidation: z.object({
    body: z.object({
      threadId: z.string().trim().optional(),
      draft: z.string().trim().max(5000).optional(),
    }),
  }),

  legalReferenceValidation: z.object({
    body: z.object({
      content: z.string().trim().min(10).max(5000),
    }),
  }),

  engagementMetricsValidation: z.object({
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  }),
};

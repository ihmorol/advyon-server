import { z } from 'zod';

const caseFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  order: z.number().int().min(0),
});

export const CaseValidation = {
  createCaseValidation: z.object({
    body: z.object({
      title: z.string().min(3, 'Title must be at least 3 characters'),
      caseNumber: z.string().min(1, 'Case number is required').optional(),
      caseType: z.string().min(1, 'Case type is required'),
      urgency: z.enum(['low', 'medium', 'high']).default('medium'),
      nextDeadline: z.string().datetime().optional(),
      nextDeadlineDescription: z.string().optional(),
      folders: z.array(caseFolderSchema).optional(),
    }),
  }),

  updateCaseValidation: z.object({
    body: z.object({
      title: z.string().min(3).optional(),
      caseType: z.string().min(1).optional(),
      status: z.enum(['active', 'pending', 'review', 'closed']).optional(),
      urgency: z.enum(['low', 'medium', 'high']).optional(),
      nextDeadline: z.string().datetime().optional(),
      nextDeadlineDescription: z.string().optional(),
      progress: z.number().int().min(0).max(100).optional(),
      folders: z.array(caseFolderSchema).optional(),
    }),
  }),

  queryCaseValidation: z.object({
    query: z.object({
      search: z.string().optional(),
      status: z.enum(['active', 'pending', 'review', 'closed']).optional(),
      urgency: z.enum(['low', 'medium', 'high']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),
};

import { z } from 'zod';
import { AI_TOOL_KEYS } from './ai.tool.interface';

const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(6000),
});

export const AIValidation = {
  chatValidation: z.object({
    body: z.object({
      message: z.string().trim().min(1).max(6000),
      caseId: z.string().trim().optional(),
      documentId: z.string().trim().optional(),
      documentIds: z.array(z.string().trim().min(1)).max(10).optional(),
      history: z.array(chatHistoryItemSchema).max(20).optional().default([]),
    }),
  }),

  analyzeDocumentValidation: z.object({
    body: z.object({
      documentId: z.string().trim().min(1),
    }),
  }),

  runToolValidation: z.object({
    params: z.object({
      toolKey: z.enum(AI_TOOL_KEYS),
    }),
    body: z.object({
      input: z.string().trim().min(1).max(8000),
      caseId: z.string().trim().optional(),
      documentId: z.string().trim().optional(),
      documentIds: z.array(z.string().trim().min(1)).max(10).optional(),
      history: z.array(chatHistoryItemSchema).max(20).optional().default([]),
    }),
  }),

  toolHistoryValidation: z.object({
    query: z.object({
      toolKey: z.enum(AI_TOOL_KEYS).optional(),
      status: z.enum(['success', 'blocked', 'failed']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),

  exportToolHistoryValidation: z.object({
    query: z.object({
      toolKey: z.enum(AI_TOOL_KEYS).optional(),
      format: z.enum(['json', 'csv']).optional(),
    }),
  }),

  toolMetricsValidation: z.object({
    query: z.object({
      toolKey: z.enum(AI_TOOL_KEYS).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  }),

  contextProfileValidation: z.object({
    query: z.object({
      caseId: z.string().trim().optional(),
    }),
  }),

  createChatValidation: z.object({
    body: z.object({
      chatId: z.string().trim().optional().nullable(),
      message: z.string().trim().min(1).max(20000), // Increased limit for larger context if needed
      context: z.any().optional(),
    }),
  }),

  getChatValidation: z.object({
    params: z.object({
      id: z.string().trim().min(1),
    }),
  }),

  deleteChatValidation: z.object({
    params: z.object({
      id: z.string().trim().min(1),
    }),
  }),
};

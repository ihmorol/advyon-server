import { z } from 'zod';

const createNotificationValidation = z.object({
    body: z.object({
        type: z.enum(['alert', 'request', 'message', 'case_update', 'document_upload', 'hearing_reminder', 'deadline', 'ai_analysis_complete']),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        title: z.string().min(1),
        message: z.string().min(1),
        recipientId: z.string().min(1),
        caseId: z.string().optional(),
        channels: z.object({
            inApp: z.boolean().optional(),
            email: z.boolean().optional(),
            webPush: z.boolean().optional(),
        }).optional(),
    }),
});

const markReadValidation = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
});

export const NotificationValidation = {
    createNotificationValidation,
    markReadValidation,
};

import { z } from 'zod';

export const ScheduleValidation = {
    createEventValidation: z.object({
        body: z.object({
            title: z.string().min(1, 'Title is required').max(200),
            description: z.string().max(1000).optional(),
            eventType: z.enum(['hearing', 'meeting', 'filing', 'deadline', 'other']),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
            startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
            endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
            location: z.string().max(500).optional(),
            caseId: z.string().min(1, 'Case ID is required'),
            participants: z.array(z.string()).optional(),
            status: z.enum(['scheduled', 'completed', 'cancelled', 'postponed']).optional(),
            reminders: z.array(z.object({
                time: z.number().min(0).max(10080), // max 1 week in minutes
                sent: z.boolean().optional(),
            })).optional(),
            recurrence: z.object({
                frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
                interval: z.number().min(1).max(365),
                endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional(),
                daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
            }).optional(),
            resourceId: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
        }),
    }),

    updateEventValidation: z.object({
        body: z.object({
            title: z.string().min(1).max(200).optional(),
            description: z.string().max(1000).optional(),
            eventType: z.enum(['hearing', 'meeting', 'filing', 'deadline', 'other']).optional(),
            date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
            startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional(),
            endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional(),
            location: z.string().max(500).optional(),
            status: z.enum(['scheduled', 'completed', 'cancelled', 'postponed']).optional(),
            reminders: z.array(z.object({
                time: z.number().min(0).max(10080),
                sent: z.boolean().optional(),
            })).optional(),
            recurrence: z.object({
                frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
                interval: z.number().min(1).max(365),
                endDate: z.string().optional(),
                daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
            }).optional(),
            resourceId: z.string().optional(),
        }),
    }),

    queryEventValidation: z.object({
        query: z.object({
            page: z.string().optional(),
            limit: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            eventType: z.enum(['hearing', 'meeting', 'filing', 'deadline', 'other']).optional(),
            caseId: z.string().optional(),
        }),
    }),

    conflictCheckValidation: z.object({
        query: z.object({
            date: z.string(),
            startTime: z.string(),
            endTime: z.string(),
            participants: z.string().optional(), // comma-separated IDs
        }),
    }),
};

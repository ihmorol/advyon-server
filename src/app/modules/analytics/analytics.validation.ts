import { z } from 'zod';

const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' });

const getMetricsValidation = z.object({
  query: z.object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    caseId: z.string().optional(),
  }),
});

const getSupportKpiValidation = z.object({
  query: z.object({
    rangeDays: z
      .string()
      .regex(/^\d+$/, 'rangeDays must be a number')
      .transform(val => Number(val))
      .refine(val => val > 0 && val <= 365, {
        message: 'rangeDays must be between 1 and 365',
      })
      .optional(),
  }),
});

export const AnalyticsValidation = {
  getMetricsValidation,
  getSupportKpiValidation,
};

/**
 * @fileoverview Payment Zod validation schemas.
 */
import { z } from 'zod';

export const getPaymentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

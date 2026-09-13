import { z } from 'zod';

/**
 * WBS-1.4 — Server-side document validation schemas.
 * Mirrors client-side documentSchemas.js for parity.
 */

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const;

// Allowed folder names
const FOLDER_NAMES = [
  'Evidence',
  'Legal Documents',
  'Court Orders',
  'Correspondence',
  'Contracts',
  'Financial',
  'Affidavits',
  'Other',
] as const;

// Max file size: 50 MB
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const DocumentValidation = {
  /**
   * Validates document upload body.
   */
  uploadDocumentValidation: z.object({
    body: z.object({
      folderName: z
        .string()
        .refine((val) => (FOLDER_NAMES as readonly string[]).includes(val), {
          message: `Folder must be one of: ${FOLDER_NAMES.join(', ')}`,
        })
        .optional(),
      folder: z
        .string()
        .max(50, 'Folder name too long')
        .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Folder name contains invalid characters')
        .optional(),
    }),
  }),

  /**
   * Validates document query parameters.
   */
  queryDocumentValidation: z.object({
    query: z.object({
      folder: z.string().optional(),
      category: z.string().optional(),
      processingStatus: z
        .enum(['pending', 'processing', 'completed', 'failed'])
        .optional(),
      sortBy: z
        .enum(['date', 'name', 'size', 'status'])
        .optional(),
      sortOrder: z
        .enum(['asc', 'desc'])
        .optional(),
    }),
  }),

  /**
   * Validates single document download request.
   */
  downloadDocumentValidation: z.object({
    params: z.object({
      documentId: z.string().min(1, 'Document ID is required'),
    }),
  }),

  /**
   * Validates batch download request body.
   */
  batchDownloadValidation: z.object({
    body: z.object({
      documentIds: z
        .array(z.string().min(1))
        .min(1, 'Select at least one document')
        .max(50, 'Maximum 50 documents per batch'),
    }),
  }),

  /**
   * Runtime MIME type check (used in middleware, not body validation).
   */
  ALLOWED_MIME_TYPES,
  FOLDER_NAMES,
  MAX_FILE_SIZE_BYTES,
};


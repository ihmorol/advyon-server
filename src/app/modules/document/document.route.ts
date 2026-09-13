import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { DocumentControllers } from './document.controller';
import { DocumentValidation } from './document.validation';
import { uploadDocument } from '../../config/document-upload.config';

const router = express.Router();

// Routes specific to Documents that don't fit well under /cases/:caseId (e.g. actions on a specific document regardless of case context, or if API design prefers global document access)
// However, most document actions are better accessed via /cases routes.
// We'll keep specific single-document operations here if they are not redundant with case.route.ts functionality.

// Note: /api/v1/cases/:caseId/documents is now the primary way to upload and list documents.
// These are removed to avoid duplication.

/**
 * GET /documents/my-documents
 * Get all documents for the authenticated user across all cases
 * Requires authentication
 */
router.get('/my-documents', auth(), DocumentControllers.getAllDocuments);

/**
 * GET /documents/:documentId/content
 * Get document content (viewer)
 */
router.get(
  '/:documentId/content',
  auth(),
  DocumentControllers.getDocumentContent
);

/**
 * GET /documents/:documentId/view
 * Proxy document for inline viewing (solves Cloudinary attachment issue)
 */
router.get(
  '/:documentId/view',
  auth(),
  DocumentControllers.viewDocument
);

/**
 * PUT /documents/:documentId/summary
 * Update document summary
 */
router.put(
  '/:documentId/summary',
  auth(),
  DocumentControllers.updateDocumentSummary
);

/**
 * GET /documents/id/:documentId
 * Get a single document by ID (direct access)
 * Requires authentication
 */
router.get('/id/:documentId', auth(), DocumentControllers.getDocumentById);

/**
 * GET /documents/:caseId/:documentId
 * Get a single document by ID
 * Requires authentication
 */
router.get('/:caseId/:documentId', auth(), DocumentControllers.getDocument);

/**
 * GET /documents/:caseId/:documentId/status
 * Get document processing status (for polling)
 * Requires authentication
 */
router.get(
  '/:caseId/:documentId/status',
  auth(),
  DocumentControllers.getDocumentStatus,
);

/**
 * POST /documents/:caseId/:documentId/reanalyze
 * Re-trigger AI analysis for a document
 * Requires authentication
 */
router.post(
  '/:caseId/:documentId/reanalyze',
  auth(),
  DocumentControllers.reanalyzeDocument,
);

/**
 * PATCH /documents/:documentId/archive
 * Archive a document
 */
router.patch('/:documentId/archive', auth(), DocumentControllers.archiveDocument);

/**
 * PATCH /documents/:documentId/restore
 * Restore/Unarchive a document
 */
router.patch('/:documentId/restore', auth(), DocumentControllers.restoreDocument);

/**
 * DELETE /documents/:caseId/:documentId
 * Delete a document
 * Requires authentication
 */
router.delete('/:caseId/:documentId', auth(), DocumentControllers.deleteDocument);
router.get('/:caseId/:documentId/download', auth('admin', 'superAdmin', 'lawyer', 'client'), DocumentControllers.downloadDocument);

/**
 * POST /documents/batch-download
 * WBS-5.5: Batch download — returns download URLs for multiple documents
 */
router.post('/batch-download', auth('admin', 'superAdmin', 'lawyer', 'client'), DocumentControllers.batchDownload);

export const DocumentRoutes = router;

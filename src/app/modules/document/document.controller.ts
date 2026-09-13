import httpStatus from 'http-status';
import fs from 'fs';
import mongoose from 'mongoose';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DocumentServices } from './document.service';
import { AIService } from '../ai/ai.service';
import {
  uploadBufferToCloudinary,
  uploadFileToCloudinary,
  getSignedUrl,
  resolveResourceTypeFromMime,
  resolveResourceTypeFromUrl,
  resolveDeliveryTypeFromUrl,
} from '../../utils/file.upload.utils';
import { DocumentModel } from './document.model';
import { Case } from '../case/case.model';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import { User } from '../user/user.model';
import AppError from '../../errors/appError';

const resolveUserByRequestId = async (requestUserId: string) => {
  let user = await User.findOne({ id: requestUserId });

  if (!user && mongoose.Types.ObjectId.isValid(requestUserId)) {
    user = await User.findById(requestUserId);
  }

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const resolveCaseByIdentifier = async (caseId: string) => {
  let caseData = null;

  if (mongoose.Types.ObjectId.isValid(caseId)) {
    caseData = await Case.findById(caseId);
  }

  if (!caseData) {
    caseData = await Case.findOne({ id: caseId });
  }

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  return caseData;
};

const canAccessCase = async (user: any, caseData: any) => {
  const isOwner = caseData.createdBy?.toString() === user._id.toString();
  const isPrimaryClient = caseData.clientId?.toString() === user._id.toString();
  const isPrivileged = user.role === 'admin' || user.role === 'superAdmin';

  if (isOwner || isPrimaryClient || isPrivileged) {
    return true;
  }

  const hasSharedAccess = await CaseAccessModel.exists({
    caseId: caseData._id,
    userId: user._id,
    status: 'active',
  });

  return Boolean(hasSharedAccess);
};

const assertCaseAccess = async (requestUserId: string, caseId: string) => {
  const user = await resolveUserByRequestId(requestUserId);
  const caseData = await resolveCaseByIdentifier(caseId);

  const hasAccess = await canAccessCase(user, caseData);
  if (!hasAccess) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have access to this case');
  }

  return { user, caseData };
};

const assertDocumentAccess = async (requestUserId: string, documentId: string) => {
  const user = await resolveUserByRequestId(requestUserId);
  const document = await DocumentModel.findOne({ id: documentId });

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  const caseData = await Case.findById(document.caseId);
  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Associated case not found');
  }

  const hasAccess = await canAccessCase(user, caseData);
  if (!hasAccess) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have access to this document');
  }

  return { user, document, caseData };
};

/**
 * Upload a document with AI analysis
 * POST /cases/:caseId/documents/upload
 *
 * Workflow:
 * 1. Receive file via Multer
 * 2. Upload to Cloudinary
 * 3. Create DB entry (status: 'processing')
 * 4. Async: Trigger AI analysis
 * 5. Update DB with results (status: 'completed' or 'failed')
 * 6. Return document ID immediately (don't wait for AI)
 */
const uploadDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId: caseIdParam } = req.params;
  const { folderName, folder } = req.body;
  const file = req.file;

  // Validate caseId
  if (!caseIdParam) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Missing required field: caseId',
      data: null,
    });
  }

  if (!file) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'No file uploaded',
      data: null,
    });
  }

  // Resolve case ID: might be ObjectId or custom ID (e.g., CS-2025-0047)
  let resolvedCaseId: string = caseIdParam;
  const isCaseValidObjectId = mongoose.Types.ObjectId.isValid(caseIdParam);

  if (!isCaseValidObjectId) {
    // It's a custom ID (e.g., CS-2025-0047). Find the real _id.
    const caseData = await Case.findOne({ id: caseIdParam });
    if (!caseData) {
      throw new AppError(httpStatus.NOT_FOUND, `Case not found: ${caseIdParam}`);
    }
    resolvedCaseId = caseData._id.toString();
  }

  // Resolve user ID: might be ObjectId or custom ID (e.g., CLI-0002)
  // Resolve user ID
  // req.user.userId comes from auth middleware. 
  // If it's a valid MongoID, we should try findById first.
  let resolvedUploaderId: string = userId;
  const isUserValidObjectId = mongoose.Types.ObjectId.isValid(userId);

  if (isUserValidObjectId) {
    const uploaderUser = await User.findById(userId);
    if (!uploaderUser) {
      // Fallback: It might be a valid ObjectID string but stored in 'id' field (unlikely but possible)
      const userByCustomId = await User.findOne({ id: userId });
      if (!userByCustomId) {
        throw new AppError(httpStatus.NOT_FOUND, `Uploader user not found: ${userId}`);
      }
      resolvedUploaderId = userByCustomId._id.toString();
    } else {
      resolvedUploaderId = uploaderUser._id.toString();
    }
  } else {
    // It's a custom ID (e.g., CLI-0002).
    const uploaderUser = await User.findOne({ id: userId });
    if (!uploaderUser) {
      throw new AppError(httpStatus.NOT_FOUND, `Uploader user not found: ${userId}`);
    }
    resolvedUploaderId = uploaderUser._id.toString();
  }

  const documentInit = await DocumentServices.initiateDocumentUpload({
    caseId: resolvedCaseId,
    folderName: folderName || folder || 'General',
    fileName: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
    uploaderId: resolvedUploaderId,
  });

  const documentId = documentInit.documentId;

  // Step 2: Trigger Async Background Process (Upload + AI) and return immediately
  // We pass the file object and other necessary details to the background function
  processDocumentUploadAndAI(documentId, file, caseIdParam).catch((error) => {
    console.error(`Background processing failed for document ${documentId}:`, error);
  });

  // Step 3: Return immediately with document ID (status: 'pending')
  const document = await DocumentModel.findOne({ id: documentId })
    .populate('uploadedBy', 'id fullName email')
    .populate('caseId', 'id caseNumber title');

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Document upload initiated. Processing in background.',
    data: {
      document,
      processingStatus: 'pending',
      message: 'Upload and analysis running in background. Poll for updates.',
    },
  });
});

/**
 * Background process for Cloudinary Upload followed by AI analysis
 */
async function processDocumentUploadAndAI(
  documentId: string,
  file: Express.Multer.File,
  caseIdParam: string
): Promise<void> {
  try {
    // Step 1: Upload to Cloudinary
    let cloudinaryResult;
    const uploadResourceType = resolveResourceTypeFromMime(file.mimetype);

    // Check if file is stored on disk (multer diskStorage) or in memory
    if (file.path) {
      // File is on disk
      try {
        cloudinaryResult = await uploadFileToCloudinary(file.path, {
          folder: `advyon/cases/${caseIdParam}/documents`,
          publicIdPrefix: `doc_${documentId}`,
          resourceType: uploadResourceType,
        });
      } finally {
        // Clean up temp file only if it's a local file, regardless of upload success/failure
        if (!file.path.startsWith('http')) {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
        }
      }
    } else if (file.buffer) {
      // File is in memory
      cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
        folder: `advyon/cases/${caseIdParam}/documents`,
        publicIdPrefix: `doc_${documentId}`,
        resourceType: uploadResourceType,
      });
    } else {
      throw new Error('File data not available');
    }

    // Step 2: Update DB with Cloudinary details (status: 'processing')
    await DocumentServices.updateCloudinaryDetails(
      documentId,
      cloudinaryResult.secure_url,
      cloudinaryResult.public_id,
      cloudinaryResult.asset_id,
    );

    // Step 3: Trigger AI analysis
    // We need to pass the file content to the AI. 
    // If it was a buffer, we still have it. If it was a path, we might have deleted it, 
    // so we should rely on the buffer or download it if needed (though we just uploaded it).
    // Optimization: logic in processDocumentWithAI handles fetching if buffer missing.
    // However, since we have the buffer or file path logic here, let's just proceed.

    await processDocumentWithAI(documentId, file, cloudinaryResult.secure_url);

  } catch (error) {
    console.error(`Upload processing failed for document ${documentId}:`, error);

    // Update status to failed if upload fails
    await DocumentServices.updateProcessingStatus(
      documentId,
      'failed',
      error instanceof Error ? error.message : 'Upload failed',
    );
  }
}

/**
 * Background process for AI analysis
 * SIMPLE FLOW: Buffer → Gemini Vision → DB Update
 * No text extraction needed - Gemini reads PDFs/images natively
 */
async function processDocumentWithAI(
  documentId: string,
  file: Express.Multer.File,
  fileUrl?: string
): Promise<void> {
  console.log(`[Document Controller] processDocumentWithAI started for Doc ID: ${documentId}`);

  try {
    // Step 1: Get file buffer (from memory or fetch from URL)
    let fileBuffer = file.buffer;

    if (!fileBuffer && fileUrl) {
      console.log(`[Document Controller] Fetching file from Cloudinary URL...`);
      const axios = await import('axios');
      const response = await axios.default.get(fileUrl, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(response.data);
    }

    if (!fileBuffer) {
      throw new Error('File content not available for analysis');
    }

    console.log(`[Document Controller] File buffer ready. Size: ${fileBuffer.length} bytes, MIME: ${file.mimetype}`);

    // Step 2: Send directly to AI Service (Gemini Vision)
    // No text extraction needed - Gemini reads the file directly
    console.log(`[Document Controller] Sending to Gemini Vision...`);
    const aiAnalysis = await AIService.analyzeLegalDocument('', fileBuffer, file.mimetype);

    console.log(`[Document Controller] AI Analysis received. Confidence: ${aiAnalysis.confidenceScore}, Category: ${aiAnalysis.documentCategory}`);

    // Step 3: Update document in database
    // Update folderName if confidence is good (>0.6) - regardless of category
    const isAnalysisReliable = aiAnalysis.confidenceScore > 0.6 && aiAnalysis.documentCategory;

    const updateData: any = {
      processingStatus: 'completed',
      aiAnalysis,
      analysisStatus: 'analyzed',
    };

    // Auto-organize: Update folder based on AI category (includes 'Other')
    if (isAnalysisReliable) {
      updateData.folderName = aiAnalysis.documentCategory;
      console.log(`[Document Controller] Auto-filing to folder: ${aiAnalysis.documentCategory}`);
    }

    const updatedDoc = await DocumentModel.findOneAndUpdate(
      { id: documentId },
      updateData,
      { new: true }
    );

    if (updatedDoc) {
      console.log(`[Document Controller] ✅ DB Updated for Doc ID: ${documentId}. Status: ${updatedDoc.analysisStatus}`);
    } else {
      console.error(`[Document Controller] ❌ DB Update failed! Document not found: ${documentId}`);
    }

    console.log(`✅ AI analysis completed for document: ${documentId}`);

  } catch (error) {
    console.error(`❌ AI processing failed for document ${documentId}:`, error);

    await DocumentServices.updateProcessingStatus(
      documentId,
      'failed',
      error instanceof Error ? error.message : 'AI analysis failed',
    );
  }
}

/**
 * Upload document (legacy - direct Cloudinary upload via multer-storage-cloudinary)
 * POST /cases/:caseId/documents/upload-legacy
 */
const uploadDocumentLegacy = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;
  const { folderName } = req.body;
  const file = req.file;

  if (!file) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'No file uploaded',
      data: null,
    });
  }

  const result = await DocumentServices.uploadDocument(
    caseId,
    userId,
    file,
    folderName,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Document uploaded successfully',
    data: result,
  });
});

/**
 * Get all documents for a case
 * GET /cases/:caseId/documents
 */
const getDocuments = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId } = req.params;

  const result = await DocumentServices.getDocumentsByCase(
    caseId,
    userId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Documents retrieved successfully',
    data: result,
  });
});

/**
 * Get single document with AI analysis status
 * GET /cases/:caseId/documents/:documentId
 */
const getDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId, documentId } = req.params;

  const { caseData } = await assertDocumentAccess(userId, documentId);

  const belongsToRequestedCase =
    caseData.id === caseId || caseData._id.toString() === caseId;

  if (!belongsToRequestedCase) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document does not belong to this case');
  }

  const document = await DocumentModel.findOne({ id: documentId })
    .populate('uploadedBy', 'id fullName email')
    .populate('caseId', 'id caseNumber title');

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document retrieved successfully',
    data: document,
  });
});

/**
 * Get single document by ID (direct access)
 * GET /documents/id/:documentId
 */
const getDocumentById = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;

  await assertDocumentAccess(userId, documentId);

  const document = await DocumentModel.findOne({ id: documentId })
    .populate('uploadedBy', 'id fullName email')
    .populate('caseId', 'id caseNumber title');

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  const docObj = document.toObject();
  if (docObj.cloudinaryPublicId) {
    try {
      // Use stored mimeType if available, fall back to URL parsing for legacy documents
      const resourceType = docObj.mimeType
        ? resolveResourceTypeFromMime(docObj.mimeType)
        : resolveResourceTypeFromUrl(docObj.cloudinaryUrl);
      const deliveryType = resolveDeliveryTypeFromUrl(docObj.cloudinaryUrl);
      docObj.cloudinaryUrl = getSignedUrl(docObj.cloudinaryPublicId, {
        resourceType,
        deliveryType,
      });
    } catch (err) {
      console.error(`Failed to sign URL for doc ${document.id}:`, err);
    }
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document retrieved successfully',
    data: docObj,
  });
});

/**
 * Get document processing status (for polling)
 * GET /cases/:caseId/documents/:documentId/status
 */
const getDocumentStatus = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId, documentId } = req.params;

  const { caseData } = await assertDocumentAccess(userId, documentId);

  const belongsToRequestedCase =
    caseData.id === caseId || caseData._id.toString() === caseId;

  if (!belongsToRequestedCase) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document does not belong to this case');
  }

  const document = await DocumentModel.findOne(
    { id: documentId },
    { processingStatus: 1, processingError: 1, aiAnalysis: 1 },
  );

  if (!document) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Document not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document status retrieved',
    data: {
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      aiAnalysis: document.aiAnalysis,
      isComplete: document.processingStatus === 'completed',
    },
  });
});

/**
 * Delete a document
 * DELETE /cases/:caseId/documents/:documentId
 */
const deleteDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId, documentId } = req.params;

  const result = await DocumentServices.deleteDocument(
    documentId,
    caseId,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Re-analyze document with AI (retry failed analysis)
 * POST /cases/:caseId/documents/:documentId/reanalyze
 */
const reanalyzeDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { caseId, documentId } = req.params;

  const { caseData } = await assertDocumentAccess(userId, documentId);

  const belongsToRequestedCase =
    caseData.id === caseId || caseData._id.toString() === caseId;

  if (!belongsToRequestedCase) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document does not belong to this case');
  }

  const document = await DocumentModel.findOne({ id: documentId });

  if (!document) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Document not found',
      data: null,
    });
  }

  // Update status to processing
  await DocumentServices.updateProcessingStatus(documentId, 'processing');

  // We need the file for re-analysis, but it's on Cloudinary
  // For re-analysis, we would need to download from Cloudinary first
  // This is a placeholder - actual implementation would fetch and re-process

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document re-analysis initiated',
    data: { documentId, processingStatus: 'processing' },
  });
});

/**
 * Download a document
 * GET /documents/:caseId/:documentId/download
 * WBS-5.5: Added ownership verification
 */
const downloadDocument = catchAsync(async (req, res) => {
  const { caseId, documentId } = req.params;
  const { userId } = req.user;

  const { document, caseData } = await assertDocumentAccess(userId, documentId);

  const belongsToRequestedCase =
    caseData.id === caseId || caseData._id.toString() === caseId;

  if (!belongsToRequestedCase) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document does not belong to this case');
  }

  // Return Cloudinary URL with proper Content-Disposition guidance
  // Use stored mimeType if available, fall back to URL parsing for legacy documents
  const resourceType = document.mimeType
    ? resolveResourceTypeFromMime(document.mimeType)
    : resolveResourceTypeFromUrl(document.cloudinaryUrl);
  const deliveryType = resolveDeliveryTypeFromUrl(document.cloudinaryUrl);
  const signedDownloadUrl = document.cloudinaryPublicId
    ? getSignedUrl(document.cloudinaryPublicId, {
        resourceType,
        deliveryType,
        attachmentFilename: document.fileName,
      })
    : document.cloudinaryUrl;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Download URL retrieved successfully',
    data: {
      downloadUrl: signedDownloadUrl,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
    },
  });
});

/**
 * Batch download — return download URLs for multiple documents
 * POST /documents/batch-download
 * Body: { caseId, documentIds: string[] }
 * WBS-5.5
 */
const batchDownload = catchAsync(async (req, res) => {
  const { caseId, documentIds } = req.body;
  const { userId } = req.user;

  if (!caseId || !Array.isArray(documentIds) || !documentIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'caseId and non-empty documentIds array are required');
  }

  if (documentIds.length > 20) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Maximum 20 documents per batch download');
  }

  const { caseData } = await assertCaseAccess(userId, caseId);

  const documents = await DocumentModel.find({
    id: { $in: documentIds },
    caseId: caseData._id,
  });

  const results = documentIds.map((docId) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return { documentId: docId, error: 'Not found' };
    // Use stored mimeType if available, fall back to URL parsing for legacy documents
    const resourceTypeForDoc = doc.mimeType
      ? resolveResourceTypeFromMime(doc.mimeType)
      : resolveResourceTypeFromUrl(doc.cloudinaryUrl);
    const deliveryTypeForDoc = resolveDeliveryTypeFromUrl(doc.cloudinaryUrl);
    const signedDownloadUrl = doc.cloudinaryPublicId
      ? getSignedUrl(doc.cloudinaryPublicId, {
          resourceType: resourceTypeForDoc,
          deliveryType: deliveryTypeForDoc,
          attachmentFilename: doc.fileName,
        })
      : doc.cloudinaryUrl;
    return {
      documentId: docId,
      downloadUrl: signedDownloadUrl,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
    };
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Batch download URLs for ${results.filter((r) => !r.error).length}/${documentIds.length} documents`,
    data: results,
  });
});

/**
 * Get document content (viewer)
 * GET /documents/:documentId/content
 */
const getDocumentContent = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;

  await assertDocumentAccess(userId, documentId);

  const document = await DocumentServices.getDocumentContent(documentId);

  // Use stored mimeType if available, fall back to URL parsing for legacy documents
  const documentResourceType = document.mimeType
    ? resolveResourceTypeFromMime(document.mimeType)
    : resolveResourceTypeFromUrl(document.cloudinaryUrl);
  const deliveryType = resolveDeliveryTypeFromUrl(document.cloudinaryUrl);
  const sourceUrl = document.cloudinaryPublicId
    ? getSignedUrl(document.cloudinaryPublicId, {
        resourceType: documentResourceType,
        deliveryType: deliveryType,
        inline: true, // Force inline display for viewer
      })
    : document.cloudinaryUrl;

  if (!sourceUrl) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document content not available');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document content access url',
    data: {
      url: sourceUrl,
      fileType: document.fileType,
      fileName: document.fileName,
    },
  });
});

/**
 * Update document summary
 * PUT /documents/:documentId/summary
 */
const updateDocumentSummary = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;
  const { summary } = req.body;

  await assertDocumentAccess(userId, documentId);

  if (!summary) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Summary is required');
  }

  const result = await DocumentServices.updateDocumentSummary(documentId, summary);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Document summary updated successfully',
    data: result,
  });
});

/**
 * Get all documents for the authenticated user across all cases
 * GET /documents/my-documents
 */
const getAllDocuments = catchAsync(async (req, res) => {
  const { userId } = req.user;

  // Resolve user ID to MongoDB ObjectId
  let resolvedUserId: string = userId;
  const isUserValidObjectId = mongoose.Types.ObjectId.isValid(userId);

  if (isUserValidObjectId) {
    const user = await User.findById(userId);
    if (!user) {
      const userByCustomId = await User.findOne({ id: userId });
      if (!userByCustomId) {
        throw new AppError(httpStatus.NOT_FOUND, `User not found: ${userId}`);
      }
      resolvedUserId = userByCustomId._id.toString();
    } else {
      resolvedUserId = user._id.toString();
    }
  } else {
    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, `User not found: ${userId}`);
    }
    resolvedUserId = user._id.toString();
  }

  // Extract query parameters
  const { folder, processingStatus, category, status } = req.query;

  const result = await DocumentServices.getAllUserDocuments(resolvedUserId, {
    folder: folder as string | undefined,
    processingStatus: processingStatus as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
    category: category as string | undefined,
    status: status as 'active' | 'archived' | undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Documents retrieved successfully',
    data: result,
  });
});

/**
 * Archive a document
 * PATCH /documents/:documentId/archive
 */
const archiveDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;

  const result = await DocumentServices.archiveDocument(documentId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Restore/Unarchive a document
 * PATCH /documents/:documentId/restore
 */
const restoreDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;

  const result = await DocumentServices.restoreDocument(documentId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * View document inline - Proxy through backend to force inline display
 * GET /documents/:documentId/view
 * This solves Cloudinary's Content-Disposition: attachment issue for raw files
 */
const viewDocument = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { documentId } = req.params;

  await assertDocumentAccess(userId, documentId);

  const document = await DocumentServices.getDocumentContent(documentId);

  if (!document.cloudinaryUrl) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document content not available');
  }

  // Generate signed URL to fetch from Cloudinary
  const documentResourceType = document.mimeType
    ? resolveResourceTypeFromMime(document.mimeType)
    : resolveResourceTypeFromUrl(document.cloudinaryUrl);
  const deliveryType = resolveDeliveryTypeFromUrl(document.cloudinaryUrl);
  
  const signedUrl = document.cloudinaryPublicId
    ? getSignedUrl(document.cloudinaryPublicId, {
        resourceType: documentResourceType,
        deliveryType: deliveryType,
      })
    : document.cloudinaryUrl;

  // Determine content type and filename
  const mimeType = document.mimeType || 'application/octet-stream';
  const fileName = document.fileName || `document-${documentId}`;
  
  // Ensure filename has .pdf extension for PDFs
  const finalFileName = fileName.toLowerCase().endsWith('.pdf') 
    ? fileName 
    : `${fileName}.pdf`;

  console.log('[ViewDocument] Streaming file:', {
    documentId,
    mimeType,
    fileName: finalFileName,
    resourceType: documentResourceType,
  });

  // Stream the file from Cloudinary to client
  try {
    const axios = await import('axios');
    const response = await axios.default.get(signedUrl, {
      responseType: 'stream',
      timeout: 30000,
    });

    // Set headers for inline display (must be set before piping)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${finalFileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Pipe the Cloudinary response to our client
    response.data.pipe(res);

    // Guard against mid-stream failures (e.g. network blip, signed URL expiry).
    // Without an 'error' listener the emitted 'error' event is unhandled and
    // crashes the whole server via uncaughtException.
    response.data.on('error', (streamError: Error) => {
      console.error('Document stream failed:', streamError.message);
      // Headers may already be sent; destroy the response so the client
      // sees the connection drop instead of a truncated 200.
      if (!res.headersSent) {
        sendResponse(res, {
          statusCode: httpStatus.BAD_GATEWAY,
          success: false,
          message: 'Document stream failed',
          data: null,
        });
      } else {
        res.destroy();
      }
    });
  } catch (error) {
    console.error('Error streaming document from Cloudinary:', error);
    throw new AppError(httpStatus.BAD_GATEWAY, 'Failed to fetch document from storage');
  }
});

export const DocumentControllers = {
  uploadDocument,
  uploadDocumentLegacy,
  getDocuments,
  getDocument,
  getDocumentById,
  getDocumentStatus,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  reanalyzeDocument,
  downloadDocument,
  batchDownload,
  getDocumentContent,
  updateDocumentSummary,
  getAllDocuments,
  viewDocument,
};


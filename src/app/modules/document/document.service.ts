/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import mongoose from 'mongoose';
import { DocumentModel } from './document.model';
import {
  TDocumentQuery,
  TGroupedDocuments,
  TInitiateDocumentPayload,
} from './document.interface';
import { generateDocumentId } from './document.utils';
import { ActivityService } from '../activity/activity.service';
import {
  getSignedUrl,
  resolveResourceTypeFromMime,
  resolveResourceTypeFromUrl,
  resolveDeliveryTypeFromUrl,
} from '../../utils/file.upload.utils';
import path from 'path';

const ensureFileNameHasExtension = (fileName: string, mimeType?: string) => {
  const ext = path.extname(fileName);
  if (ext) return fileName;
  if (!mimeType) return fileName;

  const inferredExt = mimeType.split('/').pop();
  if (!inferredExt) return fileName;
  return `${fileName}.${inferredExt}`;
};

/**
 * Upload a document to a case
 */
const uploadDocument = async (
  caseId: string,
  userId: string,
  file: Express.Multer.File,
  folderName: string,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Verify case exists and user owns it
  let caseData;
  if (mongoose.Types.ObjectId.isValid(caseId)) {
    caseData = await Case.findById(caseId);
  }

  if (!caseData) {
    caseData = await Case.findOne({ id: caseId });
  }

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to upload documents to this case',
    );
  }

  // Generate document ID
  const documentId = await generateDocumentId();

  // Extract file info from Cloudinary upload
  const fileType = file.mimetype.split('/')[1];

  const normalizedFileName = ensureFileNameHasExtension(
    file.originalname,
    file.mimetype,
  );

  // Create document record
  const document = await DocumentModel.create({
    id: documentId,
    caseId: caseData._id,
    folderName,
    fileName: normalizedFileName,
    fileType, // file extension
    mimeType: file.mimetype, // full MIME type for proper resource type resolution
    fileSize: file.size,
    cloudinaryUrl: (file as any).path, // Cloudinary URL
    cloudinaryPublicId: (file as any).filename, // Cloudinary public ID
    analysisStatus: 'pending',
    uploadedBy: user._id,
    uploadedAt: new Date(),
  });

  // Log activity
  await ActivityService.logActivity({
    type: 'document_uploaded',
    message: `Document uploaded: ${document.fileName} to folder ${folderName}`,
    userId: user._id,
    caseId: caseData._id,
    documentId: document._id as any,
  });

  return await DocumentModel.findById(document._id)
    .populate('uploadedBy', 'id fullName email')
    .populate('caseId', 'id caseNumber title');
};

/**
 * Get all documents for a case
 */
const getDocumentsByCase = async (
  caseId: string,
  userId: string,
  query: TDocumentQuery,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Verify case exists
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

  const isOwner = caseData.createdBy.toString() === user._id.toString();
  const isPrimaryClient = caseData.clientId?.toString() === user._id.toString();
  const hasSharedAccess = await CaseAccessModel.exists({
    caseId: caseData._id,
    userId: user._id,
    status: 'active',
  });
  const isPrivileged = user.role === 'admin' || user.role === 'superAdmin';

  if (!isOwner && !isPrimaryClient && !hasSharedAccess && !isPrivileged) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access documents for this case',
    );
  }

  // Build filter - exclude soft-deleted and archived documents by default unless requested
  const filter: any = {
    caseId: caseData._id,
    isDeleted: { $ne: true },
    status: query.status === 'archived' ? 'archived' : { $ne: 'archived' },
  };

  if (query.folder) {
    filter.folderName = query.folder;
  }

  // Get documents
  const documents = await DocumentModel.find(filter)
    .populate('uploadedBy', 'id fullName email')
    .sort({ uploadedAt: -1 });

  // Process documents to sign URLs
  const processedDocuments = documents.map((doc) => {
    const docObj = doc.toObject();
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
        console.error(`Failed to sign URL for doc ${doc.id}:`, err);
      }
    }
    return docObj;
  });

  // Group documents by folder
  const groupedDocuments: TGroupedDocuments = {};

  processedDocuments.forEach((doc) => {
    if (!groupedDocuments[doc.folderName]) {
      groupedDocuments[doc.folderName] = [];
    }
    groupedDocuments[doc.folderName].push(doc);
  });

  return {
    documents: processedDocuments,
    groupedByFolder: groupedDocuments,
    total: documents.length,
  };
};

/**
 * Delete a document
 */
const deleteDocument = async (
  documentId: string,
  caseId: string,
  userId: string,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Verify case exists and user owns it
  const caseData = await Case.findOne({ id: caseId });
  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to delete documents from this case',
    );
  }

  // Find document
  const document = await DocumentModel.findOne({ id: documentId });
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Verify document belongs to the case
  if (document.caseId.toString() !== caseData._id.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Document does not belong to this case');
  }

  // Soft delete - mark as deleted instead of removing
  await DocumentModel.findByIdAndUpdate(document._id, {
    isDeleted: true,
    deletedAt: new Date(),
  });

  // Log activity
  await ActivityService.logActivity({
    type: 'document_deleted',
    message: `Document deleted: ${document.fileName}`,
    userId: user._id,
    caseId: caseData._id,
  });

  return { message: 'Document deleted successfully' };
};

/**
 * Archive a document (soft-archive: set status to 'archived')
 */
const archiveDocument = async (
  documentId: string,
  userId: string,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Find document
  const document = await DocumentModel.findOne({ id: documentId, isDeleted: { $ne: true } });
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Only uploader can archive
  if (document.uploadedBy.toString() !== user._id.toString() && document.uploaderId?.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to archive this document');
  }

  await DocumentModel.findByIdAndUpdate(document._id, {
    status: 'archived',
    archivedAt: new Date(),
  });

  return { message: 'Document archived successfully' };
};

/**
 * Restore/Unarchive a document (set status back to 'active')
 */
const restoreDocument = async (
  documentId: string,
  userId: string,
) => {
  // Verify user exists
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Find document
  const document = await DocumentModel.findOne({ id: documentId, isDeleted: { $ne: true } });
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Only uploader can restore
  if (document.uploadedBy.toString() !== user._id.toString() && document.uploaderId?.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to restore this document');
  }

  await DocumentModel.findByIdAndUpdate(document._id, {
    status: 'active',
    archivedAt: null,
  });

  return { message: 'Document restored successfully' };
};

/**
 * Initiate document upload - creates initial DB record with 'pending' status
 * This is the first step in the Smart Document Intake pipeline
 * @param payload - Document metadata for initial record
 * @returns The created document ID
 */
const initiateDocumentUpload = async (payload: TInitiateDocumentPayload) => {
  const { caseId, folderName, fileName, fileType, fileSize, uploaderId } =
    payload;

  // Verify user exists
  let user;
  if (mongoose.Types.ObjectId.isValid(uploaderId)) {
    user = await User.findById(uploaderId);
  }

  if (!user) {
    user = await User.findOne({ id: uploaderId });
  }

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Verify case exists and user owns it
  let caseData;
  if (mongoose.Types.ObjectId.isValid(caseId)) {
    caseData = await Case.findById(caseId);
  }

  if (!caseData) {
    caseData = await Case.findOne({ id: caseId });
  }

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  if (caseData.createdBy.toString() !== user._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to upload documents to this case',
    );
  }

  // Generate document ID
  const documentId = await generateDocumentId();

  const normalizedFileName = ensureFileNameHasExtension(fileName, fileType);

  // Create initial document record with pending status
  const document = await DocumentModel.create({
    id: documentId,
    caseId: caseData._id,
    folderName,
    fileName: normalizedFileName,
    fileType, // file extension
    mimeType: fileType, // full MIME type from payload
    fileSize,
    cloudinaryUrl: '', // Will be updated after upload
    cloudinaryPublicId: '', // Will be updated after upload
    cloudinaryFileId: '', // Will be updated after upload
    processingStatus: 'pending',
    analysisStatus: 'pending',
    uploaderId: user._id,
    uploadedBy: user._id,
    uploadedAt: new Date(),
  });

  return {
    documentId: document.id,
    _id: document._id,
    status: 'pending',
  };
};

/**
 * Update document processing status
 * @param documentId - The document ID
 * @param status - New processing status
 * @param error - Optional error message if status is 'failed'
 */
const updateProcessingStatus = async (
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
) => {
  const updateData: any = { processingStatus: status };
  if (error) {
    updateData.processingError = error;
  }

  const document = await DocumentModel.findOneAndUpdate(
    { id: documentId },
    updateData,
    { new: true },
  );

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  return document;
};

/**
 * Update document with Cloudinary details after successful upload
 */
const updateCloudinaryDetails = async (
  documentId: string,
  cloudinaryUrl: string,
  cloudinaryPublicId: string,
  cloudinaryFileId: string,
) => {
  const document = await DocumentModel.findOneAndUpdate(
    { id: documentId },
    {
      cloudinaryUrl,
      cloudinaryPublicId,
      cloudinaryFileId,
      processingStatus: 'processing', // Move to processing for AI analysis
    },
    { new: true },
  );

  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  return document;
};

/**
 * Get document content URL (or stream data if needed)
 * For now returns the Cloudinary URL.
 */
const getDocumentContent = async (documentId: string) => {
  const document = await DocumentModel.findOne({ id: documentId });
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }
  return document;
};

/**
 * Update document summary
 */
const updateDocumentSummary = async (documentId: string, summary: string) => {
  const document = await DocumentModel.findOne({ id: documentId });
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Ensure aiAnalysis object exists
  if (!document.aiAnalysis) {
    document.aiAnalysis = {
      summary: '',
      rawSummary: '',
      keyPoints: [],
      extractedEntities: [],
      legalRefs: [],
      documentCategory: null,
      confidenceScore: 0,
      analyzedAt: new Date(),
      modelVersion: 'manual-update'
    };
  }

  document.aiAnalysis.summary = summary;
  await document.save();

  return document;
};

/**
 * Phase 3.1: Auto-file document based on AI analysis
 */
const autoFileDocument = async (documentId: string): Promise<void> => {
  const doc = await DocumentModel.findOne({ id: documentId });
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Document not found');

  const analysis = doc.aiAnalysis;

  if (analysis?.documentCategory && analysis?.confidenceScore > 0.85) {
    const originalFolder = doc.folderName;
    const targetFolder = analysis.documentCategory; // e.g., "Evidence", "Pleadings"

    // Update folder and auto-filing status
    doc.folderName = targetFolder;
    doc.autoFiling = {
      status: 'moved',
      originalFolder,
      targetFolder,
      confidenceScore: analysis.confidenceScore,
      movedAt: new Date()
    };
    await doc.save();

    // Log activity
    await ActivityService.logActivity({
      type: 'document_moved',
      message: `Auto-filed document ${doc.fileName} from ${originalFolder} to ${targetFolder}`,
      userId: doc.uploadedBy,
      caseId: doc.caseId,
      documentId: doc._id as any
    });
  } else {
    doc.autoFiling = {
      status: 'pending',
      originalFolder: doc.folderName,
      targetFolder: '',
      confidenceScore: analysis?.confidenceScore || 0,
      movedAt: new Date(),
    };
    await doc.save();
  }
};

/**
 * Get all documents for a user across all cases
 * @param userId - The user's MongoDB ObjectId
 * @param query - Optional query parameters for filtering
 */
const getAllUserDocuments = async (
  userId: string,
  query: {
    folder?: string;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    category?: string;
    status?: 'active' | 'archived';
  } = {},
) => {
  // Build filter - get documents uploaded by this user, excluding soft-deleted
  const filter: any = {
    $or: [{ uploadedBy: userId }, { uploaderId: userId }],
    isDeleted: { $ne: true },
    status: query.status === 'archived' ? 'archived' : { $ne: 'archived' }, // Handle legacy documents as 'active'
  };

  // Apply optional filters
  if (query.folder) {
    filter.folderName = query.folder;
  }
  if (query.processingStatus) {
    filter.processingStatus = query.processingStatus;
  }
  if (query.category) {
    filter['aiAnalysis.documentCategory'] = query.category;
  }

  // Get documents with case and uploader info populated
  const documents = await DocumentModel.find(filter)
    .populate('caseId', 'id caseNumber title status')
    .populate('uploadedBy', 'id fullName email')
    .sort({ uploadedAt: -1 });

  // Process documents to sign URLs
  const processedDocuments = documents.map((doc) => {
    const docObj = doc.toObject();
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
        console.error(`Failed to sign URL for doc ${doc.id}:`, err);
      }
    }
    return docObj;
  });

  // Group documents by folder
  const groupedByFolder: TGroupedDocuments = {};
  processedDocuments.forEach((doc) => {
    if (!groupedByFolder[doc.folderName]) {
      groupedByFolder[doc.folderName] = [];
    }
    groupedByFolder[doc.folderName].push(doc);
  });

  // Group documents by case
  const groupedByCase: { [caseId: string]: { caseInfo: any; documents: any[] } } = {};
  processedDocuments.forEach((doc) => {
    const caseData = doc.caseId as any;
    if (caseData && caseData.id) {
      if (!groupedByCase[caseData.id]) {
        groupedByCase[caseData.id] = {
          caseInfo: {
            id: caseData.id,
            caseNumber: caseData.caseNumber,
            title: caseData.title,
            status: caseData.status,
          },
          documents: [],
        };
      }
      groupedByCase[caseData.id].documents.push(doc);
    }
  });

  // Get category statistics
  const categoryStats: { [category: string]: number } = {};
  processedDocuments.forEach((doc) => {
    const category = doc.aiAnalysis?.documentCategory || 'Uncategorized';
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  });

  return {
    documents: processedDocuments,
    groupedByFolder,
    groupedByCase: Object.values(groupedByCase),
    categoryStats,
    total: documents.length,
  };
};

export const DocumentServices = {
  uploadDocument,
  getDocumentsByCase,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  initiateDocumentUpload,
  updateProcessingStatus,
  updateCloudinaryDetails,
  getDocumentContent,
  updateDocumentSummary,
  autoFileDocument,
  getAllUserDocuments,
};

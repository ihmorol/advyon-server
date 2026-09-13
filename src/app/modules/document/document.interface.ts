/* eslint-disable no-unused-vars */

import { Document, Types } from 'mongoose';

// Processing status for AI pipeline
export type TDocumentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// Document analysis status (legacy)
export type TDocumentAnalysisStatus = 'pending' | 'analyzed';

// Document category type (auto-detected by AI)
export type TDocumentCategory =
  | 'Affidavit'
  | 'Evidence'
  | 'Contract'
  | 'Court Filing'
  | 'Correspondence'
  | 'Legal Brief'
  | 'Pleading'
  | 'Discovery'
  | 'Motion'
  | 'Order'
  | 'Judgment'
  | 'Settlement'
  | 'Other';

// AI Analysis results structure
export type TAiAnalysis = {
  summary: string; // refined summary
  rawSummary?: string; // markdown formatted raw summary
  keyPoints?: string[];
  extractedEntities: string[] | Array<{
    name: string;
    type: 'person' | 'organization' | 'date' | 'amount' | 'location' | 'other';
    count: number;
    mentions?: string[];
  }>;
  legalRefs?: Array<{
    citation: string;
    description: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  suggestions?: string[];
  documentCategory: TDocumentCategory | null;
  confidenceScore: number; // AI confidence (0-1)
  analyzedAt: Date; // When the analysis was performed
  modelVersion: string; // AI model version used for analysis
};

// Main document interface
export interface TDocument extends Document {
  id: string;
  caseId: Types.ObjectId;
  folderName: string;
  fileName: string;
  fileType: string; // file extension (e.g., 'pdf', 'docx')
  mimeType: string; // full MIME type (e.g., 'application/pdf')
  fileSize: number;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFileId: string; // For secure deletion

  // Processing status (new AI pipeline)
  processingStatus: TDocumentProcessingStatus;
  processingError?: string; // Error message if processing failed

  // AI Analysis results
  aiAnalysis?: TAiAnalysis;

  // Phase 3.1: Auto-Filing
  autoFiling?: {
    status: 'pending' | 'moved' | 'manual_override' | 'failed';
    originalFolder: string;
    targetFolder: string;
    confidenceScore: number;
    movedAt: Date;
  };

  // Legacy field (deprecated)
  analysisStatus: TDocumentAnalysisStatus;

  // References
  uploaderId: Types.ObjectId; // Reference to User who uploaded
  uploadedBy: Types.ObjectId; // Legacy field (same as uploaderId)

  // Timestamps
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt: Date | null;

  // Archive status
  status: 'active' | 'archived';
  archivedAt?: Date | null;
}

// Upload document payload
export interface TUploadDocumentPayload {
  caseId: string;
  folderName: string;
  file: Express.Multer.File;
}

// Initiate document upload payload (for service shell)
export interface TInitiateDocumentPayload {
  caseId: string;
  folderName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploaderId: string;
}

// Query parameters for filtering documents
export interface TDocumentQuery {
  folder?: string;
  documentId?: string;
  processingStatus?: TDocumentProcessingStatus;
  status?: 'active' | 'archived';
}

// Grouped documents by folder
export interface TGroupedDocuments {
  [folderName: string]: TDocument[];
}

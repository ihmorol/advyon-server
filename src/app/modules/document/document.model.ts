import { Schema, model } from 'mongoose';
import { TDocument, TAiAnalysis } from './document.interface';
import {
  DocumentProcessingStatus,
  DocumentAnalysisStatus,
  DocumentCategory,
} from './document.constant';

// Sub-schema for AI Analysis results
const aiAnalysisSchema = new Schema<TAiAnalysis>(
  {
    summary: { type: String, default: '' },
    rawSummary: { type: String, default: '' },
    keyPoints: { type: [String], default: [] },
    extractedEntities: {
      type: Schema.Types.Mixed, // Can be string[] or object[]
      default: [],
    },
    legalRefs: [
      {
        citation: { type: String },
        description: { type: String },
        relevance: { type: String, enum: ['high', 'medium', 'low'] },
      },
    ],
    documentCategory: {
      type: String,
      enum: [...DocumentCategory, null],
      default: null,
    },
    confidenceScore: { type: Number, default: 0, min: 0, max: 1 },
    analyzedAt: { type: Date },
    modelVersion: { type: String },
  },
  { _id: false },
);

const documentSchema = new Schema<TDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    folderName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/octet-stream',
    },
    fileSize: {
      type: Number,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      default: '',
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    cloudinaryFileId: {
      type: String,
      default: '',
    },

    // Processing status for AI pipeline
    processingStatus: {
      type: String,
      enum: DocumentProcessingStatus,
      default: 'pending',
    },
    processingError: {
      type: String,
    },

    // AI Analysis results
    aiAnalysis: {
      type: aiAnalysisSchema,
      default: null,
    },

    // Phase 3.1: Auto-Filing
    autoFiling: {
      status: {
        type: String,
        enum: ['pending', 'moved', 'manual_override', 'failed'],
        default: 'pending',
      },
      originalFolder: { type: String },
      targetFolder: { type: String },
      confidenceScore: { type: Number },
      movedAt: { type: Date },
    },

    // Legacy analysis status (deprecated)
    analysisStatus: {
      type: String,
      enum: DocumentAnalysisStatus,
      default: 'pending',
    },

    // References
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    // Archive status
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
documentSchema.index({ caseId: 1 });
documentSchema.index({ folderName: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ uploaderId: 1 });
documentSchema.index({ processingStatus: 1 });
documentSchema.index({ 'aiAnalysis.documentCategory': 1 });

// Compound index for efficient querying by case and processing status
documentSchema.index({ caseId: 1, processingStatus: 1 });

export const DocumentModel = model<TDocument>('Document', documentSchema);

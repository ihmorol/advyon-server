import { Schema, model } from 'mongoose';
import { TCase } from './case.interface';
import { CaseStatus, CaseUrgency } from './case.constant';

const caseFolderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const caseSchema = new Schema<TCase>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    caseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    caseType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: CaseStatus,
      default: 'active',
    },
    urgency: {
      type: String,
      enum: CaseUrgency,
      default: 'medium',
    },
    nextDeadline: {
      type: Date,
    },
    nextDeadlineDescription: {
      type: String,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    folders: {
      type: [caseFolderSchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    autoArchiveScheduled: {
      type: Boolean,
      default: false,
    },
    permanentDeleteAt: {
      type: Date,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    templateId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
caseSchema.index({ caseNumber: 1 });
caseSchema.index({ status: 1 });
caseSchema.index({ createdBy: 1 });
caseSchema.index({ isDeleted: 1 });
caseSchema.index({ archivedAt: 1 });
caseSchema.index({ status: 1, archivedAt: 1 });

// Query middleware to exclude deleted cases by default
caseSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

caseSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Case = model<TCase>('Case', caseSchema);

/* eslint-disable no-unused-vars */

import { Document, Types } from 'mongoose';
import { TDocument } from '../document/document.interface';

// Case status enum
export type TCaseStatus = 'active' | 'pending' | 'review' | 'closed' | 'archived';

// Case urgency enum
export type TCaseUrgency = 'low' | 'medium' | 'high';

// Case folder structure
export interface TCaseFolder {
  name: string;
  order: number;
}

// Main case interface
export interface TCase extends Document {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  status: TCaseStatus;
  urgency: TCaseUrgency;
  nextDeadline?: Date;
  nextDeadlineDescription?: string;
  progress: number;
  createdBy: Types.ObjectId;
  folders: TCaseFolder[];
  isDeleted: boolean;
  deletedAt?: Date;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  autoArchiveScheduled?: boolean;
  permanentDeleteAt?: Date;
  clientId?: Types.ObjectId;
  templateId?: string;
  createdAt: Date;

  updatedAt: Date;
  documents?: TDocument[];
}

// Create case payload
export interface TCreateCasePayload {
  title: string;
  caseNumber?: string;
  caseType?: string;
  urgency?: TCaseUrgency;
  nextDeadline?: Date;
  nextDeadlineDescription?: string;
  folders?: TCaseFolder[];
  templateId?: string;
}

// Update case payload
export interface TUpdateCasePayload {
  title?: string;
  caseType?: string;
  status?: TCaseStatus;
  urgency?: TCaseUrgency;
  nextDeadline?: Date;
  nextDeadlineDescription?: string;
  progress?: number;
  folders?: TCaseFolder[];
}

// Query parameters for filtering cases
export interface TCaseQuery {
  search?: string;
  status?: TCaseStatus;
  urgency?: TCaseUrgency;
  includeArchived?: boolean; // Phase 7: Include archived cases
  page?: number;
  limit?: number;
}

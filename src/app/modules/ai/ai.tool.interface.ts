import { Types } from 'mongoose';

export const AI_TOOL_KEYS = [
  'contract-analyzer',
  'document-generator',
  'case-law-researcher',
  'legal-writing-assistant',
  'deposition-summarizer',
  'brief-analyzer',
] as const;

export type TAIToolKey = (typeof AI_TOOL_KEYS)[number];

export type TAIToolRunStatus = 'success' | 'blocked' | 'failed';

export interface TAIToolHistory {
  _id?: Types.ObjectId;
  userId: string;
  toolKey: TAIToolKey;
  input: string;
  output: string;
  status: TAIToolRunStatus;
  latencyMs: number;
  model: string;
  policySignals: string[];
  metadata?: {
    caseId?: string;
    documentIds?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}


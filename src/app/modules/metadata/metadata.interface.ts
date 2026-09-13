import { Document, Model } from 'mongoose';

export const metadataTypeList = [
  'practiceAreas',
  'languages',
  'courtLocations',
  'caseTypes',
  'documentTemplates',
  'urgencyLevels',
  'hearingTypes',
  'legalSpecializations',
] as const;

export type TMetadataType = (typeof metadataTypeList)[number];

export interface IMetadataSeed {
  key?: string;
  label: string;
  description?: string;
  region?: string;
  locale?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IMetadataItem extends IMetadataSeed {
  type: TMetadataType;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMetadataDocument extends Omit<IMetadataItem, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type TMetadataModel = Model<IMetadataDocument>;

export interface IMetadataResponse {
  id: string;
  key: string;
  label: string;
  description?: string;
  region?: string;
  locale?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

export interface IMetadataQueryOptions {
  includeInactive?: boolean;
  skipCache?: boolean;
}

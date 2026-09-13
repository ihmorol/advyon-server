import { Schema, model } from 'mongoose';
import { IMetadataDocument, TMetadataModel } from './metadata.interface';

const metadataSchema = new Schema<IMetadataDocument>(
  {
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        'practiceAreas',
        'languages',
        'courtLocations',
        'caseTypes',
        'documentTemplates',
        'urgencyLevels',
        'hearingTypes',
        'legalSpecializations',
      ],
    },
    key: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String },
    region: { type: String },
    locale: { type: String, default: 'en-US' },
    color: { type: String },
    icon: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

metadataSchema.index({ type: 1, key: 1 }, { unique: true });

export const MetadataModel = model<IMetadataDocument, TMetadataModel>(
  'Metadata',
  metadataSchema,
);

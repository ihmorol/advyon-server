import { z } from 'zod';
import { metadataTypeList } from './metadata.interface';

const metadataTypeEnum = z.enum(metadataTypeList);

const metadataPayloadSchema = z.object({
  label: z.string().min(2).max(160),
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9\-]+$/, 'Key must be kebab-case')
    .optional(),
  description: z.string().max(400).optional(),
  region: z.string().max(60).optional(),
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Use BCP47 locale e.g. en-US')
    .optional(),
  color: z
    .string()
    .regex(
      /^(#([0-9a-fA-F]{3}){1,2}|(rgb|hsl)a?\(.+\)|var\(.+\))$/,
      'Provide valid CSS color',
    )
    .optional(),
  icon: z.string().max(64).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const partialPayloadSchema = metadataPayloadSchema
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const idParamSchema = z.object({
  id: z.string().min(1),
});

export const MetadataValidation = {
  createMetadata: z.object({
    params: z.object({
      type: metadataTypeEnum,
    }),
    body: metadataPayloadSchema,
  }),
  updateMetadata: z.object({
    params: idParamSchema,
    body: partialPayloadSchema,
  }),
  updateStatus: z.object({
    params: idParamSchema,
    body: z.object({
      isActive: z.boolean(),
    }),
  }),
};

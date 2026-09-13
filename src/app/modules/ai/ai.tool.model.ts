import { Schema, model } from 'mongoose';
import { AI_TOOL_KEYS, TAIToolHistory } from './ai.tool.interface';

const aiToolHistorySchema = new Schema<TAIToolHistory>(
  {
    userId: { type: String, required: true, index: true },
    toolKey: { type: String, enum: AI_TOOL_KEYS, required: true, index: true },
    input: { type: String, required: true, maxlength: 8000 },
    output: { type: String, required: true, maxlength: 50000 },
    status: {
      type: String,
      enum: ['success', 'blocked', 'failed'],
      required: true,
      default: 'success',
      index: true,
    },
    latencyMs: { type: Number, default: 0 },
    model: { type: String, default: 'groq' },
    policySignals: [{ type: String }],
    metadata: {
      caseId: { type: String },
      documentIds: [{ type: String }],
    },
  },
  { timestamps: true },
);

aiToolHistorySchema.index({ userId: 1, createdAt: -1 });

export const AIToolHistoryModel = model<TAIToolHistory>(
  'AIToolHistory',
  aiToolHistorySchema,
);


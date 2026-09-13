import { Schema, model } from 'mongoose';

type TAIContextMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
};

type TAIConversationContext = {
  userId: string;
  caseId?: string | null;
  messages: TAIContextMessage[];
  lastUserMessageAt?: Date;
  lastAssistantMessageAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type TAIPersonalizationProfile = {
  userId: string;
  preferredTone: 'professional' | 'concise' | 'detailed';
  recentKeywords: string[];
  recentQueries: string[];
  usageCount: number;
  blockedPromptCount: number;
  lastSeenAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

const contextMessageSchema = new Schema<TAIContextMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const conversationContextSchema = new Schema<TAIConversationContext>(
  {
    userId: { type: String, required: true, index: true },
    caseId: { type: String, default: null, index: true },
    messages: { type: [contextMessageSchema], default: [] },
    lastUserMessageAt: { type: Date },
    lastAssistantMessageAt: { type: Date },
  },
  { timestamps: true },
);

conversationContextSchema.index({ userId: 1, caseId: 1 }, { unique: true });

const personalizationProfileSchema = new Schema<TAIPersonalizationProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    preferredTone: {
      type: String,
      enum: ['professional', 'concise', 'detailed'],
      default: 'professional',
    },
    recentKeywords: { type: [String], default: [] },
    recentQueries: { type: [String], default: [] },
    usageCount: { type: Number, default: 0 },
    blockedPromptCount: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const AIConversationContextModel = model<TAIConversationContext>(
  'AIConversationContext',
  conversationContextSchema,
);

export const AIPersonalizationProfileModel = model<TAIPersonalizationProfile>(
  'AIPersonalizationProfile',
  personalizationProfileSchema,
);


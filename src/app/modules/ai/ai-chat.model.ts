import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IAIChat extends Document {
  userId: Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  context: any;
  createdAt: Date;
  updatedAt: Date;
}

const AIChatSchema = new Schema<IAIChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Index for retrieving user chats sorted by latest update
AIChatSchema.index({ userId: 1, updatedAt: -1 });

export const AIChatModel = model<IAIChat>('AIChat', AIChatSchema);

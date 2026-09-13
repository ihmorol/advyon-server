/**
 * @fileoverview Audit Log Mongoose model.
 * Records every admin mutation for accountability and compliance.
 */
import { Schema, model, Types } from 'mongoose';

export interface IAuditLog {
  action: string;
  actor: Types.ObjectId;
  actorEmail: string;
  actorRole: string;
  target?: string;
  targetType?: 'user' | 'case' | 'setting' | 'payment' | 'system';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    target: {
      type: String,
    },
    targetType: {
      type: String,
      enum: ['user', 'case', 'setting', 'payment', 'system'],
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Index for efficient querying by date range
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);

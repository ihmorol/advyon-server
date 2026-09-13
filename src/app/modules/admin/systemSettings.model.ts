/**
 * @fileoverview System Settings Mongoose model.
 * Singleton document storing application-wide configuration.
 * Admin/superAdmin can view and update these settings.
 */
import { Schema, model } from 'mongoose';

export interface ISystemSettings {
  siteName: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxUploadSizeMB: number;
  defaultUserRole: string;
  sessionTimeoutMinutes: number;
  features: {
    aiTools: boolean;
    communityHub: boolean;
    billing: boolean;
    notifications: boolean;
  };
  updatedBy?: string;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteName: {
      type: String,
      default: 'Advyon',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    maxUploadSizeMB: {
      type: Number,
      default: 10,
    },
    defaultUserRole: {
      type: String,
      enum: ['client', 'lawyer'],
      default: 'client',
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 60,
    },
    features: {
      aiTools: { type: Boolean, default: true },
      communityHub: { type: Boolean, default: true },
      billing: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const SystemSettings = model<ISystemSettings>(
  'SystemSettings',
  systemSettingsSchema,
);

/**
 * Get or create the singleton system settings document.
 */
export const getOrCreateSettings = async (): Promise<ISystemSettings> => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  return settings;
};

/* eslint-disable @typescript-eslint/no-this-alias */
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../config';
import { UserStatus } from './user.constant';
import { TUser, UserModel } from './user.interface';

const userSchema = new Schema<TUser, UserModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    clerkUserId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
      select: 0,
    },
    fullName: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    primaryRole: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    preferredLanguage: {
      type: String,
    },
    timezone: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    bio: {
      type: String,
    },
    needsPasswordChange: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['superAdmin', 'admin', 'client', 'lawyer', 'judge'],
    },
    status: {
      type: String,
      enum: UserStatus,
      default: 'in-progress',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    // Phase 1.1: User Preferences Schema
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      notifications: {
        emailDigest: { type: Boolean, default: true },
        pushAlerts: { type: Boolean, default: false },
        hearingReminders: { type: Boolean, default: true },
      },
      dashboardConfig: {
        showActivityFeed: { type: Boolean, default: true },
        showAIInsights: { type: Boolean, default: true },
        defaultView: {
          type: String,
          enum: ['classic', 'kanban'],
          default: 'classic',
        },
      },
    },
    // Gamification fields
    points: {
      type: Number,
      default: 0,
    },
    weeklyPoints: {
      type: Number,
      default: 0,
    },
    lastWeekReset: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this; // doc
  // hashing password and save into DB
  if (user.password) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

// set '' after saving password
userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

userSchema.statics.isUserExistsByCustomId = async function (id: string) {
  return await User.findOne({ id }).select('+password');
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,

) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<TUser, UserModel>('User', userSchema);

// Define indexes separately for better organization
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1 }, { unique: true }); // Ensure unique index
userSchema.index({ id: 1 }, { unique: true }); // Ensure unique index
userSchema.index({ clerkUserId: 1 }, { sparse: true, unique: true });

// Compound indexes for common queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1, isDeleted: 1 });

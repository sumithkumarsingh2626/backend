import { Schema, model, type Document } from 'mongoose';
import { UserRoles, type UserRoleValue } from '../constants';

export interface IUserNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  profileImage?: string;
  isVerified: boolean;
  otpCode?: string;
  otpExpiresAt?: Date;
  resetPasswordOtpCode?: string;
  resetPasswordOtpExpiresAt?: Date;
  notificationPreferences: IUserNotificationPreferences;
  activeRefreshTokenHash?: string;
  role: UserRoleValue;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferencesSchema = new Schema<IUserNotificationPreferences>(
  {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: undefined,
    },
    profileImage: {
      type: String,
      trim: true,
      default: undefined,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    otpCode: {
      type: String,
      default: undefined,
    },
    otpExpiresAt: {
      type: Date,
      default: undefined,
      index: true,
    },
    resetPasswordOtpCode: {
      type: String,
      default: undefined,
    },
    resetPasswordOtpExpiresAt: {
      type: Date,
      default: undefined,
      index: true,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({
        email: true,
        whatsapp: false,
        sms: false,
        push: false,
      }),
    },
    activeRefreshTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRoles),
      default: UserRoles.USER,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1, isVerified: 1 });

export const User = model<IUser>('User', userSchema);

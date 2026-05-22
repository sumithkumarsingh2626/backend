import { Schema, model, type Document, type Types } from 'mongoose';
import {
  NotificationChannels,
  NotificationStatuses,
  NotificationTypes,
  type NotificationChannel,
  type NotificationStatus,
  type NotificationType,
} from '../constants';

export interface INotification extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  notificationType: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  messageBody: string;
  metadata?: {
    oldPrice?: number;
    newPrice?: number;
    percentageDrop?: number;
    currency?: string;
  };
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    notificationType: {
      type: String,
      enum: Object.values(NotificationTypes),
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannels),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatuses),
      default: NotificationStatuses.PENDING,
      index: true,
    },
    sentAt: {
      type: Date,
      default: undefined,
    },
    messageBody: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    metadata: {
      type: {
        oldPrice: { type: Number, default: undefined },
        newPrice: { type: Number, default: undefined },
        percentageDrop: { type: Number, default: undefined },
        currency: { type: String, default: undefined },
      },
      _id: false,
      default: undefined,
    },
    errorMessage: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ productId: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);

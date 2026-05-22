import { Schema, model, type Document, type Types } from 'mongoose';
import {
  AvailabilityStates,
  TrackingStatuses,
  type AvailabilityState,
  type TrackingStatus,
} from '../constants';

export interface IProductNotificationSettings {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  anyPriceDrop: boolean;
  targetPriceAlert: boolean;
}

export interface IProduct extends Document {
  userId: Types.ObjectId;
  externalProductId?: string;
  title: string;
  productImage?: string;
  productUrl: string;
  currentPrice: number;
  targetPrice?: number | null;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  storeName: string;
  availability: AvailabilityState;
  variant?: string;
  trackingStatus: TrackingStatus;
  notificationEnabled: boolean;
  notificationSettings: IProductNotificationSettings;
  currency: string;
  lastScrapedAt?: Date;
  lastPriceChange?: number;
  totalPriceDrops: number;
  createdAt: Date;
  updatedAt: Date;
}

const productNotificationSettingsSchema = new Schema<IProductNotificationSettings>(
  {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    anyPriceDrop: { type: Boolean, default: true },
    targetPriceAlert: { type: Boolean, default: true },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    externalProductId: {
      type: String,
      trim: true,
      default: undefined,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 300,
    },
    productImage: {
      type: String,
      trim: true,
      default: undefined,
    },
    productUrl: {
      type: String,
      required: true,
      trim: true,
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    targetPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    lowestPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    highestPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    availability: {
      type: String,
      enum: Object.values(AvailabilityStates),
      default: AvailabilityStates.UNKNOWN,
    },
    variant: {
      type: String,
      trim: true,
      default: undefined,
    },
    trackingStatus: {
      type: String,
      enum: Object.values(TrackingStatuses),
      default: TrackingStatuses.ACTIVE,
      index: true,
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    notificationSettings: {
      type: productNotificationSettingsSchema,
      default: () => ({
        email: true,
        whatsapp: false,
        sms: false,
        push: false,
        anyPriceDrop: true,
        targetPriceAlert: true,
      }),
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'USD',
    },
    lastScrapedAt: {
      type: Date,
      default: undefined,
    },
    lastPriceChange: {
      type: Number,
      default: 0,
    },
    totalPriceDrops: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ userId: 1, productUrl: 1 }, { unique: true });
productSchema.index({ userId: 1, updatedAt: -1 });
productSchema.index({ userId: 1, trackingStatus: 1 });

export const Product = model<IProduct>('Product', productSchema);

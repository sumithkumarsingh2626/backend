import { Schema, model, type Document, type Types } from 'mongoose';

export interface IProductComparison extends Document {
  productId: Types.ObjectId;
  platform: string;
  productTitle: string;
  productUrl: string;
  currentPrice: number;
  originalPrice: number;
  image: string;
  inStock: boolean;
  lastChecked: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productComparisonSchema = new Schema<IProductComparison>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productTitle: {
      type: String,
      required: true,
      trim: true,
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
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      trim: true,
      required: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    lastChecked: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

productComparisonSchema.index({ productId: 1, platform: 1 }, { unique: true });

export const ProductComparison = model<IProductComparison>(
  'ProductComparison',
  productComparisonSchema,
);

import { Schema, model, type Document, type Types } from 'mongoose';

export interface IPriceHistory extends Document {
  productId: Types.ObjectId;
  price: number;
  currency: string;
  scrapedAt: Date;
  percentageChange: number;
  createdAt: Date;
  updatedAt: Date;
}

const priceHistorySchema = new Schema<IPriceHistory>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    scrapedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    percentageChange: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

priceHistorySchema.index({ productId: 1, scrapedAt: -1 });

export const PriceHistory = model<IPriceHistory>('PriceHistory', priceHistorySchema);

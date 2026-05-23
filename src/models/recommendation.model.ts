import { Schema, model, type Document, type Types } from 'mongoose';

export interface IRecommendation extends Document {
  sourceProductId: Types.ObjectId;
  recommendedProductId: Types.ObjectId;
  reason: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    sourceProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    recommendedProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  },
);

recommendationSchema.index({ sourceProductId: 1, score: -1 });
recommendationSchema.index({ sourceProductId: 1, recommendedProductId: 1 }, { unique: true });

export const Recommendation = model<IRecommendation>('Recommendation', recommendationSchema);

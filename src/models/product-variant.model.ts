import { Schema, model, type Document, type Types } from 'mongoose';

export interface IProductVariant extends Document {
  product: Types.ObjectId;
  attributes: Record<string, string>;
  price: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'unknown';
  variantUrl?: string;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    attributes: { type: Schema.Types.Mixed, required: true },
    price: { type: Number, required: true },
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock', 'unknown'], default: 'unknown' },
    variantUrl: { type: String },
  },
  { timestamps: true },
);

export const ProductVariant = model<IProductVariant>('ProductVariant', ProductVariantSchema);

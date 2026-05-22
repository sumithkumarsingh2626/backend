import { Schema, model, type Document } from 'mongoose';

export interface IRetailer extends Document {
  name: string;
  domain: string;
  logoUrl?: string;
  isActive: boolean;
}

const RetailerSchema = new Schema<IRetailer>(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true, unique: true },
    logoUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Retailer = model<IRetailer>('Retailer', RetailerSchema);

import { Schema, model, type Document, type Types } from 'mongoose';

export interface IWishlist extends Document {
  userId: Types.ObjectId;
  title: string;
  slug: string;
  isPublic: boolean;
  products: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);

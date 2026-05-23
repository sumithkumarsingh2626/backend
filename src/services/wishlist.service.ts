import { Wishlist, IWishlist } from '../models/wishlist.model';
import { Types } from 'mongoose';
import crypto from 'crypto';

export class WishlistService {
  private static generateSlug(title: string): string {
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomHash = crypto.randomBytes(3).toString('hex');
    return `${baseSlug}-${randomHash}`;
  }

  public static async createWishlist(userId: string, title: string, isPublic: boolean = false): Promise<IWishlist> {
    const slug = this.generateSlug(title);
    return Wishlist.create({
      userId: new Types.ObjectId(userId),
      title,
      slug,
      isPublic,
      products: [],
    });
  }

  public static async getWishlistBySlug(slug: string): Promise<IWishlist | null> {
    return Wishlist.findOne({ slug }).populate('products');
  }

  public static async getUserWishlists(userId: string): Promise<IWishlist[]> {
    return Wishlist.find({ userId: new Types.ObjectId(userId) }).populate('products');
  }

  public static async addProductToWishlist(wishlistId: string, productId: string, userId: string): Promise<IWishlist | null> {
    return Wishlist.findOneAndUpdate(
      { _id: new Types.ObjectId(wishlistId), userId: new Types.ObjectId(userId) },
      { $addToSet: { products: new Types.ObjectId(productId) } },
      { new: true }
    ).populate('products');
  }

  public static async removeProductFromWishlist(wishlistId: string, productId: string, userId: string): Promise<IWishlist | null> {
    return Wishlist.findOneAndUpdate(
      { _id: new Types.ObjectId(wishlistId), userId: new Types.ObjectId(userId) },
      { $pull: { products: new Types.ObjectId(productId) } },
      { new: true }
    ).populate('products');
  }

  public static async updateWishlist(wishlistId: string, userId: string, updateData: { title?: string; isPublic?: boolean }): Promise<IWishlist | null> {
    return Wishlist.findOneAndUpdate(
      { _id: new Types.ObjectId(wishlistId), userId: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true }
    ).populate('products');
  }

  public static async deleteWishlist(wishlistId: string, userId: string): Promise<boolean> {
    const result = await Wishlist.deleteOne({ _id: new Types.ObjectId(wishlistId), userId: new Types.ObjectId(userId) });
    return result.deletedCount > 0;
  }
}

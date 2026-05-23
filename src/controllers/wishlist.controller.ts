import { Request, Response } from 'express';
import { WishlistService } from '../services/wishlist.service';
import { sendSuccess } from '../utils/api-response.util';
import { asyncHandler } from '../utils/async-handler.util';
import { NotFoundError, ForbiddenError } from '../utils/AppError';

export const createWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { title, isPublic } = req.body;
  const userId = req.user!.id;
  const wishlist = await WishlistService.createWishlist(userId, title, isPublic);
  sendSuccess(res, { wishlist }, 'Wishlist created successfully');
});

export const getUserWishlists = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const wishlists = await WishlistService.getUserWishlists(userId);
  sendSuccess(res, { wishlists }, 'Wishlists retrieved successfully');
});

export const getPublicWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const wishlist = await WishlistService.getWishlistBySlug(slug);

  if (!wishlist) {
    throw new NotFoundError('Wishlist not found');
  }

  if (!wishlist.isPublic && req.user?.id !== wishlist.userId.toString()) {
    throw new ForbiddenError('This wishlist is private');
  }

  sendSuccess(res, { wishlist }, 'Wishlist retrieved successfully');
});

export const addProductToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productId } = req.body;
  const userId = req.user!.id;

  const wishlist = await WishlistService.addProductToWishlist(id, productId, userId);
  if (!wishlist) {
    throw new NotFoundError('Wishlist not found or unauthorized');
  }

  sendSuccess(res, { wishlist }, 'Product added to wishlist');
});

export const removeProductFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id, productId } = req.params;
  const userId = req.user!.id;

  const wishlist = await WishlistService.removeProductFromWishlist(id, productId, userId);
  if (!wishlist) {
    throw new NotFoundError('Wishlist not found or unauthorized');
  }

  sendSuccess(res, { wishlist }, 'Product removed from wishlist');
});

export const updateWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, isPublic } = req.body;
  const userId = req.user!.id;

  const wishlist = await WishlistService.updateWishlist(id, userId, { title, isPublic });
  if (!wishlist) {
    throw new NotFoundError('Wishlist not found or unauthorized');
  }

  sendSuccess(res, { wishlist }, 'Wishlist updated successfully');
});

export const deleteWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const success = await WishlistService.deleteWishlist(id, userId);
  if (!success) {
    throw new NotFoundError('Wishlist not found or unauthorized');
  }

  sendSuccess(res, null, 'Wishlist deleted successfully');
});

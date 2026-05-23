import { Router } from 'express';
import * as WishlistController from '../controllers/wishlist.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public route with optional auth for viewing public wishlists
router.get('/public/:slug', optionalAuthenticate, WishlistController.getPublicWishlist);

// Protected routes
router.use(authenticate);
router.post('/', WishlistController.createWishlist);
router.get('/', WishlistController.getUserWishlists);
router.patch('/:id', WishlistController.updateWishlist);
router.delete('/:id', WishlistController.deleteWishlist);

router.post('/:id/products', WishlistController.addProductToWishlist);
router.delete('/:id/products/:productId', WishlistController.removeProductFromWishlist);

export default router;

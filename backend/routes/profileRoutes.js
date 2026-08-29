import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  createAddress, deleteAddress, getProfile, listAddresses, listAvailableCoupons,
  updateAddress, updateProfile, listWishlist, saveWishlistItem, deleteWishlistItem,
} from '../controllers/profileController.js';

const router = Router();
router.use(requireAuth);
router.get('/', getProfile);
router.patch('/', updateProfile);
router.get('/addresses', listAddresses);
router.get('/coupons', listAvailableCoupons);
router.get('/wishlist', listWishlist);
router.post('/wishlist', saveWishlistItem);
router.delete('/wishlist/:productId', deleteWishlistItem);
router.post('/addresses', createAddress);
router.patch('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
export default router;

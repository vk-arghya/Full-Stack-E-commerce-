import { Router } from 'express';
import {
  adminMe, createCoupon, deleteCoupon, deleteCustomRequest, deleteReview,
  listCoupons, listCustomers, listCustomRequests, listReviews, reports,
  updateCoupon, updateCustomRequest, updateReview, testEmail, getStoreSettings, updateStoreSettings,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/me', adminMe);
router.get('/customers', listCustomers);
router.get('/reviews', listReviews);
router.patch('/reviews/:id', updateReview);
router.delete('/reviews/:id', deleteReview);
router.get('/custom-requests', listCustomRequests);
router.patch('/custom-requests/:id', updateCustomRequest);
router.delete('/custom-requests/:id', deleteCustomRequest);
router.get('/coupons', listCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);
router.get('/reports', reports);
router.get('/settings/store', getStoreSettings);
router.patch('/settings/store', updateStoreSettings);
router.post('/email/test', testEmail);
export default router;

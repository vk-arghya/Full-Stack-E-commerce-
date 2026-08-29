import { Router } from 'express';
import { createPaymentOrder, quotePayment, validateCoupon, verifyPayment } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);
router.post('/quote', quotePayment);
router.post('/create-order', createPaymentOrder);
router.post('/validate-coupon', validateCoupon);
router.post('/verify', verifyPayment);
export default router;

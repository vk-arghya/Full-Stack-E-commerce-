import { Router } from 'express';
import { finalizeOrder, getMyOrder, listAdminOrders, listMyOrders, updateOrderStatus } from '../controllers/orderController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);
router.post('/finalize', finalizeOrder);
router.get('/mine', listMyOrders);
router.get('/admin/all', requireAdmin, listAdminOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);
router.get('/:id', getMyOrder);
export default router;

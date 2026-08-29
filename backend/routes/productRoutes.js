import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct, uploadProductImage } from '../controllers/productController.js';

const router = Router();
router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', requireAuth, requireAdmin, createProduct);
router.post('/:id/image', requireAuth, requireAdmin, uploadProductImage);
router.patch('/:id', requireAuth, requireAdmin, updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);
export default router;

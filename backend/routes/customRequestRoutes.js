import { Router } from 'express';
import { createCustomRequest } from '../controllers/customRequestController.js';
const router = Router();
router.post('/', createCustomRequest);
export default router;

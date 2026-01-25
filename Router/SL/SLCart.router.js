import express from 'express';
import {
    getAllSLCartItems,
    getSLCartItemById,
    addToSLCart,
    updateSLCart,
    removeFromSLCart,
} from '../../Controller/SL/SLCart.controller.js';
import authMiddleware from '../../Middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.get('/sl-cart', authMiddleware, getAllSLCartItems);
router.get('/sl-cart/:cartId', authMiddleware, getSLCartItemById);
router.post('/sl-cart', authMiddleware, addToSLCart);
router.put('/sl-cart/:cartId', authMiddleware, updateSLCart);
router.delete('/sl-cart/:cartId', authMiddleware, removeFromSLCart);

export default router;
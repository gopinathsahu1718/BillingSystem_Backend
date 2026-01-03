import express from 'express';
import {
    getCartItems,
    addToCart,
    updateCart,
    removeFromCart,
} from '../Controller/Cart.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require authentication
router.get('/cart', authMiddleware, getCartItems);
router.post('/cart', authMiddleware, addToCart);
router.put('/cart/:cartId', authMiddleware, updateCart);
router.delete('/cart/:cartId', authMiddleware, removeFromCart);

export default router;
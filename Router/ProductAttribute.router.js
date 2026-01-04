import express from 'express';
import {
    getProductAttributes,
    addProductAttribute,
    updateProductAttribute,
    deleteProductAttribute,
} from '../Controller/ProductAttribute.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// All product attribute routes require authentication
router.get('/products/:productId/attributes', authMiddleware, getProductAttributes);
router.post('/products/:productId/attributes', authMiddleware, addProductAttribute);
router.put('/attributes/:attributeId', authMiddleware, updateProductAttribute);
router.delete('/attributes/:attributeId', authMiddleware, deleteProductAttribute);

export default router;
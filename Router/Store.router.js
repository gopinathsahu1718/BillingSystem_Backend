import express from 'express';
import {
    // Category controllers
    getAllCategories,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    // SubCategory controllers
    getAllSubCategories,
    getSubCategoryById,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    // Product controllers
    getAllProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
} from '../Controller/Store.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/store';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/store/';

        if (req.baseUrl.includes('/categories')) {
            folder += 'categories/';
        } else if (req.baseUrl.includes('/subcategories')) {
            folder += 'subcategories/';
        } else if (req.baseUrl.includes('/products')) {
            folder += 'products/';
        }

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
});

// ==================== CATEGORY ROUTES ====================
router.get('/categories', authMiddleware, getAllCategories);
router.get('/categories/:categoryId', authMiddleware, getCategoryById);
router.post('/categories', authMiddleware, upload.single('thumbnail'), addCategory);
router.put('/categories/:categoryId', authMiddleware, upload.single('thumbnail'), updateCategory);
router.delete('/categories/:categoryId', authMiddleware, deleteCategory);

// ==================== SUBCATEGORY ROUTES ====================
router.get('/subcategories', authMiddleware, getAllSubCategories);
router.get('/subcategories/:subCategoryId', authMiddleware, getSubCategoryById);
router.post('/subcategories', authMiddleware, upload.single('thumbnail'), addSubCategory);
router.put('/subcategories/:subCategoryId', authMiddleware, upload.single('thumbnail'), updateSubCategory);
router.delete('/subcategories/:subCategoryId', authMiddleware, deleteSubCategory);

// ==================== PRODUCT ROUTES ====================
router.get('/products', authMiddleware, getAllProducts);
router.get('/products/:productId', authMiddleware, getProductById);
router.post('/products', authMiddleware, upload.single('thumbnail'), addProduct);
router.put('/products/:productId', authMiddleware, upload.single('thumbnail'), updateProduct);
router.delete('/products/:productId', authMiddleware, deleteProduct);

export default router;
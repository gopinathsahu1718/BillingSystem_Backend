import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getLaxmiProfile,
    getSwasthikProfile,
    updateLaxmiProfile,
    updateSwasthikProfile,
} from '../Controller/StoreProfile.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/store-profiles/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});

// All routes require authentication
router.get('/profile/laxmi', authMiddleware, getLaxmiProfile);
router.get('/profile/swasthik', authMiddleware, getSwasthikProfile);
router.put('/profile/laxmi', authMiddleware, upload.single('logoImage'), updateLaxmiProfile);
router.put('/profile/swasthik', authMiddleware, upload.single('logoImage'), updateSwasthikProfile);

export default router;
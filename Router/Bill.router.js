import express from 'express';
import {
    createBill,
    getAllBills,
    getBillById,
    disableBill,
} from '../Controller/Bill.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// All billing routes require authentication
router.post('/bills', authMiddleware, createBill);
router.get('/bills', authMiddleware, getAllBills);
router.get('/bills/:billId', authMiddleware, getBillById);
router.put('/bills/:billId/disable', authMiddleware, disableBill);

export default router;
import express from 'express';
import {
    createBill,
    getAllBills,
    getBillById,
    disableBill,
    enableBill,
    getDashboardData,
} from '../Controller/Bill.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// Dashboard route
router.get('/dashboard', authMiddleware, getDashboardData);

// All billing routes require authentication
router.post('/bills', authMiddleware, createBill);
router.get('/bills', authMiddleware, getAllBills);
router.get('/bills/:billId', authMiddleware, getBillById);
router.put('/bills/:billId/disable', authMiddleware, disableBill);
router.put('/bills/:billId/enable', authMiddleware, enableBill);

export default router;
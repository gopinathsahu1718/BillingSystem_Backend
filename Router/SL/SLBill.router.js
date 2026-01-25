import express from 'express';
import {
    getAllSLBills,
    getSLBillById,
    createSLBill,
    disableSLBill,
    enableSLBill,
} from '../../Controller/SL/SLBill.controller.js';
import authMiddleware from '../../Middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.get('/sl-bills', authMiddleware, getAllSLBills);
router.get('/sl-bills/:billId', authMiddleware, getSLBillById);
router.post('/sl-bills', authMiddleware, createSLBill);
router.put('/sl-bills/:billId/disable', authMiddleware, disableSLBill);
router.put('/sl-bills/:billId/enable', authMiddleware, enableSLBill);

export default router;
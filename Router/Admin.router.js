import express from 'express';
import {
    home,
    Register,
    VerifyEmail,
    ResendOTP,
    Login,
    Logout,
    ForgotPassword,
    VerifyResetOtp,
    ResetPassword,
    getAdminProfile,
    updateProfile,
    changePassword,
    getVerificationToken
} from '../Controller/Admin.controller.js';
import authMiddleware from '../Middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/home', home);
router.post('/register', Register);
router.post('/get-verification-token', getVerificationToken);
router.post('/resend-otp', ResendOTP);
router.post('/verify-email', VerifyEmail);
router.post('/login', Login);
router.post('/forgot-password', ForgotPassword);
router.post('/verify-reset-password', VerifyResetOtp);
router.post('/reset-password', ResetPassword);

// Protected routes (requires authentication)
router.post('/logout', authMiddleware, Logout);
router.get('/profile', authMiddleware, getAdminProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;
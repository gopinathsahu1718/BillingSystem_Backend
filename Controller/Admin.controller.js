import {
    sendVerificationCode,
    welcomeEmail,
    forgotPasswordMail,
} from '../Middleware/Email.js';
import { Admin } from '../Model/Admin.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'email-validator';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_DELAY = 60;
const RESET_OTP_EXPIRY_MINUTES = 5;
const RESET_OTP_RESEND_DELAY = 60;
const MAX_OTP_ATTEMPTS = 5;
const OTP_FREEZE_SECONDS = 60 * 60;

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_TIME = 15 * 60 * 1000;

const passwordRegex = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[^A-Za-z0-9]).{8,}$/;

const validateAllowedFields = (allowedFields, requestBody) => {
    const receivedFields = Object.keys(requestBody);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields not allowed: ${invalidFields.join(', ')}. Only allowed fields are: ${allowedFields.join(', ')}`);
    }
    const missingFields = allowedFields.filter(field => !(field in requestBody) || requestBody[field] === undefined || requestBody[field] === null || requestBody[field] === '');
    if (missingFields.length > 0) {
        throw new Error(`Missing or empty required fields: ${missingFields.join(', ')}`);
    }
    return true;
};

function validatePassword(password) {
    return passwordRegex.test(password);
}

const generateOTP = async () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 8);
    return { otp, hashedOtp };
};

const home = (req, res) => {
    res.send('Admin Authentication API - MySQL Version');
};

const Register = async (req, res) => {
    try {
        const allowedFields = ['username', 'contact', 'email', 'password'];
        validateAllowedFields(allowedFields, req.body);

        const uniqueKeys = new Set(Object.keys(req.body));
        if (uniqueKeys.size !== Object.keys(req.body).length) {
            return res.status(400).json({ success: false, message: 'Duplicate fields detected in the request body.' });
        }

        // Check if any admin already exists (only one admin allowed)
        const adminCount = await Admin.count();
        if (adminCount > 0) {
            return res.status(403).json({
                success: false,
                message: 'Admin already exists. Only one admin account is allowed.'
            });
        }

        let { username, contact, email, password } = req.body;
        email = email?.toLowerCase();

        if (!username || !contact || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        let errorMsg = '';
        if (!validator.validate(email)) {
            errorMsg += 'Invalid email. ';
        }
        if (!/^[6-9]\d{9}$/.test(contact)) {
            errorMsg += 'Invalid contact number.';
        }
        if (errorMsg) {
            return res.status(400).json({ success: false, message: errorMsg.trim() });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long, include an uppercase letter, lowercase letter, number, and special character.',
            });
        }

        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            return res.status(409).json({ success: false, message: 'Admin already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { otp, hashedOtp } = await generateOTP();
        const sessionId = uuidv4();

        const newAdmin = await Admin.create({
            username: username.trim(),
            contact: contact.trim(),
            email,
            password: hashedPassword,
            role: 'admin',
            verificationCode: hashedOtp,
            otpExpires: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
            currentSessionId: sessionId,
            lastOtpSent: new Date(),
            otpAttempts: 0,
        });

        await sendVerificationCode(email, otp);

        const verificationToken = jwt.sign(
            {
                adminId: newAdmin.id,
                email: newAdmin.email,
                sessionId,
                type: 'verification'
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.status(201).json({
            success: true,
            message: 'Admin registered successfully. Please verify your email with the OTP sent.',
            verificationToken,
            admin: {
                id: newAdmin.id,
                username: newAdmin.username,
                email: newAdmin.email,
                role: newAdmin.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message.includes('Invalid fields') || error.message.includes('Missing')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const getVerificationToken = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.isVerified) {
            return res.status(400).json({ success: false, message: 'Admin is already verified' });
        }

        const sessionId = admin.currentSessionId || uuidv4();
        const verificationToken = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                sessionId,
                type: 'verification'
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.status(200).json({
            success: true,
            verificationToken,
            message: 'Verification token generated successfully',
        });
    } catch (error) {
        console.error('Get verification token error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const ResendOTP = async (req, res) => {
    try {
        const { verificationToken } = req.body;
        if (!verificationToken) {
            return res.status(400).json({ success: false, message: 'Verification token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid or expired verification token' });
        }

        const admin = await Admin.findByPk(decoded.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.currentSessionId !== decoded.sessionId) {
            return res.status(401).json({ success: false, message: 'Session expired. Please restart registration.' });
        }

        if (admin.isVerified) {
            return res.status(400).json({ success: false, message: 'Admin is already verified' });
        }

        if (admin.otpFreezeUntil && new Date() < admin.otpFreezeUntil) {
            const remainingTime = Math.ceil((admin.otpFreezeUntil - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Too many OTP attempts. Please try again after ${Math.ceil(remainingTime / 60)} minutes`,
            });
        }

        if (admin.lastOtpSent) {
            const timeSinceLastOtp = (new Date() - admin.lastOtpSent) / 1000;
            if (timeSinceLastOtp < OTP_RESEND_DELAY) {
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${Math.ceil(OTP_RESEND_DELAY - timeSinceLastOtp)} seconds before requesting a new OTP`,
                });
            }
        }

        const { otp, hashedOtp } = await generateOTP();
        admin.verificationCode = hashedOtp;
        admin.otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        admin.lastOtpSent = new Date();
        admin.otpAttempts = 0;
        await admin.save();

        await sendVerificationCode(admin.email, otp);

        return res.status(200).json({
            success: true,
            message: 'New OTP sent successfully',
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const VerifyEmail = async (req, res) => {
    try {
        const { verificationToken, otp } = req.body;
        if (!verificationToken || !otp) {
            return res.status(400).json({ success: false, message: 'Verification token and OTP are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid or expired verification token' });
        }

        const admin = await Admin.findByPk(decoded.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.currentSessionId !== decoded.sessionId) {
            return res.status(401).json({ success: false, message: 'Session expired. Please restart registration.' });
        }

        if (admin.isVerified) {
            return res.status(400).json({ success: false, message: 'Admin is already verified' });
        }

        if (admin.otpFreezeUntil && new Date() < admin.otpFreezeUntil) {
            const remainingTime = Math.ceil((admin.otpFreezeUntil - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Account temporarily locked. Try again after ${Math.ceil(remainingTime / 60)} minutes`,
            });
        }

        if (!admin.otpExpires || new Date() > admin.otpExpires) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' });
        }

        const isOtpValid = await bcrypt.compare(otp, admin.verificationCode);
        if (!isOtpValid) {
            admin.otpAttempts += 1;

            if (admin.otpAttempts >= MAX_OTP_ATTEMPTS) {
                admin.otpFreezeUntil = new Date(Date.now() + OTP_FREEZE_SECONDS * 1000);
                await admin.save();
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed attempts. Account locked for 1 hour',
                });
            }

            await admin.save();
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - admin.otpAttempts} attempts remaining`,
            });
        }

        admin.isVerified = true;
        admin.verificationCode = null;
        admin.otpExpires = null;
        admin.otpAttempts = 0;
        admin.currentSessionId = null;
        admin.otpFreezeUntil = null;
        await admin.save();

        await welcomeEmail(admin.email, admin.username);

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Verify email error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (admin.loginLockUntil && new Date() < admin.loginLockUntil) {
            const remainingTime = Math.ceil((admin.loginLockUntil - new Date()) / 1000 / 60);
            return res.status(429).json({
                success: false,
                message: `Account temporarily locked. Try again after ${remainingTime} minutes`,
            });
        }

        if (!admin.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email address first' });
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            admin.loginAttempts += 1;

            if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                admin.loginLockUntil = new Date(Date.now() + LOGIN_LOCK_TIME);
            }
            await admin.save();

            if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Account locked for 15 minutes',
                });
            }

            return res.status(401).json({
                success: false,
                message: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - admin.loginAttempts} attempts remaining`,
            });
        }

        admin.loginAttempts = 0;
        admin.loginLockUntil = null;
        admin.lastLoginAt = new Date();
        admin.lastLoginIp = req.ip || req.connection.remoteAddress;
        await admin.save();

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const admin = await Admin.findOne({ where: { email: email.toLowerCase() } });
        if (!admin) {
            return res.status(200).json({
                success: true,
                message: 'If the email exists, a password reset OTP has been sent',
            });
        }

        if (!admin.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email first' });
        }

        if (admin.resetOtpFreezeUntil && new Date() < admin.resetOtpFreezeUntil) {
            const remainingTime = Math.ceil((admin.resetOtpFreezeUntil - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Too many reset attempts. Please try again after ${Math.ceil(remainingTime / 60)} minutes`,
            });
        }

        if (admin.lastResetOtpSent) {
            const timeSinceLastOtp = (new Date() - admin.lastResetOtpSent) / 1000;
            if (timeSinceLastOtp < RESET_OTP_RESEND_DELAY) {
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${Math.ceil(RESET_OTP_RESEND_DELAY - timeSinceLastOtp)} seconds before requesting a new OTP`,
                });
            }
        }

        const { otp, hashedOtp } = await generateOTP();
        const resetSessionId = uuidv4();

        admin.resetPasswordCode = hashedOtp;
        admin.resetPasswordExpires = new Date(Date.now() + RESET_OTP_EXPIRY_MINUTES * 60 * 1000);
        admin.resetSessionId = resetSessionId;
        admin.lastResetOtpSent = new Date();
        admin.resetOtpAttempts = 0;
        await admin.save();

        await forgotPasswordMail(admin.email, otp);

        const resetInitToken = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                sessionId: resetSessionId,
                type: 'reset_init'
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.status(200).json({
            success: true,
            message: 'Password reset OTP sent successfully',
            resetInitToken,
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const VerifyResetOtp = async (req, res) => {
    try {
        const { resetInitToken, otp } = req.body;
        if (!resetInitToken || !otp) {
            return res.status(400).json({ success: false, message: 'Reset token and OTP are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(resetInitToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const admin = await Admin.findByPk(decoded.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.resetSessionId !== decoded.sessionId) {
            return res.status(401).json({ success: false, message: 'Session expired. Please restart password reset.' });
        }

        if (admin.resetOtpFreezeUntil && new Date() < admin.resetOtpFreezeUntil) {
            const remainingTime = Math.ceil((admin.resetOtpFreezeUntil - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Too many failed attempts. Try again after ${Math.ceil(remainingTime / 60)} minutes`,
            });
        }

        if (!admin.resetPasswordExpires || new Date() > admin.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' });
        }

        const isOtpValid = await bcrypt.compare(otp, admin.resetPasswordCode);
        if (!isOtpValid) {
            admin.resetOtpAttempts += 1;

            if (admin.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
                admin.resetOtpFreezeUntil = new Date(Date.now() + OTP_FREEZE_SECONDS * 1000);
                await admin.save();
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed attempts. Account locked for 1 hour',
                });
            }

            await admin.save();
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - admin.resetOtpAttempts} attempts remaining`,
            });
        }

        const passwordResetSessionId = uuidv4();
        admin.passwordResetSessionId = passwordResetSessionId;
        admin.passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
        await admin.save();

        const passwordResetToken = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                sessionId: passwordResetSessionId,
                type: 'password_reset'
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully. You can now reset your password',
            passwordResetToken,
        });
    } catch (error) {
        console.error('Verify reset OTP error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const ResetPassword = async (req, res) => {
    try {
        const { passwordResetToken, newPassword } = req.body;
        if (!passwordResetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(passwordResetToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const admin = await Admin.findByPk(decoded.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.passwordResetSessionId !== decoded.sessionId) {
            return res.status(401).json({ success: false, message: 'Session expired. Please restart password reset.' });
        }

        if (!admin.passwordResetTokenExpires || new Date() > admin.passwordResetTokenExpires) {
            return res.status(400).json({ success: false, message: 'Reset token has expired. Please start again' });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long, include an uppercase letter, lowercase letter, number, and special character.',
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedNewPassword;
        admin.resetPasswordCode = null;
        admin.resetPasswordExpires = null;
        admin.resetSessionId = null;
        admin.passwordResetSessionId = null;
        admin.passwordResetTokenExpires = null;
        admin.resetOtpAttempts = 0;
        admin.resetOtpFreezeUntil = null;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please login with your new password',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const Logout = async (req, res) => {
    try {
        // Increment tokenVersion to invalidate all existing tokens
        const admin = await Admin.findByPk(req.admin.id);
        if (admin) {
            admin.tokenVersion += 1;
            await admin.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Logout successful. All sessions have been terminated.',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findByPk(req.admin.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        return res.status(200).json({ success: true, data: admin });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const allowedFields = ['username', 'contact'];
        const receivedFields = Object.keys(req.body);

        if (receivedFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one field is required for update',
            });
        }

        const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields are: ${allowedFields.join(', ')}`,
            });
        }

        const updateData = {};
        if (req.body.username !== undefined && req.body.username !== null) {
            const trimmedUsername = String(req.body.username).trim();
            if (trimmedUsername) updateData.username = trimmedUsername;
        }

        if (req.body.contact !== undefined && req.body.contact !== null) {
            const trimmedContact = String(req.body.contact).trim();
            if (trimmedContact) updateData.contact = trimmedContact;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update',
            });
        }

        const admin = await Admin.findByPk(req.admin.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        await admin.update(updateData);

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: admin,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const allowedFields = ['currentPassword', 'newPassword'];
        validateAllowedFields(allowedFields, req.body);

        const { currentPassword, newPassword } = req.body;

        const admin = await Admin.findByPk(req.admin.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        const isPasswordValid = await admin.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long, include an uppercase letter, lowercase letter, number, and special character.',
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedNewPassword;
        await admin.save();

        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        if (error.message.includes('Invalid fields') || error.message.includes('Missing')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

export {
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
    getVerificationToken,
};
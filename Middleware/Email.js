import { transporter } from './EmailConfig.js';
import { Verification_Email_Template, Welcome_Email_Template } from '../Template/Otp.Template.js';

export const sendVerificationCode = async (email, verificationcode) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Admin Panel" <noreply@admin.com>',
            to: email,
            subject: 'Verify Your Admin Email',
            text: 'Verify your Admin Email',
            html: Verification_Email_Template.replace('{verificationCode}', verificationcode),
        });
        console.log('✉️ Verification email sent successfully:', response.messageId);
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
};

export const welcomeEmail = async (email, name) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Admin Panel" <noreply@admin.com>',
            to: email,
            subject: 'Welcome To Admin Panel',
            text: 'Welcome to Admin Panel',
            html: Welcome_Email_Template.replace('{name}', name),
        });
        console.log('✉️ Welcome email sent successfully:', response.messageId);
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
};

export const forgotPasswordMail = async (email, verificationcode) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Admin Panel" <noreply@admin.com>',
            to: email,
            subject: 'Admin Password Reset OTP',
            text: 'Admin Password Reset OTP',
            html: Verification_Email_Template.replace('{verificationCode}', verificationcode),
        });
        console.log('✉️ Password reset email sent successfully:', response.messageId);
    } catch (error) {
        console.error('❌ Email error:', error);
        throw error;
    }
};
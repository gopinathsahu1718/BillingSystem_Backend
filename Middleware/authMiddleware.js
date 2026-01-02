import jwt from 'jsonwebtoken';
import { Admin } from '../Model/Admin.model.js';

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findByPk(decoded.id);

        if (!admin) {
            return res.status(401).json({ success: false, message: 'Admin account not found. Please login again' });
        }

        if (!admin.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email address first' });
        }

        // Check if token version matches (logout invalidation)
        if (decoded.tokenVersion !== admin.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: 'Token has been invalidated. Please login again'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again' });
        }
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

export default authMiddleware;
import { StoreProfile } from '../Model/StoreProfile.model.js';
import fs from 'fs';
import path from 'path';

// Get Laxmi Bookstore profile
const getLaxmiProfile = async (req, res) => {
    try {
        const profile = await StoreProfile.findOne({
            where: { storeType: 'laxmi_bookstore' },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Laxmi Bookstore profile not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error('Get Laxmi profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get Swasthik Enterprises profile
const getSwasthikProfile = async (req, res) => {
    try {
        const profile = await StoreProfile.findOne({
            where: { storeType: 'swasthik_enterprises' },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Swasthik Enterprises profile not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error('Get Swasthik profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update Laxmi Bookstore profile
const updateLaxmiProfile = async (req, res) => {
    try {
        const {
            storeName,
            ownerName,
            email,
            phone,
            alternatePhone,
            address,
            city,
            state,
            pincode,
            gstNumber,
            panNumber,
            bankName,
            accountNumber,
            ifscCode,
            branchName,
        } = req.body;

        const profile = await StoreProfile.findOne({
            where: { storeType: 'laxmi_bookstore' },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Laxmi Bookstore profile not found',
            });
        }

        // Handle logo image upload
        if (req.file) {
            // Delete old logo if exists
            if (profile.logoImage) {
                const oldLogoPath = path.join(process.cwd(), profile.logoImage);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
            profile.logoImage = req.file.path;
        }

        // Update fields
        if (storeName !== undefined) profile.storeName = storeName;
        if (ownerName !== undefined) profile.ownerName = ownerName;
        if (email !== undefined) profile.email = email;
        if (phone !== undefined) profile.phone = phone;
        if (alternatePhone !== undefined) profile.alternatePhone = alternatePhone;
        if (address !== undefined) profile.address = address;
        if (city !== undefined) profile.city = city;
        if (state !== undefined) profile.state = state;
        if (pincode !== undefined) profile.pincode = pincode;
        if (gstNumber !== undefined) profile.gstNumber = gstNumber;
        if (panNumber !== undefined) profile.panNumber = panNumber;
        if (bankName !== undefined) profile.bankName = bankName;
        if (accountNumber !== undefined) profile.accountNumber = accountNumber;
        if (ifscCode !== undefined) profile.ifscCode = ifscCode;
        if (branchName !== undefined) profile.branchName = branchName;

        await profile.save();

        return res.status(200).json({
            success: true,
            message: 'Laxmi Bookstore profile updated successfully',
            data: profile,
        });
    } catch (error) {
        console.error('Update Laxmi profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update Swasthik Enterprises profile
const updateSwasthikProfile = async (req, res) => {
    try {
        const {
            storeName,
            ownerName,
            email,
            phone,
            alternatePhone,
            address,
            city,
            state,
            pincode,
            gstNumber,
            panNumber,
            bankName,
            accountNumber,
            ifscCode,
            branchName,
        } = req.body;

        const profile = await StoreProfile.findOne({
            where: { storeType: 'swasthik_enterprises' },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Swasthik Enterprises profile not found',
            });
        }

        // Handle logo image upload
        if (req.file) {
            // Delete old logo if exists
            if (profile.logoImage) {
                const oldLogoPath = path.join(process.cwd(), profile.logoImage);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
            profile.logoImage = req.file.path;
        }

        // Update fields
        if (storeName !== undefined) profile.storeName = storeName;
        if (ownerName !== undefined) profile.ownerName = ownerName;
        if (email !== undefined) profile.email = email;
        if (phone !== undefined) profile.phone = phone;
        if (alternatePhone !== undefined) profile.alternatePhone = alternatePhone;
        if (address !== undefined) profile.address = address;
        if (city !== undefined) profile.city = city;
        if (state !== undefined) profile.state = state;
        if (pincode !== undefined) profile.pincode = pincode;
        if (gstNumber !== undefined) profile.gstNumber = gstNumber;
        if (panNumber !== undefined) profile.panNumber = panNumber;
        if (bankName !== undefined) profile.bankName = bankName;
        if (accountNumber !== undefined) profile.accountNumber = accountNumber;
        if (ifscCode !== undefined) profile.ifscCode = ifscCode;
        if (branchName !== undefined) profile.branchName = branchName;

        await profile.save();

        return res.status(200).json({
            success: true,
            message: 'Swasthik Enterprises profile updated successfully',
            data: profile,
        });
    } catch (error) {
        console.error('Update Swasthik profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    getLaxmiProfile,
    getSwasthikProfile,
    updateLaxmiProfile,
    updateSwasthikProfile,
};
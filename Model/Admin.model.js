import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import bcrypt from 'bcrypt';
import moment from 'moment-timezone';

const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            len: {
                args: [3, 50],
                msg: 'Username must be between 3 and 50 characters',
            },
            is: {
                args: /^[A-Za-z]+(?:\.?[A-Za-z]+)*(?: [A-Za-z]+(?:\.?[A-Za-z]+)*)*$/,
                msg: 'Username can only contain letters, optional dots, and single spaces between words',
            },
        },
    },
    contact: {
        type: DataTypes.STRING(15),
        allowNull: true,
        validate: {
            is: {
                args: /^[6-9]\d{9}$/,
                msg: 'Invalid contact number format',
            },
        },
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: 'Invalid email format',
            },
        },
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        },
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Password cannot be empty',
            },
            len: {
                args: [8, 255],
                msg: 'Password must be at least 8 characters long',
            },
        },
    },
    role: {
        type: DataTypes.ENUM('admin'),
        allowNull: false,
        defaultValue: 'admin',
    },
    profilePhoto: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    verificationCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    otpExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    otpAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    lastOtpSent: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    otpFreezeUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resetPasswordCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resetOtpAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    lastResetOtpSent: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resetOtpFreezeUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    currentSessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    resetSessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    passwordResetSessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    passwordResetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    loginLockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastLoginIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    tokenVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
}, {
    tableName: 'admins',
    timestamps: true,
    hooks: {
        // Don't auto-hash password in hooks - we'll do it manually in controller
        // This gives us more control over when to hash
    },
});

// Instance method to compare password
Admin.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to format dates to IST
Admin.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    // Format date fields
    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);
    if (values.otpExpires) values.otpExpires = formatIST(values.otpExpires);
    if (values.lastOtpSent) values.lastOtpSent = formatIST(values.lastOtpSent);
    if (values.otpFreezeUntil) values.otpFreezeUntil = formatIST(values.otpFreezeUntil);
    if (values.resetPasswordExpires) values.resetPasswordExpires = formatIST(values.resetPasswordExpires);
    if (values.lastResetOtpSent) values.lastResetOtpSent = formatIST(values.lastResetOtpSent);
    if (values.resetOtpFreezeUntil) values.resetOtpFreezeUntil = formatIST(values.resetOtpFreezeUntil);
    if (values.passwordResetTokenExpires) values.passwordResetTokenExpires = formatIST(values.passwordResetTokenExpires);
    if (values.loginLockUntil) values.loginLockUntil = formatIST(values.loginLockUntil);
    if (values.lastLoginAt) values.lastLoginAt = formatIST(values.lastLoginAt);

    // Remove sensitive fields
    delete values.password;
    delete values.verificationCode;
    delete values.resetPasswordCode;
    delete values.resetPasswordExpires;
    delete values.otpExpires;
    delete values.otpAttempts;
    delete values.lastOtpSent;
    delete values.otpFreezeUntil;
    delete values.resetOtpAttempts;
    delete values.lastResetOtpSent;
    delete values.resetOtpFreezeUntil;
    delete values.currentSessionId;
    delete values.resetSessionId;
    delete values.passwordResetSessionId;
    delete values.passwordResetTokenExpires;
    delete values.loginAttempts;
    delete values.loginLockUntil;

    // Add profile photo URL if exists
    if (values.profilePhoto) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:6000';
        values.profilePhotoUrl = `${baseUrl}/${values.profilePhoto.replace(/\\/g, '/')}`;
    }

    return values;
};

export { Admin };
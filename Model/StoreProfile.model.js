import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const StoreProfile = sequelize.define('StoreProfile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    storeType: {
        type: DataTypes.ENUM('laxmi_bookstore', 'swasthik_enterprises'),
        allowNull: false,
        unique: true,
    },
    storeName: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    ownerName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    alternatePhone: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    pincode: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    gstNumber: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    panNumber: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    bankName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    accountNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    ifscCode: {
        type: DataTypes.STRING(11),
        allowNull: true,
    },
    branchName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    logoImage: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: 'store_profiles',
    timestamps: true,
    indexes: [
        {
            fields: ['storeType'],
        },
    ],
});

// Instance method to format dates to IST
StoreProfile.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Add logo URL if exists
    if (values.logoImage) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:6000';
        values.logoImageUrl = `${baseUrl}/${values.logoImage.replace(/\\/g, '/')}`;
    }

    return values;
};

export { StoreProfile };
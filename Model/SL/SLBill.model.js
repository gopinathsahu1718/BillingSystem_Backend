import { DataTypes } from 'sequelize';
import { sequelize } from '../../Database/Database.js'
import moment from 'moment-timezone';

// SL Bills Model
const SLBill = sequelize.define('SLBill', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    billNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    category: {
        type: DataTypes.ENUM('sl_swasthik', 'sl_laxmi'),
        allowNull: false,
    },
    billToName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    billToAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    billToMobile: {
        type: DataTypes.STRING(15),
        allowNull: false,
    },
    shipToName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    shipToAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    shipToMobile: {
        type: DataTypes.STRING(15),
        allowNull: false,
    },
    paymentMode: {
        type: DataTypes.ENUM('cash', 'card', 'upi', 'netbanking', 'other'),
        allowNull: false,
        defaultValue: 'cash',
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    cgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    sgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    totalGST: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    grandTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    isActive: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admins',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
}, {
    tableName: 'sl_bills',
    timestamps: true,
    indexes: [
        {
            fields: ['billNumber'],
            unique: true,
        },
        {
            fields: ['category'],
        },
        {
            fields: ['isActive'],
        },
        {
            fields: ['createdBy'],
        },
    ],
});

// Instance method to format dates to IST
SLBill.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Format decimal values
    if (values.subtotal) values.subtotal = parseFloat(values.subtotal).toFixed(2);
    if (values.cgst) values.cgst = parseFloat(values.cgst).toFixed(2);
    if (values.sgst) values.sgst = parseFloat(values.sgst).toFixed(2);
    if (values.totalGST) values.totalGST = parseFloat(values.totalGST).toFixed(2);
    if (values.grandTotal) values.grandTotal = parseFloat(values.grandTotal).toFixed(2);

    return values;
};

// SL Bill Items Model
const SLBillItem = sequelize.define('SLBillItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    billId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sl_bills',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    productName: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    productPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    cgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    sgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    totalGST: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: 'sl_bill_items',
    timestamps: true,
    indexes: [
        {
            fields: ['billId'],
        },
    ],
});

// Instance method to format dates to IST
SLBillItem.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Format decimal values
    if (values.productPrice) values.productPrice = parseFloat(values.productPrice).toFixed(2);
    if (values.gstRate) values.gstRate = parseFloat(values.gstRate).toFixed(2);
    if (values.subtotal) values.subtotal = parseFloat(values.subtotal).toFixed(2);
    if (values.cgst) values.cgst = parseFloat(values.cgst).toFixed(2);
    if (values.sgst) values.sgst = parseFloat(values.sgst).toFixed(2);
    if (values.totalGST) values.totalGST = parseFloat(values.totalGST).toFixed(2);
    if (values.total) values.total = parseFloat(values.total).toFixed(2);

    return values;
};

export { SLBill, SLBillItem };
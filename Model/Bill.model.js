import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const Bill = sequelize.define('Bill', {
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
    // Customer Details
    customerName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Customer name cannot be empty',
            },
        },
    },
    customerAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    customerContact: {
        type: DataTypes.STRING(15),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Customer contact cannot be empty',
            },
            is: {
                args: /^[6-9]\d{9}$/,
                msg: 'Contact number must be 10 digits starting with 6-9',
            },
        },
    },
    // Payment Details
    paymentMode: {
        type: DataTypes.ENUM('cash', 'card', 'upi', 'netbanking', 'other'),
        allowNull: false,
        defaultValue: 'cash',
    },
    // Bill Amounts
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
    // Bill Status
    isActive: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1,
        allowNull: false,
        validate: {
            isIn: {
                args: [[0, 1]],
                msg: 'isActive must be either 0 or 1',
            },
        },
    },
    // Who created the bill
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
    tableName: 'bills',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['billNumber'],
        },
        {
            fields: ['createdBy'],
        },
        {
            fields: ['customerContact'],
        },
        {
            fields: ['paymentMode'],
        },
        {
            fields: ['isActive'],
        },
        {
            fields: ['createdAt'],
        },
    ],
});

// Instance method to format dates to IST
Bill.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    return values;
};

export { Bill };
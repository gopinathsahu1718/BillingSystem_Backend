import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const BillItem = sequelize.define('BillItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    billId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'bills',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    attributeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'product_attributes',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    // Product snapshot at time of billing
    productName: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    productSKU: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    // Attribute snapshot (if applicable)
    attributeName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    attributeValue: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: 'Quantity must be at least 1',
            },
        },
    },
    unit: {
        type: DataTypes.STRING(20),
        defaultValue: 'piece',
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    // Item calculations
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    cgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    sgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    totalGST: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: 'bill_items',
    timestamps: true,
    indexes: [
        {
            fields: ['billId'],
        },
        {
            fields: ['productId'],
        },
        {
            fields: ['attributeId'],
        },
    ],
});

// Instance method to format dates to IST
BillItem.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    return values;
};

export { BillItem };
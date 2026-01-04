import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const ProductAttribute = sequelize.define('ProductAttribute', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    // Attribute details
    attributeName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'e.g., Weight, Volume, Size, Pack',
    },
    attributeValue: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'e.g., 20g, 30ml, Small, 6-pack',
    },
    // Pricing for this variant
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    actualPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    // Stock for this variant
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    // Unique SKU for this variant
    sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    // Status
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
}, {
    tableName: 'product_attributes',
    timestamps: true,
    indexes: [
        {
            fields: ['productId'],
        },
        {
            unique: true,
            fields: ['sku'],
        },
        {
            fields: ['isActive'],
        },
    ],
});

// Instance method to format dates to IST
ProductAttribute.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Calculate discount if actualPrice exists
    if (values.actualPrice && parseFloat(values.actualPrice) > parseFloat(values.price)) {
        const discount = ((parseFloat(values.actualPrice) - parseFloat(values.price)) / parseFloat(values.actualPrice)) * 100;
        values.discountPercentage = discount.toFixed(2);
    }

    return values;
};

export { ProductAttribute };
import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    subCategoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subcategories',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Product name cannot be empty',
            },
            len: {
                args: [1, 200],
                msg: 'Product name must be between 1 and 200 characters',
            },
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    thumbnailImage: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
    },
    sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'SKU cannot be empty',
            },
            len: {
                args: [1, 50],
                msg: 'SKU must be between 1 and 50 characters',
            },
        },
    },
    hsn: {
        type: DataTypes.STRING(8),
        allowNull: true,
        validate: {
            is: {
                args: /^[0-9]{4,8}$/,
                msg: 'HSN must be 4-8 digits',
            },
        },
    },
    gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
            min: {
                args: [0],
                msg: 'GST rate cannot be negative',
            },
            max: {
                args: [100],
                msg: 'GST rate cannot exceed 100%',
            },
        },
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: {
                args: [0],
                msg: 'Price cannot be negative',
            },
        },
    },
    actualPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: {
                args: [0],
                msg: 'Actual price cannot be negative',
            },
        },
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: {
                args: [0],
                msg: 'Stock cannot be negative',
            },
        },
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'piece',
    },
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
    tableName: 'products',
    timestamps: true,
    indexes: [
        {
            fields: ['categoryId'],
        },
        {
            fields: ['subCategoryId'],
        },
        {
            fields: ['sku'],
            unique: true,
        },
    ],
});

// Instance method to format dates to IST
Product.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Add thumbnail URL if exists
    if (values.thumbnailImage) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:6000';
        values.thumbnailImageUrl = `${baseUrl}/${values.thumbnailImage.replace(/\\/g, '/')}`;
    }

    // Calculate discount percentage if actualPrice exists
    if (values.actualPrice && values.actualPrice > values.price) {
        values.discountPercentage = (((values.actualPrice - values.price) / values.actualPrice) * 100).toFixed(2);
    }

    return values;
};

export { Product };
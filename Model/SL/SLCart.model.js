import { DataTypes } from 'sequelize';
import { sequelize } from '../../Database/Database.js';
import moment from 'moment-timezone';

const SLCart = sequelize.define('SLCart', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admins',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    category: {
        type: DataTypes.ENUM('sl_swasthik', 'sl_laxmi'),
        allowNull: false,
    },
    productName: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    productPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1,
        },
    },
    gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
            min: 0,
            max: 100,
        },
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    gstAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
}, {
    tableName: 'sl_carts',
    timestamps: true,
    indexes: [
        {
            fields: ['adminId'],
        },
        {
            fields: ['category'],
        },
    ],
    hooks: {
        beforeValidate: (cart) => {
            // Calculate subtotal
            cart.subtotal = parseFloat(cart.productPrice) * cart.quantity;

            // Calculate GST (only for sl_swasthik)
            if (cart.category === 'sl_swasthik') {
                cart.gstAmount = (cart.subtotal * parseFloat(cart.gstRate || 0)) / 100;
            } else {
                cart.gstRate = 0.00;
                cart.gstAmount = 0.00;
            }

            // Calculate total
            cart.total = cart.subtotal + cart.gstAmount;
        },
    },
});

// Instance method to format dates to IST
SLCart.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    // Format decimal values
    if (values.productPrice) values.productPrice = parseFloat(values.productPrice).toFixed(2);
    if (values.gstRate) values.gstRate = parseFloat(values.gstRate).toFixed(2);
    if (values.subtotal) values.subtotal = parseFloat(values.subtotal).toFixed(2);
    if (values.gstAmount) values.gstAmount = parseFloat(values.gstAmount).toFixed(2);
    if (values.total) values.total = parseFloat(values.total).toFixed(2);

    return values;
};

export { SLCart };
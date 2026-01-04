import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const Cart = sequelize.define('Cart', {
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
    attributeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'product_attributes',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: {
                args: [1],
                msg: 'Quantity must be at least 1',
            },
        },
    },
}, {
    tableName: 'carts',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['adminId', 'productId', 'attributeId'],
            name: 'unique_admin_product_attribute',
        },
        {
            fields: ['adminId'],
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
Cart.prototype.toJSON = function () {
    const values = { ...this.get() };

    const formatIST = (date) =>
        date ? moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : null;

    if (values.createdAt) values.createdAt = formatIST(values.createdAt);
    if (values.updatedAt) values.updatedAt = formatIST(values.updatedAt);

    return values;
};

export { Cart };
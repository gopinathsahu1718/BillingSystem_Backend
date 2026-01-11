import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'Category name cannot be empty',
            },
            len: {
                args: [1, 100],
                msg: 'Category name must be between 1 and 100 characters',
            },
            isValidCategoryName(value) {
                if (!['laxmi_bookstore', 'swasthik_enterprises'].includes(value)) {
                    throw new Error('Only laxmi_bookstore and swasthik_enterprises categories are allowed');
                }
            }
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
    tableName: 'categories',
    timestamps: true,
});

// Instance method to format dates to IST
Category.prototype.toJSON = function () {
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

    return values;
};

export { Category };
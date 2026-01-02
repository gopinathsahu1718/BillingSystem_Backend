import { DataTypes } from 'sequelize';
import { sequelize } from '../Database/Database.js';
import moment from 'moment-timezone';

const SubCategory = sequelize.define('SubCategory', {
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
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'SubCategory name cannot be empty',
            },
            len: {
                args: [1, 100],
                msg: 'SubCategory name must be between 1 and 100 characters',
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
    tableName: 'subcategories',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['categoryId', 'name'],
            name: 'unique_category_subcategory',
        },
    ],
});

// Instance method to format dates to IST
SubCategory.prototype.toJSON = function () {
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

export { SubCategory };
import { Category } from './Category.model.js';
import { SubCategory } from './SubCategory.model.js';
import { Product } from './Product.model.js';

// Define associations
Category.hasMany(SubCategory, {
    foreignKey: 'categoryId',
    as: 'subcategories',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

SubCategory.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
});

Category.hasMany(Product, {
    foreignKey: 'categoryId',
    as: 'products',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

Product.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
});

SubCategory.hasMany(Product, {
    foreignKey: 'subCategoryId',
    as: 'products',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

Product.belongsTo(SubCategory, {
    foreignKey: 'subCategoryId',
    as: 'subcategory',
});

export { Category, SubCategory, Product };
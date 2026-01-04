import { Category } from './Category.model.js';
import { SubCategory } from './SubCategory.model.js';
import { Product } from './Product.model.js';
import { ProductAttribute } from './ProductAttribute.model.js';
import { Cart } from './Cart.model.js';
import { Admin } from './Admin.model.js';
import { Bill } from './Bill.model.js';
import { BillItem } from './BillItem.model.js';

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

// Product Attributes associations
Product.hasMany(ProductAttribute, {
    foreignKey: 'productId',
    as: 'attributes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

ProductAttribute.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
});

// Cart associations
Admin.hasMany(Cart, {
    foreignKey: 'adminId',
    as: 'cartItems',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

Cart.belongsTo(Admin, {
    foreignKey: 'adminId',
    as: 'admin',
});

Product.hasMany(Cart, {
    foreignKey: 'productId',
    as: 'cartItems',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

Cart.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
});

ProductAttribute.hasMany(Cart, {
    foreignKey: 'attributeId',
    as: 'cartItems',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

Cart.belongsTo(ProductAttribute, {
    foreignKey: 'attributeId',
    as: 'attribute',
});

// Bill associations
Admin.hasMany(Bill, {
    foreignKey: 'createdBy',
    as: 'bills',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

Bill.belongsTo(Admin, {
    foreignKey: 'createdBy',
    as: 'creator',
});

Bill.hasMany(BillItem, {
    foreignKey: 'billId',
    as: 'items',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

BillItem.belongsTo(Bill, {
    foreignKey: 'billId',
    as: 'bill',
});

Product.hasMany(BillItem, {
    foreignKey: 'productId',
    as: 'billItems',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

BillItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
});

ProductAttribute.hasMany(BillItem, {
    foreignKey: 'attributeId',
    as: 'billItems',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

BillItem.belongsTo(ProductAttribute, {
    foreignKey: 'attributeId',
    as: 'attribute',
});

export { Category, SubCategory, Product, ProductAttribute, Cart, Admin, Bill, BillItem };
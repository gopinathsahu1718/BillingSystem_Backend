import { Category, SubCategory, Product } from '../Model/associations.js';
import { sequelize } from '../Database/Database.js';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';

// ==================== CATEGORY ROUTES ====================

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const { includeSubcategories } = req.query;

        const options = {
            order: [['createdAt', 'DESC']],
        };

        if (includeSubcategories === 'true') {
            options.include = [{
                model: SubCategory,
                as: 'subcategories',
                where: { isActive: 1 },
                required: false,
            }];
        }

        const categories = await Category.findAll(options);

        return res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        console.error('Get all categories error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single category
const getCategoryById = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { includeSubcategories, includeProducts } = req.query;

        const options = {
            where: { id: categoryId },
            include: [],
        };

        if (includeSubcategories === 'true') {
            options.include.push({
                model: SubCategory,
                as: 'subcategories',
                where: { isActive: 1 },
                required: false,
            });
        }

        if (includeProducts === 'true') {
            options.include.push({
                model: Product,
                as: 'products',
                where: { isActive: 1 },
                required: false,
            });
        }

        const category = await Category.findOne(options);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('Get category by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add category
const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required',
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ where: { name } });
        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: 'Category with this name already exists',
            });
        }

        const categoryData = {
            name: name.trim(),
            description: description?.trim() || null,
        };

        // Handle thumbnail image upload
        if (req.file) {
            categoryData.thumbnailImage = req.file.path;
        }

        const category = await Category.create(categoryData);

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    } catch (error) {
        console.error('Add category error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, isActive } = req.body;

        const category = await Category.findByPk(categoryId);
        if (!category) {
            // Delete uploaded file if category not found
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // Check if name already exists (excluding current category)
        if (name) {
            const existingCategory = await Category.findOne({
                where: {
                    name,
                    id: { [Op.ne]: categoryId }
                },
            });
            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    message: 'Category with this name already exists',
                });
            }
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Handle thumbnail image upload
        if (req.file) {
            // Delete old image if exists
            if (category.thumbnailImage) {
                fs.unlink(category.thumbnailImage, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
            updateData.thumbnailImage = req.file.path;
        }

        await category.update(updateData);

        return res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (error) {
        console.error('Update category error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // Check if category has subcategories
        const subcategoriesCount = await SubCategory.count({ where: { categoryId } });
        if (subcategoriesCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing subcategories. Delete subcategories first.',
            });
        }

        // Check if category has products
        const productsCount = await Product.count({ where: { categoryId } });
        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing products. Delete products first.',
            });
        }

        // Delete thumbnail image if exists
        if (category.thumbnailImage) {
            fs.unlink(category.thumbnailImage, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        await category.destroy();

        return res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// ==================== SUBCATEGORY ROUTES ====================

// Get all subcategories
const getAllSubCategories = async (req, res) => {
    try {
        const { categoryId, includeProducts } = req.query;

        const options = {
            order: [['createdAt', 'DESC']],
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
            }],
        };

        if (categoryId) {
            options.where = { categoryId };
        }

        if (includeProducts === 'true') {
            options.include.push({
                model: Product,
                as: 'products',
                where: { isActive: 1 },
                required: false,
            });
        }

        const subcategories = await SubCategory.findAll(options);

        return res.status(200).json({
            success: true,
            count: subcategories.length,
            data: subcategories,
        });
    } catch (error) {
        console.error('Get all subcategories error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single subcategory
const getSubCategoryById = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const { includeProducts } = req.query;

        const options = {
            where: { id: subCategoryId },
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
            }],
        };

        if (includeProducts === 'true') {
            options.include.push({
                model: Product,
                as: 'products',
                where: { isActive: 1 },
                required: false,
            });
        }

        const subcategory = await SubCategory.findOne(options);

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'SubCategory not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: subcategory,
        });
    } catch (error) {
        console.error('Get subcategory by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add subcategory
const addSubCategory = async (req, res) => {
    try {
        const { categoryId, name, description } = req.body;

        if (!categoryId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and subcategory name are required',
            });
        }

        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // Check if subcategory already exists in this category
        const existingSubCategory = await SubCategory.findOne({
            where: { categoryId, name },
        });
        if (existingSubCategory) {
            return res.status(409).json({
                success: false,
                message: 'SubCategory with this name already exists in this category',
            });
        }

        const subcategoryData = {
            categoryId,
            name: name.trim(),
            description: description?.trim() || null,
        };

        // Handle thumbnail image upload
        if (req.file) {
            subcategoryData.thumbnailImage = req.file.path;
        }

        const subcategory = await SubCategory.create(subcategoryData);

        // Fetch with category details
        const subcategoryWithCategory = await SubCategory.findByPk(subcategory.id, {
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
            }],
        });

        return res.status(201).json({
            success: true,
            message: 'SubCategory created successfully',
            data: subcategoryWithCategory,
        });
    } catch (error) {
        console.error('Add subcategory error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update subcategory
const updateSubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const { categoryId, name, description, isActive } = req.body;

        const subcategory = await SubCategory.findByPk(subCategoryId);
        if (!subcategory) {
            // Delete uploaded file if subcategory not found
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(404).json({
                success: false,
                message: 'SubCategory not found',
            });
        }

        // Check if new category exists
        if (categoryId && categoryId !== subcategory.categoryId) {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found',
                });
            }
        }

        // Check if name already exists in the category (excluding current subcategory)
        if (name || categoryId) {
            const checkCategoryId = categoryId || subcategory.categoryId;
            const existingSubCategory = await SubCategory.findOne({
                where: {
                    categoryId: checkCategoryId,
                    name: name || subcategory.name,
                    id: { [Op.ne]: subCategoryId },
                },
            });
            if (existingSubCategory) {
                return res.status(409).json({
                    success: false,
                    message: 'SubCategory with this name already exists in this category',
                });
            }
        }

        const updateData = {};
        if (categoryId) updateData.categoryId = categoryId;
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Handle thumbnail image upload
        if (req.file) {
            // Delete old image if exists
            if (subcategory.thumbnailImage) {
                fs.unlink(subcategory.thumbnailImage, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
            updateData.thumbnailImage = req.file.path;
        }

        await subcategory.update(updateData);

        // Fetch with category details
        const subcategoryWithCategory = await SubCategory.findByPk(subCategoryId, {
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
            }],
        });

        return res.status(200).json({
            success: true,
            message: 'SubCategory updated successfully',
            data: subcategoryWithCategory,
        });
    } catch (error) {
        console.error('Update subcategory error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Delete subcategory
const deleteSubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;

        const subcategory = await SubCategory.findByPk(subCategoryId);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'SubCategory not found',
            });
        }

        // Check if subcategory has products
        const productsCount = await Product.count({ where: { subCategoryId } });
        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete subcategory with existing products. Delete products first.',
            });
        }

        // Delete thumbnail image if exists
        if (subcategory.thumbnailImage) {
            fs.unlink(subcategory.thumbnailImage, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        await subcategory.destroy();

        return res.status(200).json({
            success: true,
            message: 'SubCategory deleted successfully',
        });
    } catch (error) {
        console.error('Delete subcategory error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// ==================== PRODUCT ROUTES ====================

// Get all products
const getAllProducts = async (req, res) => {
    try {
        const { categoryId, subCategoryId, isActive, search } = req.query;

        const options = {
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name'],
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['id', 'name'],
                },
            ],
            where: {},
        };

        // Filter by category
        if (categoryId) {
            options.where.categoryId = categoryId;
        }

        // Filter by subcategory
        if (subCategoryId) {
            options.where.subCategoryId = subCategoryId;
        }

        // Filter by active status
        if (isActive !== undefined) {
            options.where.isActive = isActive === 'true' ? 1 : 0;
        }

        // Search by name or SKU
        if (search) {
            options.where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
            ];
        }

        const products = await Product.findAll(options);

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        console.error('Get all products error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single product
const getProductById = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findByPk(productId, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name'],
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['id', 'name', 'categoryId'],
                },
            ],
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        console.error('Get product by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add product
const addProduct = async (req, res) => {
    try {
        const {
            categoryId,
            subCategoryId,
            name,
            description,
            sku,
            hsn,
            gstRate,
            price,
            actualPrice,
            stock,
            unit,
        } = req.body;

        // Validate required fields
        if (!categoryId || !subCategoryId || !name || !sku || !price) {
            return res.status(400).json({
                success: false,
                message: 'Category, subcategory, name, SKU, and price are required',
            });
        }

        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // Check if subcategory exists and belongs to the category
        const subcategory = await SubCategory.findByPk(subCategoryId);
        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: 'SubCategory not found',
            });
        }
        if (subcategory.categoryId !== parseInt(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'SubCategory does not belong to the specified category',
            });
        }

        // Check if SKU already exists
        const existingProduct = await Product.findOne({ where: { sku } });
        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: 'Product with this SKU already exists',
            });
        }

        const productData = {
            categoryId,
            subCategoryId,
            name: name.trim(),
            description: description?.trim() || null,
            sku: sku.trim(),
            hsn: hsn?.trim() || null,
            gstRate: gstRate || 0,
            price,
            actualPrice: actualPrice || null,
            stock: stock || 0,
            unit: unit?.trim() || 'piece',
        };

        // Handle thumbnail image upload
        if (req.file) {
            productData.thumbnailImage = req.file.path;
        }

        const product = await Product.create(productData);

        // Fetch with category and subcategory details
        const productWithDetails = await Product.findByPk(product.id, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name'],
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['id', 'name'],
                },
            ],
        });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: productWithDetails,
        });
    } catch (error) {
        console.error('Add product error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const {
            categoryId,
            subCategoryId,
            name,
            description,
            sku,
            hsn,
            gstRate,
            price,
            actualPrice,
            stock,
            unit,
            isActive,
        } = req.body;

        const product = await Product.findByPk(productId);
        if (!product) {
            // Delete uploaded file if product not found
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Check if new category exists
        if (categoryId && categoryId !== product.categoryId) {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found',
                });
            }
        }

        // Check if new subcategory exists and belongs to the category
        if (subCategoryId && subCategoryId !== product.subCategoryId) {
            const subcategory = await SubCategory.findByPk(subCategoryId);
            if (!subcategory) {
                return res.status(404).json({
                    success: false,
                    message: 'SubCategory not found',
                });
            }
            const checkCategoryId = categoryId || product.categoryId;
            if (subcategory.categoryId !== parseInt(checkCategoryId)) {
                return res.status(400).json({
                    success: false,
                    message: 'SubCategory does not belong to the specified category',
                });
            }
        }

        // Check if new SKU already exists (excluding current product)
        if (sku && sku !== product.sku) {
            const existingProduct = await Product.findOne({
                where: {
                    sku,
                    id: { [Op.ne]: productId }
                },
            });
            if (existingProduct) {
                return res.status(409).json({
                    success: false,
                    message: 'Product with this SKU already exists',
                });
            }
        }

        const updateData = {};
        if (categoryId) updateData.categoryId = categoryId;
        if (subCategoryId) updateData.subCategoryId = subCategoryId;
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (sku) updateData.sku = sku.trim();
        if (hsn !== undefined) updateData.hsn = hsn?.trim() || null;
        if (gstRate !== undefined) updateData.gstRate = gstRate;
        if (price !== undefined) updateData.price = price;
        if (actualPrice !== undefined) updateData.actualPrice = actualPrice;
        if (stock !== undefined) updateData.stock = stock;
        if (unit !== undefined) updateData.unit = unit?.trim() || 'piece';
        if (isActive !== undefined) updateData.isActive = isActive;

        // Handle thumbnail image upload
        if (req.file) {
            // Delete old image if exists
            if (product.thumbnailImage) {
                fs.unlink(product.thumbnailImage, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
            updateData.thumbnailImage = req.file.path;
        }

        await product.update(updateData);

        // Fetch with category and subcategory details
        const productWithDetails = await Product.findByPk(productId, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name'],
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['id', 'name'],
                },
            ],
        });

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: productWithDetails,
        });
    } catch (error) {
        console.error('Update product error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Delete thumbnail image if exists
        if (product.thumbnailImage) {
            fs.unlink(product.thumbnailImage, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        await product.destroy();

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    // Category exports
    getAllCategories,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    // SubCategory exports
    getAllSubCategories,
    getSubCategoryById,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    // Product exports
    getAllProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
};
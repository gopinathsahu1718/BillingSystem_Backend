import { ProductAttribute, Product } from '../Model/associations.js';

// Get all attributes for a product
const getProductAttributes = async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const attributes = await ProductAttribute.findAll({
            where: { productId },
            order: [['price', 'ASC']],
        });

        return res.status(200).json({
            success: true,
            count: attributes.length,
            data: attributes,
        });
    } catch (error) {
        console.error('Get product attributes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add attribute to product
const addProductAttribute = async (req, res) => {
    try {
        const { productId } = req.params;
        const {
            attributeName,
            attributeValue,
            price,
            actualPrice,
            stock = 0,
            sku,
        } = req.body;

        // Validate required fields
        if (!attributeName || !attributeValue || !price || !sku) {
            return res.status(400).json({
                success: false,
                message: 'Attribute name, value, price, and SKU are required',
            });
        }

        // Check if product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Check if SKU already exists
        const existingSKU = await ProductAttribute.findOne({
            where: { sku },
        });

        if (existingSKU) {
            return res.status(409).json({
                success: false,
                message: 'SKU already exists. Please use a unique SKU.',
            });
        }

        // Create attribute
        const attribute = await ProductAttribute.create({
            productId,
            attributeName,
            attributeValue,
            price,
            actualPrice: actualPrice || null,
            stock,
            sku,
        });

        return res.status(201).json({
            success: true,
            message: 'Product attribute added successfully',
            data: attribute,
        });
    } catch (error) {
        console.error('Add product attribute error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update product attribute
const updateProductAttribute = async (req, res) => {
    try {
        const { attributeId } = req.params;
        const {
            attributeName,
            attributeValue,
            price,
            actualPrice,
            stock,
            sku,
            isActive,
        } = req.body;

        const attribute = await ProductAttribute.findByPk(attributeId);

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Product attribute not found',
            });
        }

        // If SKU is being updated, check if new SKU exists
        if (sku && sku !== attribute.sku) {
            const existingSKU = await ProductAttribute.findOne({
                where: { sku },
            });

            if (existingSKU) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU already exists. Please use a unique SKU.',
                });
            }
        }

        // Update fields
        if (attributeName !== undefined) attribute.attributeName = attributeName;
        if (attributeValue !== undefined) attribute.attributeValue = attributeValue;
        if (price !== undefined) attribute.price = price;
        if (actualPrice !== undefined) attribute.actualPrice = actualPrice;
        if (stock !== undefined) attribute.stock = stock;
        if (sku !== undefined) attribute.sku = sku;
        if (isActive !== undefined) attribute.isActive = isActive;

        await attribute.save();

        return res.status(200).json({
            success: true,
            message: 'Product attribute updated successfully',
            data: attribute,
        });
    } catch (error) {
        console.error('Update product attribute error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Delete product attribute
const deleteProductAttribute = async (req, res) => {
    try {
        const { attributeId } = req.params;

        const attribute = await ProductAttribute.findByPk(attributeId);

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Product attribute not found',
            });
        }

        await attribute.destroy();

        return res.status(200).json({
            success: true,
            message: 'Product attribute deleted successfully',
        });
    } catch (error) {
        console.error('Delete product attribute error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    getProductAttributes,
    addProductAttribute,
    updateProductAttribute,
    deleteProductAttribute,
};
import { SLCart } from '../../Model/SL/SLCart.model.js';
import { Admin } from '../../Model/Admin.model.js';

// Get all cart items for logged-in admin
const getAllSLCartItems = async (req, res) => {
    try {
        const adminId = req.admin.id;

        const cartItems = await SLCart.findAll({
            where: { adminId },
            order: [['createdAt', 'DESC']],
        });

        // Calculate cart summary
        let subtotal = 0;
        let totalGST = 0;
        let grandTotal = 0;
        let category = null;

        cartItems.forEach((item) => {
            subtotal += parseFloat(item.subtotal);
            totalGST += parseFloat(item.gstAmount);
            grandTotal += parseFloat(item.total);
            if (!category && item.category) {
                category = item.category;
            }
        });

        return res.status(200).json({
            success: true,
            count: cartItems.length,
            category: category,
            summary: {
                subtotal: subtotal.toFixed(2),
                totalGST: totalGST.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
            },
            data: cartItems,
        });
    } catch (error) {
        console.error('Get all SL cart items error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single cart item by ID
const getSLCartItemById = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;

        const cartItem = await SLCart.findOne({
            where: {
                id: cartId,
                adminId: adminId,
            },
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: cartItem,
        });
    } catch (error) {
        console.error('Get SL cart item by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add to cart
const addToSLCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { category, productName, productPrice, quantity = 1, gstRate = 0 } = req.body;

        // Validation
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required (sl_swasthik or sl_laxmi)',
            });
        }

        if (!['sl_swasthik', 'sl_laxmi'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be sl_swasthik or sl_laxmi',
            });
        }

        if (!productName) {
            return res.status(400).json({
                success: false,
                message: 'Product name is required',
            });
        }

        if (!productPrice || productPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid product price is required',
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1',
            });
        }

        // CATEGORY MIXING PREVENTION
        // Check if cart already has items from different category
        const existingCartItems = await SLCart.findAll({
            where: { adminId },
        });

        if (existingCartItems.length > 0) {
            const existingCategory = existingCartItems[0].category;

            if (existingCategory !== category) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot mix categories. Your cart contains items from ${existingCategory}. Please clear your cart first.`,
                    currentCategory: existingCategory,
                    attemptedCategory: category,
                });
            }
        }

        // For sl_laxmi, ensure gstRate is 0
        const finalGstRate = category === 'sl_laxmi' ? 0 : (gstRate || 0);

        // Create cart item (calculations done in model hook)
        const cartItem = await SLCart.create({
            adminId,
            category,
            productName,
            productPrice,
            quantity,
            gstRate: finalGstRate,
        });

        return res.status(201).json({
            success: true,
            message: 'Product added to cart successfully',
            data: cartItem,
        });
    } catch (error) {
        console.error('Add to SL cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update cart item
const updateSLCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;
        const { productName, productPrice, quantity, gstRate } = req.body;

        const cartItem = await SLCart.findOne({
            where: {
                id: cartId,
                adminId: adminId,
            },
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        // Update fields if provided
        if (productName !== undefined) {
            cartItem.productName = productName;
        }

        if (productPrice !== undefined) {
            if (productPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Product price must be greater than 0',
                });
            }
            cartItem.productPrice = productPrice;
        }

        if (quantity !== undefined) {
            if (quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be at least 1',
                });
            }
            cartItem.quantity = quantity;
        }

        // For sl_swasthik, allow gstRate update
        if (gstRate !== undefined && cartItem.category === 'sl_swasthik') {
            if (gstRate < 0 || gstRate > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'GST rate must be between 0 and 100',
                });
            }
            cartItem.gstRate = gstRate;
        }

        // Manually recalculate since we're updating not creating
        const finalPrice = parseFloat(cartItem.productPrice);
        const finalQuantity = parseInt(cartItem.quantity);
        const finalGstRate = parseFloat(cartItem.gstRate || 0);

        // Calculate subtotal
        cartItem.subtotal = finalPrice * finalQuantity;

        // Calculate GST (only for sl_swasthik)
        if (cartItem.category === 'sl_swasthik') {
            cartItem.gstAmount = (cartItem.subtotal * finalGstRate) / 100;
        } else {
            cartItem.gstRate = 0.00;
            cartItem.gstAmount = 0.00;
        }

        // Calculate total
        cartItem.total = parseFloat(cartItem.subtotal) + parseFloat(cartItem.gstAmount);

        // Save with calculations
        await cartItem.save();

        return res.status(200).json({
            success: true,
            message: 'Cart item updated successfully',
            data: cartItem,
        });
    } catch (error) {
        console.error('Update SL cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Remove from cart
const removeFromSLCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;

        const cartItem = await SLCart.findOne({
            where: {
                id: cartId,
                adminId: adminId,
            },
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        await cartItem.destroy();

        return res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully',
        });
    } catch (error) {
        console.error('Remove from SL cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    getAllSLCartItems,
    getSLCartItemById,
    addToSLCart,
    updateSLCart,
    removeFromSLCart,
};
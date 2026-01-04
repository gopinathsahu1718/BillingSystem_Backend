import { Cart, Product, ProductAttribute, Category, SubCategory } from '../Model/associations.js';

// Get all cart items
const getCartItems = async (req, res) => {
    try {
        const adminId = req.admin.id;

        const cartItems = await Cart.findAll({
            where: { adminId },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: [
                        'id',
                        'name',
                        'description',
                        'thumbnailImage',
                        'sku',
                        'price',
                        'actualPrice',
                        'stock',
                        'unit',
                        'gstRate',
                        'isActive',
                    ],
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
                },
                {
                    model: ProductAttribute,
                    as: 'attribute',
                    attributes: [
                        'id',
                        'attributeName',
                        'attributeValue',
                        'price',
                        'actualPrice',
                        'stock',
                        'sku',
                        'isActive',
                    ],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        // Calculate totals
        let totalItems = 0;
        let subtotal = 0;
        let totalGST = 0;
        let grandTotal = 0;

        const cartData = cartItems.map((item) => {
            const product = item.product;
            const attribute = item.attribute;
            const quantity = item.quantity;

            // Determine which price and stock to use (attribute overrides product)
            const itemPrice = attribute ? parseFloat(attribute.price) : parseFloat(product.price);
            const itemStock = attribute ? attribute.stock : product.stock;
            const itemSKU = attribute ? attribute.sku : product.sku;

            // Add thumbnail URL if exists
            let productData = product.toJSON();
            if (productData.thumbnailImage) {
                const baseUrl = process.env.BASE_URL || 'http://localhost:6000';
                productData.thumbnailImageUrl = `${baseUrl}/${productData.thumbnailImage.replace(/\\/g, '/')}`;
            }

            // Calculate item totals
            const itemSubtotal = itemPrice * quantity;
            const itemGST = (itemSubtotal * parseFloat(product.gstRate || 0)) / 100;
            const itemTotal = itemSubtotal + itemGST;

            // Add to cart totals
            totalItems += quantity;
            subtotal += itemSubtotal;
            totalGST += itemGST;
            grandTotal += itemTotal;

            return {
                id: item.id,
                productId: product.id,
                attributeId: attribute ? attribute.id : null,
                quantity: quantity,
                product: productData,
                attribute: attribute ? {
                    id: attribute.id,
                    attributeName: attribute.attributeName,
                    attributeValue: attribute.attributeValue,
                    price: attribute.price,
                    actualPrice: attribute.actualPrice,
                    stock: attribute.stock,
                    sku: attribute.sku,
                    isActive: attribute.isActive,
                } : null,
                effectivePrice: itemPrice.toFixed(2),
                effectiveStock: itemStock,
                effectiveSKU: itemSKU,
                itemSubtotal: itemSubtotal.toFixed(2),
                itemGST: itemGST.toFixed(2),
                itemTotal: itemTotal.toFixed(2),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
        });

        return res.status(200).json({
            success: true,
            count: cartItems.length,
            totalItems: totalItems,
            summary: {
                subtotal: subtotal.toFixed(2),
                totalGST: totalGST.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
            },
            data: cartData,
        });
    } catch (error) {
        console.error('Get cart items error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Add to cart
const addToCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { productId, attributeId = null, quantity = 1 } = req.body;

        // Validation
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required',
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1',
            });
        }

        // Check if product exists and is active
        const product = await Product.findByPk(productId, {
            include: [
                {
                    model: ProductAttribute,
                    as: 'attributes',
                },
            ],
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        if (product.isActive !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Product is not available',
            });
        }

        // Determine price and stock based on attribute
        let effectivePrice, effectiveStock, attribute = null;

        if (attributeId) {
            // If attribute ID provided, validate and use attribute price/stock
            attribute = await ProductAttribute.findOne({
                where: { id: attributeId, productId: productId },
            });

            if (!attribute) {
                return res.status(404).json({
                    success: false,
                    message: 'Product attribute not found',
                });
            }

            if (attribute.isActive !== 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Product attribute is not available',
                });
            }

            effectivePrice = parseFloat(attribute.price);
            effectiveStock = attribute.stock;
        } else {
            // No attribute, use product price/stock
            effectivePrice = parseFloat(product.price);
            effectiveStock = product.stock;
        }

        // Check stock availability
        if (effectiveStock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${effectiveStock} units available in stock`,
            });
        }

        // Check if product+attribute already in cart
        let cartItem = await Cart.findOne({
            where: {
                adminId,
                productId,
                attributeId: attributeId || null,
            },
        });

        if (cartItem) {
            // Update quantity if already exists
            const newQuantity = cartItem.quantity + quantity;

            // Check stock for new quantity
            if (effectiveStock < newQuantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${effectiveStock} units available in stock`,
                });
            }

            cartItem.quantity = newQuantity;
            await cartItem.save();

            // Fetch with product details
            cartItem = await Cart.findByPk(cartItem.id, {
                include: [
                    {
                        model: Product,
                        as: 'product',
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
                    },
                    {
                        model: ProductAttribute,
                        as: 'attribute',
                    },
                ],
            });

            return res.status(200).json({
                success: true,
                message: 'Cart updated successfully',
                data: cartItem,
            });
        } else {
            // Add new item to cart
            cartItem = await Cart.create({
                adminId,
                productId,
                attributeId: attributeId || null,
                quantity,
            });

            // Fetch with product details
            cartItem = await Cart.findByPk(cartItem.id, {
                include: [
                    {
                        model: Product,
                        as: 'product',
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
                    },
                    {
                        model: ProductAttribute,
                        as: 'attribute',
                    },
                ],
            });

            return res.status(201).json({
                success: true,
                message: 'Product added to cart successfully',
                data: cartItem,
            });
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Update cart (increment/decrement quantity)
const updateCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;
        const { quantity, action } = req.body;

        // Find cart item
        const cartItem = await Cart.findOne({
            where: { id: cartId, adminId },
            include: [
                {
                    model: Product,
                    as: 'product',
                },
                {
                    model: ProductAttribute,
                    as: 'attribute',
                },
            ],
        });

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        const product = cartItem.product;
        const attribute = cartItem.attribute;

        // Check if product is still active
        if (product.isActive !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Product is no longer available',
            });
        }

        // Check if attribute is still active (if applicable)
        if (attribute && attribute.isActive !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Product attribute is no longer available',
            });
        }

        // Determine effective stock
        const effectiveStock = attribute ? attribute.stock : product.stock;

        let newQuantity = cartItem.quantity;

        // Handle different actions
        if (action === 'increment') {
            newQuantity += 1;
        } else if (action === 'decrement') {
            newQuantity -= 1;
        } else if (quantity !== undefined) {
            newQuantity = parseInt(quantity);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide either action (increment/decrement) or quantity',
            });
        }

        // Validate new quantity
        if (newQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1. Use remove endpoint to delete item.',
            });
        }

        // Check stock availability
        if (effectiveStock < newQuantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${effectiveStock} units available in stock`,
            });
        }

        // Update quantity
        cartItem.quantity = newQuantity;
        await cartItem.save();

        // Fetch with updated details
        const updatedCartItem = await Cart.findByPk(cartItem.id, {
            include: [
                {
                    model: Product,
                    as: 'product',
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
                },
                {
                    model: ProductAttribute,
                    as: 'attribute',
                },
            ],
        });

        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: updatedCartItem,
        });
    } catch (error) {
        console.error('Update cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Remove from cart
const removeFromCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;

        // Find cart item
        const cartItem = await Cart.findOne({
            where: { id: cartId, adminId },
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
            message: 'Product removed from cart successfully',
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    getCartItems,
    addToCart,
    updateCart,
    removeFromCart,
};
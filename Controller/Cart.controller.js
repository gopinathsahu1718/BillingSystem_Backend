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

        // Calculate effective price, stock, and SKU for each item
        const itemsWithDetails = cartItems.map((item) => {
            const product = item.product;
            const attribute = item.attribute;

            const effectivePrice = attribute ? parseFloat(attribute.price) : parseFloat(product.price);
            const effectiveStock = attribute ? attribute.stock : product.stock;
            const effectiveSKU = attribute ? attribute.sku : product.sku;

            // Add thumbnail URL if exists
            if (product.thumbnailImage) {
                const baseUrl = process.env.BASE_URL || 'http://localhost:6000';
                product.dataValues.thumbnailImageUrl = `${baseUrl}/${product.thumbnailImage.replace(/\\/g, '/')}`;
            }

            // Calculate item amounts
            const itemSubtotal = effectivePrice * item.quantity;
            const gstRate = parseFloat(product.gstRate || 0);

            // GST only for swasthik_enterprises
            const categoryName = product.category.name;
            let itemGST = 0;

            if (categoryName === 'swasthik_enterprises') {
                itemGST = (itemSubtotal * gstRate) / 100;
            }

            const itemTotal = itemSubtotal + itemGST;

            return {
                ...item.toJSON(),
                effectivePrice: effectivePrice.toFixed(2),
                effectiveStock,
                effectiveSKU,
                itemSubtotal: itemSubtotal.toFixed(2),
                itemGST: itemGST.toFixed(2),
                itemTotal: itemTotal.toFixed(2),
            };
        });

        // Calculate cart summary
        let subtotal = 0;
        let totalGST = 0;

        itemsWithDetails.forEach((item) => {
            subtotal += parseFloat(item.itemSubtotal);
            totalGST += parseFloat(item.itemGST);
        });

        const grandTotal = subtotal + totalGST;

        return res.status(200).json({
            success: true,
            count: itemsWithDetails.length,
            totalItems: itemsWithDetails.reduce((sum, item) => sum + item.quantity, 0),
            summary: {
                subtotal: subtotal.toFixed(2),
                totalGST: totalGST.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
            },
            data: itemsWithDetails,
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
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name'],
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

        // CATEGORY MIXING PREVENTION
        // Check if cart already has products from different category
        const existingCartItems = await Cart.findAll({
            where: { adminId },
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
                    ],
                },
            ],
        });

        if (existingCartItems.length > 0) {
            const existingCategoryId = existingCartItems[0].product.categoryId;
            const existingCategoryName = existingCartItems[0].product.category.name;

            if (existingCategoryId !== product.categoryId) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot mix products from different stores. Your cart contains items from ${existingCategoryName}. Please clear your cart first.`,
                    currentCategory: existingCategoryName,
                    attemptedCategory: product.category.name,
                });
            }
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

// Update cart item
const updateCart = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { cartId } = req.params;
        const { quantity, action } = req.body;

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
        const effectiveStock = cartItem.attribute ? cartItem.attribute.stock : cartItem.product.stock;

        let newQuantity = cartItem.quantity;

        if (action === 'increment') {
            newQuantity += 1;
        } else if (action === 'decrement') {
            newQuantity = Math.max(1, newQuantity - 1);
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
                message: 'Quantity must be at least 1',
            });
        }

        if (newQuantity > effectiveStock) {
            return res.status(400).json({
                success: false,
                message: `Only ${effectiveStock} units available in stock`,
            });
        }

        // Check if attribute is still active (if applicable)
        if (cartItem.attribute && cartItem.attribute.isActive !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Product attribute is no longer available',
            });
        }

        cartItem.quantity = newQuantity;
        await cartItem.save();

        // Fetch with complete details
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
            message: 'Item removed from cart successfully',
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

export { getCartItems, addToCart, updateCart, removeFromCart };
import { Bill, BillItem, Cart, Product, Admin } from '../Model/associations.js';
import { sequelize } from '../Database/Database.js';

// Generate unique bill number
const generateBillNumber = async () => {
    const prefix = 'INV';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get the last bill number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastBill = await Bill.findOne({
        where: {
            createdAt: {
                [sequelize.Sequelize.Op.gte]: today,
                [sequelize.Sequelize.Op.lt]: tomorrow,
            },
        },
        order: [['id', 'DESC']],
    });

    let sequence = 1;
    if (lastBill) {
        // Extract sequence from last bill number (INV2401-0001 -> 0001)
        const lastSequence = parseInt(lastBill.billNumber.split('-')[1]);
        sequence = lastSequence + 1;
    }

    const billNumber = `${prefix}${year}${month}-${sequence.toString().padStart(4, '0')}`;
    return billNumber;
};

// Create bill from cart
const createBill = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const adminId = req.admin.id;
        const { customerName, customerAddress, customerContact, paymentMode = 'cash' } = req.body;

        // Validate required fields
        if (!customerName || !customerContact) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Customer name and contact are required',
            });
        }

        // Validate payment mode
        const validPaymentModes = ['cash', 'card', 'upi', 'netbanking', 'other'];
        if (!validPaymentModes.includes(paymentMode)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid payment mode. Must be one of: cash, card, upi, netbanking, other',
            });
        }

        // Get cart items
        const cartItems = await Cart.findAll({
            where: { adminId },
            include: [
                {
                    model: Product,
                    as: 'product',
                },
            ],
            transaction,
        });

        if (cartItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cart is empty. Add products to cart before creating bill.',
            });
        }

        // Validate stock and calculate totals
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        const billItems = [];

        for (const cartItem of cartItems) {
            const product = cartItem.product;

            // Check if product is active
            if (product.isActive !== 1) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Product "${product.name}" is not available`,
                });
            }

            // Check stock availability
            if (product.stock < cartItem.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Required: ${cartItem.quantity}`,
                });
            }

            // Calculate item amounts
            const unitPrice = parseFloat(product.price);
            const quantity = cartItem.quantity;
            const gstRate = parseFloat(product.gstRate || 0);

            const itemSubtotal = unitPrice * quantity;
            const itemTotalGST = (itemSubtotal * gstRate) / 100;
            const itemCGST = itemTotalGST / 2; // CGST is half of total GST
            const itemSGST = itemTotalGST / 2; // SGST is half of total GST
            const itemTotal = itemSubtotal + itemTotalGST;

            // Add to bill totals
            subtotal += itemSubtotal;
            totalCGST += itemCGST;
            totalSGST += itemSGST;

            // Prepare bill item data
            billItems.push({
                productId: product.id,
                productName: product.name,
                productSKU: product.sku,
                quantity: quantity,
                unit: product.unit,
                unitPrice: unitPrice,
                gstRate: gstRate,
                subtotal: itemSubtotal.toFixed(2),
                cgst: itemCGST.toFixed(2),
                sgst: itemSGST.toFixed(2),
                totalGST: itemTotalGST.toFixed(2),
                total: itemTotal.toFixed(2),
            });

            // Update product stock
            await product.update(
                { stock: product.stock - quantity },
                { transaction }
            );
        }

        const totalGST = totalCGST + totalSGST;
        const grandTotal = subtotal + totalGST;

        // Generate bill number
        const billNumber = await generateBillNumber();

        // Create bill
        const bill = await Bill.create(
            {
                billNumber,
                customerName,
                customerAddress: customerAddress || null,
                customerContact,
                paymentMode,
                subtotal: subtotal.toFixed(2),
                cgst: totalCGST.toFixed(2),
                sgst: totalSGST.toFixed(2),
                totalGST: totalGST.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
                createdBy: adminId,
            },
            { transaction }
        );

        // Create bill items
        for (const itemData of billItems) {
            await BillItem.create(
                {
                    billId: bill.id,
                    ...itemData,
                },
                { transaction }
            );
        }

        // Clear cart after successful bill creation
        await Cart.destroy({
            where: { adminId },
            transaction,
        });

        // Commit transaction
        await transaction.commit();

        // Fetch complete bill with items
        const completeBill = await Bill.findByPk(bill.id, {
            include: [
                {
                    model: BillItem,
                    as: 'items',
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username', 'email'],
                },
            ],
        });

        return res.status(201).json({
            success: true,
            message: 'Bill created successfully',
            data: completeBill,
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Create bill error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get all bills
const getAllBills = async (req, res) => {
    try {
        const {
            search,
            paymentMode,
            isActive,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = req.query;

        const options = {
            include: [
                {
                    model: BillItem,
                    as: 'items',
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username', 'email'],
                },
            ],
            where: {},
            order: [[sortBy, sortOrder]],
        };

        // Search by bill number, customer name, or contact
        if (search) {
            options.where[sequelize.Sequelize.Op.or] = [
                { billNumber: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { customerName: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { customerContact: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
            ];
        }

        // Filter by payment mode
        if (paymentMode) {
            options.where.paymentMode = paymentMode;
        }

        // Filter by active status
        if (isActive !== undefined) {
            options.where.isActive = isActive === 'true' ? 1 : 0;
        }

        const bills = await Bill.findAll(options);

        // Calculate summary
        const summary = bills.reduce(
            (acc, bill) => {
                acc.totalAmount += parseFloat(bill.grandTotal);
                acc.totalCGST += parseFloat(bill.cgst);
                acc.totalSGST += parseFloat(bill.sgst);
                acc.totalGST += parseFloat(bill.totalGST);
                return acc;
            },
            { totalAmount: 0, totalCGST: 0, totalSGST: 0, totalGST: 0 }
        );

        return res.status(200).json({
            success: true,
            count: bills.length,
            summary: {
                totalAmount: summary.totalAmount.toFixed(2),
                totalCGST: summary.totalCGST.toFixed(2),
                totalSGST: summary.totalSGST.toFixed(2),
                totalGST: summary.totalGST.toFixed(2),
            },
            data: bills,
        });
    } catch (error) {
        console.error('Get all bills error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single bill
const getBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findByPk(billId, {
            include: [
                {
                    model: BillItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'sku', 'thumbnailImage'],
                        },
                    ],
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'storeName'],
                },
            ],
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: bill,
        });
    } catch (error) {
        console.error('Get bill by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Disable bill (soft delete)
const disableBill = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findByPk(billId);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found',
            });
        }

        if (bill.isActive === 0) {
            return res.status(400).json({
                success: false,
                message: 'Bill is already disabled',
            });
        }

        await bill.update({ isActive: 0 });

        return res.status(200).json({
            success: true,
            message: 'Bill disabled successfully',
            data: bill,
        });
    } catch (error) {
        console.error('Disable bill error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    createBill,
    getAllBills,
    getBillById,
    disableBill,
};
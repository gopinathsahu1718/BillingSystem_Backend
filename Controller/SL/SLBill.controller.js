import { SLBill, SLBillItem } from '../../Model/SL/SLBill.model.js';
import { SLCart } from '../../Model/SL/SLCart.model.js';
import { Admin } from '../../Model/Admin.model.js';
import { sequelize } from '../../Database/Database.js';

// Generate unique bill number
const generateSLBillNumber = async () => {
    const prefix = 'SL';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get the last bill number for this month
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const lastBill = await SLBill.findOne({
        where: {
            createdAt: {
                [sequelize.Sequelize.Op.gte]: firstDayOfMonth,
                [sequelize.Sequelize.Op.lte]: lastDayOfMonth,
            },
        },
        order: [['id', 'DESC']],
    });

    let sequence = 1;
    if (lastBill) {
        // Extract sequence from last bill number (SL2401-0001 -> 0001)
        const lastSequence = parseInt(lastBill.billNumber.split('-')[1]);
        sequence = lastSequence + 1;
    }

    const billNumber = `${prefix}${year}${month}-${sequence.toString().padStart(4, '0')}`;
    return billNumber;
};

// Get all bills
const getAllSLBills = async (req, res) => {
    try {
        const { category, isActive, search, paymentMode, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

        const options = {
            order: [[sortBy, sortOrder]],
            include: [
                {
                    model: SLBillItem,
                    as: 'items',
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username', 'email'],
                },
            ],
            where: {},
        };

        // Filter by category
        if (category) {
            options.where.category = category;
        }

        // Filter by isActive
        if (isActive !== undefined) {
            options.where.isActive = isActive === 'true' ? 1 : 0;
        }

        // Filter by payment mode
        if (paymentMode) {
            options.where.paymentMode = paymentMode;
        }

        // Search by bill number or customer details
        if (search) {
            options.where[sequelize.Sequelize.Op.or] = [
                { billNumber: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { billToName: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { billToMobile: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
            ];
        }

        const bills = await SLBill.findAll(options);

        // Calculate summary
        let totalAmount = 0;
        let totalGSTAmount = 0;

        bills.forEach((bill) => {
            totalAmount += parseFloat(bill.grandTotal);
            totalGSTAmount += parseFloat(bill.totalGST);
        });

        return res.status(200).json({
            success: true,
            count: bills.length,
            summary: {
                totalAmount: totalAmount.toFixed(2),
                totalGST: totalGSTAmount.toFixed(2),
            },
            data: bills,
        });
    } catch (error) {
        console.error('Get all SL bills error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Get single bill by ID
const getSLBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await SLBill.findByPk(billId, {
            include: [
                {
                    model: SLBillItem,
                    as: 'items',
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username', 'email'],
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
        console.error('Get SL bill by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Create bill from cart
const createSLBill = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const adminId = req.admin.id;
        const {
            billToName,
            billToAddress,
            billToMobile,
            shipToName,
            shipToAddress,
            shipToMobile,
            paymentMode = 'cash',
        } = req.body;

        // Validate required fields
        if (!billToName || !billToAddress || !billToMobile) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Bill To details are required (name, address, mobile)',
            });
        }

        if (!shipToName || !shipToAddress || !shipToMobile) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Ship To details are required (name, address, mobile)',
            });
        }

        // Get cart items
        const cartItems = await SLCart.findAll({
            where: { adminId },
            transaction,
        });

        if (cartItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cart is empty',
            });
        }

        // Get category from first item (all items should be same category due to cart validation)
        const category = cartItems[0].category;

        // Calculate bill totals
        let totalSubtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalGST = 0;
        let grandTotal = 0;

        const billItemsData = [];

        for (const cartItem of cartItems) {
            const itemSubtotal = parseFloat(cartItem.subtotal);
            let itemGST = 0;
            let itemCGST = 0;
            let itemSGST = 0;

            // Calculate GST only for sl_swasthik
            if (category === 'sl_swasthik') {
                itemGST = parseFloat(cartItem.gstAmount);
                itemCGST = itemGST / 2;
                itemSGST = itemGST / 2;
            }

            const itemTotal = itemSubtotal + itemGST;

            // Add to totals
            totalSubtotal += itemSubtotal;
            totalCGST += itemCGST;
            totalSGST += itemSGST;
            totalGST += itemGST;
            grandTotal += itemTotal;

            // Prepare bill item data
            billItemsData.push({
                productName: cartItem.productName,
                productPrice: parseFloat(cartItem.productPrice),
                quantity: cartItem.quantity,
                gstRate: parseFloat(cartItem.gstRate || 0),
                subtotal: itemSubtotal,
                cgst: itemCGST,
                sgst: itemSGST,
                totalGST: itemGST,
                total: itemTotal,
            });
        }

        // Generate bill number
        const billNumber = await generateSLBillNumber();

        // Create bill
        const bill = await SLBill.create({
            billNumber,
            category,
            billToName,
            billToAddress,
            billToMobile,
            shipToName,
            shipToAddress,
            shipToMobile,
            paymentMode,
            subtotal: totalSubtotal,
            cgst: totalCGST,
            sgst: totalSGST,
            totalGST: totalGST,
            grandTotal: grandTotal,
            isActive: 1,
            createdBy: adminId,
        }, { transaction });

        // Create bill items
        for (const itemData of billItemsData) {
            await SLBillItem.create({
                billId: bill.id,
                ...itemData,
            }, { transaction });
        }

        // Clear cart
        await SLCart.destroy({
            where: { adminId },
            transaction,
        });

        // Commit transaction
        await transaction.commit();

        // Fetch complete bill with items
        const completeBill = await SLBill.findByPk(bill.id, {
            include: [
                {
                    model: SLBillItem,
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
        console.error('Create SL bill error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Disable bill
const disableSLBill = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await SLBill.findByPk(billId);

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

        bill.isActive = 0;
        await bill.save();

        return res.status(200).json({
            success: true,
            message: 'Bill disabled successfully',
            data: {
                id: bill.id,
                billNumber: bill.billNumber,
                isActive: bill.isActive,
            },
        });
    } catch (error) {
        console.error('Disable SL bill error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

// Enable bill
const enableSLBill = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await SLBill.findByPk(billId);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found',
            });
        }

        if (bill.isActive === 1) {
            return res.status(400).json({
                success: false,
                message: 'Bill is already enabled',
            });
        }

        bill.isActive = 1;
        await bill.save();

        return res.status(200).json({
            success: true,
            message: 'Bill enabled successfully',
            data: {
                id: bill.id,
                billNumber: bill.billNumber,
                isActive: bill.isActive,
            },
        });
    } catch (error) {
        console.error('Enable SL bill error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};

export {
    getAllSLBills,
    getSLBillById,
    createSLBill,
    disableSLBill,
    enableSLBill,
};
import { Bill, BillItem, Cart, Product, Admin, Category, SubCategory } from '../Model/associations.js';
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

// Get dashboard data
const getDashboardData = async (req, res) => {
    try {
        const now = new Date();

        // Date ranges
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Total Bills (All Time)
        const totalBills = await Bill.count({
            where: { isActive: 1 },
        });

        const totalBillsAmount = await Bill.sum('grandTotal', {
            where: { isActive: 1 },
        });

        // 2. Today's Bills
        const todayBills = await Bill.count({
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: todayStart,
                    [sequelize.Sequelize.Op.lt]: todayEnd,
                },
            },
        });

        const todayBillsAmount = await Bill.sum('grandTotal', {
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: todayStart,
                    [sequelize.Sequelize.Op.lt]: todayEnd,
                },
            },
        });

        // 3. This Week's Bills
        const weekBills = await Bill.count({
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: weekStart,
                },
            },
        });

        const weekBillsAmount = await Bill.sum('grandTotal', {
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: weekStart,
                },
            },
        });

        // 4. This Month's Bills
        const monthBills = await Bill.count({
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: monthStart,
                },
            },
        });

        const monthBillsAmount = await Bill.sum('grandTotal', {
            where: {
                isActive: 1,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: monthStart,
                },
            },
        });

        // 5. Bills by Category
        const billsByCategory = await sequelize.query(`
      SELECT 
        c.id,
        c.name as categoryName,
        COUNT(DISTINCT b.id) as billCount,
        SUM(bi.quantity) as totalQuantity,
        SUM(bi.total) as totalAmount
      FROM categories c
      LEFT JOIN products p ON c.id = p.categoryId
      LEFT JOIN bill_items bi ON p.id = bi.productId
      LEFT JOIN bills b ON bi.billId = b.id AND b.isActive = 1
      GROUP BY c.id, c.name
      ORDER BY totalAmount DESC
    `, {
            type: sequelize.QueryTypes.SELECT,
        });

        // 6. Bills by SubCategory
        const billsBySubCategory = await sequelize.query(`
      SELECT 
        sc.id,
        sc.name as subCategoryName,
        c.name as categoryName,
        COUNT(DISTINCT b.id) as billCount,
        SUM(bi.quantity) as totalQuantity,
        SUM(bi.total) as totalAmount
      FROM subcategories sc
      LEFT JOIN categories c ON sc.categoryId = c.id
      LEFT JOIN products p ON sc.id = p.subCategoryId
      LEFT JOIN bill_items bi ON p.id = bi.productId
      LEFT JOIN bills b ON bi.billId = b.id AND b.isActive = 1
      GROUP BY sc.id, sc.name, c.name
      ORDER BY totalAmount DESC
      LIMIT 10
    `, {
            type: sequelize.QueryTypes.SELECT,
        });

        // 7. Last 5 Bills
        const lastFiveBills = await Bill.findAll({
            where: { isActive: 1 },
            include: [
                {
                    model: BillItem,
                    as: 'items',
                    limit: 3, // Show only first 3 items per bill
                },
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['id', 'username'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: 5,
        });

        // 8. Top 5 Products (Most Sold)
        const topProducts = await sequelize.query(`
      SELECT 
        bi.productName,
        bi.productSKU,
        SUM(bi.quantity) as totalQuantitySold,
        COUNT(DISTINCT bi.billId) as billCount,
        SUM(bi.total) as totalRevenue
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      WHERE b.isActive = 1
      GROUP BY bi.productId, bi.productName, bi.productSKU
      ORDER BY totalQuantitySold DESC
      LIMIT 5
    `, {
            type: sequelize.QueryTypes.SELECT,
        });

        // 9. Payment Mode Distribution
        const paymentModeStats = await Bill.findAll({
            where: { isActive: 1 },
            attributes: [
                'paymentMode',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('grandTotal')), 'total'],
            ],
            group: ['paymentMode'],
            raw: true,
        });

        // 10. Revenue Trend (Last 7 Days)
        const revenueTrend = await sequelize.query(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as billCount,
        SUM(subtotal) as subtotal,
        SUM(totalGST) as totalGST,
        SUM(grandTotal) as grandTotal
      FROM bills
      WHERE isActive = 1
      AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `, {
            type: sequelize.QueryTypes.SELECT,
        });

        // 11. GST Summary
        const gstSummary = await Bill.findAll({
            where: { isActive: 1 },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalSubtotal'],
                [sequelize.fn('SUM', sequelize.col('cgst')), 'totalCGST'],
                [sequelize.fn('SUM', sequelize.col('sgst')), 'totalSGST'],
                [sequelize.fn('SUM', sequelize.col('totalGST')), 'totalGST'],
            ],
            raw: true,
        });

        // 12. Low Stock Alert (Products with stock < 10)
        const lowStockProducts = await Product.findAll({
            where: {
                isActive: 1,
                stock: {
                    [sequelize.Sequelize.Op.lt]: 10,
                },
            },
            attributes: ['id', 'name', 'sku', 'stock', 'price'],
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['name'],
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['name'],
                },
            ],
            order: [['stock', 'ASC']],
            limit: 10,
        });

        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalBills: {
                        count: totalBills || 0,
                        amount: parseFloat(totalBillsAmount || 0).toFixed(2),
                    },
                    todayBills: {
                        count: todayBills || 0,
                        amount: parseFloat(todayBillsAmount || 0).toFixed(2),
                    },
                    weekBills: {
                        count: weekBills || 0,
                        amount: parseFloat(weekBillsAmount || 0).toFixed(2),
                    },
                    monthBills: {
                        count: monthBills || 0,
                        amount: parseFloat(monthBillsAmount || 0).toFixed(2),
                    },
                },
                billsByCategory: billsByCategory.map(cat => ({
                    categoryId: cat.id,
                    categoryName: cat.categoryName,
                    billCount: parseInt(cat.billCount) || 0,
                    totalQuantity: parseInt(cat.totalQuantity) || 0,
                    totalAmount: parseFloat(cat.totalAmount || 0).toFixed(2),
                })),
                billsBySubCategory: billsBySubCategory.map(sub => ({
                    subCategoryId: sub.id,
                    subCategoryName: sub.subCategoryName,
                    categoryName: sub.categoryName,
                    billCount: parseInt(sub.billCount) || 0,
                    totalQuantity: parseInt(sub.totalQuantity) || 0,
                    totalAmount: parseFloat(sub.totalAmount || 0).toFixed(2),
                })),
                lastFiveBills: lastFiveBills,
                topProducts: topProducts.map(prod => ({
                    productName: prod.productName,
                    productSKU: prod.productSKU,
                    totalQuantitySold: parseInt(prod.totalQuantitySold),
                    billCount: parseInt(prod.billCount),
                    totalRevenue: parseFloat(prod.totalRevenue).toFixed(2),
                })),
                paymentModeStats: paymentModeStats.map(pm => ({
                    paymentMode: pm.paymentMode,
                    count: parseInt(pm.count),
                    total: parseFloat(pm.total).toFixed(2),
                })),
                revenueTrend: revenueTrend.map(day => ({
                    date: day.date,
                    billCount: parseInt(day.billCount),
                    subtotal: parseFloat(day.subtotal).toFixed(2),
                    totalGST: parseFloat(day.totalGST).toFixed(2),
                    grandTotal: parseFloat(day.grandTotal).toFixed(2),
                })),
                gstSummary: {
                    totalSubtotal: parseFloat(gstSummary[0].totalSubtotal || 0).toFixed(2),
                    totalCGST: parseFloat(gstSummary[0].totalCGST || 0).toFixed(2),
                    totalSGST: parseFloat(gstSummary[0].totalSGST || 0).toFixed(2),
                    totalGST: parseFloat(gstSummary[0].totalGST || 0).toFixed(2),
                },
                lowStockProducts: lowStockProducts,
            },
        });
    } catch (error) {
        console.error('Get dashboard data error:', error);
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
    getDashboardData,
};
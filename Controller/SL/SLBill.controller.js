import { SLBill, SLBillItem } from '../../Model/SL/SLBill.model.js';
import { SLCart } from '../../Model/SL/SLCart.model.js';
import { Admin } from '../../Model/Admin.model.js';
import { sequelize } from '../../Database/Database.js';

// Generate unique bill number
// Generate unique bill number - Yearly sequence (e.g., SL24-0001, SL25-0002, ...)
const generateSLBillNumber = async () => {
    const prefix = 'SL';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // e.g., '24', '25'

    // Get first and last day of the current year
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59);

    const lastBill = await SLBill.findOne({
        where: {
            createdAt: {
                [sequelize.Sequelize.Op.gte]: firstDayOfYear,
                [sequelize.Sequelize.Op.lte]: lastDayOfYear,
            },
        },
        order: [['id', 'DESC']],
    });

    let sequence = 1;
    if (lastBill) {
        // Extract sequence from billNumber like "SL24-0456"
        const lastSequence = parseInt(lastBill.billNumber.split('-')[1]);
        sequence = lastSequence + 1;
    }

    return `${prefix}${year}-${sequence.toString().padStart(4, '0')}`;
};

// ─── Get all bills ────────────────────────────────────────────
const getAllSLBills = async (req, res) => {
    try {
        const { category, isActive, search, paymentMode, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

        const options = {
            order: [[sortBy, sortOrder]],
            include: [
                { model: SLBillItem, as: 'items' },
                { model: Admin, as: 'creator', attributes: ['id', 'username', 'email'] },
            ],
            where: {},
        };

        if (category) options.where.category = category;
        if (isActive !== undefined) options.where.isActive = isActive === 'true' ? 1 : 0;
        if (paymentMode) options.where.paymentMode = paymentMode;

        if (search) {
            options.where[sequelize.Sequelize.Op.or] = [
                { billNumber: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { billToName: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
                { billToMobile: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
            ];
        }

        const bills = await SLBill.findAll(options);

        let totalAmount = 0;
        let totalGSTAmount = 0;
        bills.forEach((bill) => {
            totalAmount += parseFloat(bill.grandTotal);
            totalGSTAmount += parseFloat(bill.totalGST);
        });

        return res.status(200).json({
            success: true,
            count: bills.length,
            summary: { totalAmount: totalAmount.toFixed(2), totalGST: totalGSTAmount.toFixed(2) },
            data: bills,
        });
    } catch (error) {
        console.error('Get all SL bills error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ─── Get single bill ──────────────────────────────────────────
const getSLBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await SLBill.findByPk(billId, {
            include: [
                { model: SLBillItem, as: 'items' },
                { model: Admin, as: 'creator', attributes: ['id', 'username', 'email'] },
            ],
        });

        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

        return res.status(200).json({ success: true, data: bill });
    } catch (error) {
        console.error('Get SL bill by ID error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ─── Create bill from cart ────────────────────────────────────
const createSLBill = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const adminId = req.admin.id;
        const {
            billToName, billToAddress, billToMobile,
            shipToName, shipToAddress, shipToMobile,
            paymentMode = 'cash',
            billDate,
        } = req.body;

        if (!billToName || !billToAddress || !billToMobile) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Bill To details are required (name, address, mobile)' });
        }
        if (!shipToName || !shipToAddress || !shipToMobile) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Ship To details are required (name, address, mobile)' });
        }
        if (!billDate) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Bill Date is required' });
        }

        const cartItems = await SLCart.findAll({ where: { adminId }, transaction });
        if (cartItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const category = cartItems[0].category;
        let totalSubtotal = 0, totalCGST = 0, totalSGST = 0, totalGST = 0, grandTotal = 0;
        const billItemsData = [];

        for (const cartItem of cartItems) {
            const itemSubtotal = parseFloat(cartItem.subtotal);
            const itemGST = parseFloat(cartItem.gstAmount);
            const itemCGST = itemGST / 2;
            const itemSGST = itemGST / 2;
            const itemTotal = itemSubtotal + itemGST;

            totalSubtotal += itemSubtotal;
            totalCGST += itemCGST;
            totalSGST += itemSGST;
            totalGST += itemGST;
            grandTotal += itemTotal;

            billItemsData.push({
                productName: cartItem.productName,
                productPrice: parseFloat(cartItem.productPrice),
                quantity: cartItem.quantity,
                hsn: cartItem.hsn,
                gstRate: parseFloat(cartItem.gstRate || 0),
                subtotal: itemSubtotal,
                cgst: itemCGST,
                sgst: itemSGST,
                totalGST: itemGST,
                total: itemTotal,
            });
        }

        const billNumber = await generateSLBillNumber();

        const bill = await SLBill.create({
            billNumber,
            billDate,
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
            totalGST, grandTotal,
            isActive: 1,
            createdBy: adminId,
        }, { transaction });

        for (const itemData of billItemsData) {
            await SLBillItem.create({ billId: bill.id, ...itemData }, { transaction });
        }

        await SLCart.destroy({ where: { adminId }, transaction });
        await transaction.commit();

        const completeBill = await SLBill.findByPk(bill.id, {
            include: [
                { model: SLBillItem, as: 'items' },
                { model: Admin, as: 'creator', attributes: ['id', 'username', 'email'] },
            ],
        });

        return res.status(201).json({ success: true, message: 'Bill created successfully', data: completeBill });
    } catch (error) {
        await transaction.rollback();
        console.error('Create SL bill error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ─── Edit bill  (header + items) ─────────────────────────────
// PUT /sl-bills/:billId/edit
//
// Request body (all fields optional):
//   billToAddress, billToMobile       — bill-to contact
//   shipToAddress, shipToMobile       — ship-to contact
//   billDate                          — YYYY-MM-DD
//   items: [                          — replaces ALL existing items when present
//     { productName, productPrice, quantity, hsn?, gstRate? }
//   ]
//
// When items are supplied the bill totals (subtotal / cgst / sgst /
// totalGST / grandTotal) are fully recalculated.
// For sl_laxmi bills gstRate is always treated as 0.
const editSLBill = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { billId } = req.params;
        const {
            billToAddress, billToMobile,
            shipToAddress, shipToMobile,
            billDate,
            items,
        } = req.body;

        const bill = await SLBill.findByPk(billId, { transaction });
        if (!bill) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        // ── Validate & apply header fields ────────────────────
        if (billToAddress !== undefined && !String(billToAddress).trim()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Bill To Address cannot be empty' });
        }
        if (billToMobile !== undefined && !String(billToMobile).trim()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Bill To Mobile cannot be empty' });
        }
        if (shipToAddress !== undefined && !String(shipToAddress).trim()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Ship To Address cannot be empty' });
        }
        if (shipToMobile !== undefined && !String(shipToMobile).trim()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Ship To Mobile cannot be empty' });
        }
        if (billDate !== undefined && !billDate) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Bill Date cannot be empty' });
        }

        if (billToAddress !== undefined) bill.billToAddress = String(billToAddress).trim();
        if (billToMobile !== undefined) bill.billToMobile = String(billToMobile).trim();
        if (shipToAddress !== undefined) bill.shipToAddress = String(shipToAddress).trim();
        if (shipToMobile !== undefined) bill.shipToMobile = String(shipToMobile).trim();
        if (billDate !== undefined) bill.billDate = billDate;

        // ── Validate, recalculate & replace items ─────────────
        if (Array.isArray(items) && items.length > 0) {
            const isSwasthik = bill.category === 'sl_swasthik';

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (!it.productName || !String(it.productName).trim()) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `Item ${i + 1}: productName is required` });
                }
                const price = parseFloat(it.productPrice);
                if (isNaN(price) || price < 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `Item ${i + 1}: valid productPrice is required` });
                }
                const qty = parseInt(it.quantity);
                if (isNaN(qty) || qty < 1) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `Item ${i + 1}: quantity must be at least 1` });
                }
                if (isSwasthik) {
                    const gr = parseFloat(it.gstRate ?? 0);
                    if (isNaN(gr) || gr < 0 || gr > 100) {
                        await transaction.rollback();
                        return res.status(400).json({ success: false, message: `Item ${i + 1}: gstRate must be between 0 and 100` });
                    }
                }
            }

            // Delete all existing items for this bill
            await SLBillItem.destroy({ where: { billId: bill.id }, transaction });

            let totalSubtotal = 0, totalCGST = 0, totalSGST = 0, totalGST = 0, grandTotal = 0;

            for (const it of items) {
                const price = parseFloat(parseFloat(it.productPrice).toFixed(2));
                const qty = parseInt(it.quantity);
                const gstRate = bill.category === 'sl_swasthik'
                    ? parseFloat(parseFloat(it.gstRate ?? 0).toFixed(2))
                    : 0;

                const subtotal = parseFloat((price * qty).toFixed(2));
                const gstAmt = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
                const cgst = parseFloat((gstAmt / 2).toFixed(2));
                const sgst = parseFloat((gstAmt / 2).toFixed(2));
                const total = parseFloat((subtotal + gstAmt).toFixed(2));

                totalSubtotal += subtotal;
                totalCGST += cgst;
                totalSGST += sgst;
                totalGST += gstAmt;
                grandTotal += total;

                await SLBillItem.create({
                    billId: bill.id,
                    productName: String(it.productName).trim(),
                    productPrice: price,
                    quantity: qty,
                    hsn: it.hsn ? String(it.hsn).trim() : null,
                    gstRate,
                    subtotal,
                    cgst,
                    sgst,
                    totalGST: gstAmt,
                    total,
                }, { transaction });
            }

            bill.subtotal = parseFloat(totalSubtotal.toFixed(2));
            bill.cgst = parseFloat(totalCGST.toFixed(2));
            bill.sgst = parseFloat(totalSGST.toFixed(2));
            bill.totalGST = parseFloat(totalGST.toFixed(2));
            bill.grandTotal = parseFloat(grandTotal.toFixed(2));
        }

        await bill.save({ transaction });
        await transaction.commit();

        const updatedBill = await SLBill.findByPk(billId, {
            include: [
                { model: SLBillItem, as: 'items' },
                { model: Admin, as: 'creator', attributes: ['id', 'username', 'email'] },
            ],
        });

        return res.status(200).json({ success: true, message: 'Bill updated successfully', data: updatedBill });
    } catch (error) {
        await transaction.rollback();
        console.error('Edit SL bill error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ─── Disable bill ─────────────────────────────────────────────
const disableSLBill = async (req, res) => {
    try {
        const { billId } = req.params;
        const bill = await SLBill.findByPk(billId);
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
        if (bill.isActive === 0) return res.status(400).json({ success: false, message: 'Bill is already disabled' });

        bill.isActive = 0;
        await bill.save();

        return res.status(200).json({
            success: true, message: 'Bill disabled successfully',
            data: { id: bill.id, billNumber: bill.billNumber, isActive: bill.isActive },
        });
    } catch (error) {
        console.error('Disable SL bill error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ─── Enable bill ──────────────────────────────────────────────
const enableSLBill = async (req, res) => {
    try {
        const { billId } = req.params;
        const bill = await SLBill.findByPk(billId);
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
        if (bill.isActive === 1) return res.status(400).json({ success: false, message: 'Bill is already enabled' });

        bill.isActive = 1;
        await bill.save();

        return res.status(200).json({
            success: true, message: 'Bill enabled successfully',
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
    editSLBill,
    disableSLBill,
    enableSLBill,
};
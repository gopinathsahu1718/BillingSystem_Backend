import { Admin } from '../Admin.model.js'
import { SLCart } from './SLCart.model.js';
import { SLBill, SLBillItem } from './SLBill.model.js';

// SL Cart associations
Admin.hasMany(SLCart, {
    foreignKey: 'adminId',
    as: 'slCartItems',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

SLCart.belongsTo(Admin, {
    foreignKey: 'adminId',
    as: 'admin',
});

// SL Bill associations
Admin.hasMany(SLBill, {
    foreignKey: 'createdBy',
    as: 'slBills',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});

SLBill.belongsTo(Admin, {
    foreignKey: 'createdBy',
    as: 'creator',
});

SLBill.hasMany(SLBillItem, {
    foreignKey: 'billId',
    as: 'items',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

SLBillItem.belongsTo(SLBill, {
    foreignKey: 'billId',
    as: 'bill',
});

export { Admin, SLCart, SLBill, SLBillItem };
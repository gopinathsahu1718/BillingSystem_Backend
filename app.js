import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { connectToDatabase } from './Database/Database.js';

// Import routers
import adminRouter from './Router/Admin.router.js';
import storeRouter from './Router/Store.router.js';
import cartRouter from './Router/Cart.router.js';
import billRouter from './Router/Bill.router.js';
import productAttributeRouter from './Router/ProductAttribute.router.js';
import storeProfileRouter from './Router/StoreProfile.router.js';


// SL
import slCartRouter from './Router/SL/SLCart.router.js'
import slBillRouter from './Router/SL/SLBill.router.js';

dotenv.config();

const app = express();

// CORS configuration
app.use(
    cors({
        credentials: true,
        origin: [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'supersecret',
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000,
        },
    })
);

// JSON parsing for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve uploaded files
app.use('/uploads', express.static('uploads'));

// Connect to database
connectToDatabase();

// Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Inventory Management System API',
        version: '1.0.0',
        features: [
            'Admin Authentication',
            'Store Management (Categories, SubCategories, Products)',
            'Product Attributes/Variants',
            'Shopping Cart',
            'Billing System with GST',
            'Dashboard Analytics',
            'Store Profiles (Laxmi & Swasthik)',
        ],
    });
});

// API Routes
app.use('/api/admin', adminRouter);
app.use('/api/store', storeRouter);
app.use('/api', cartRouter);
app.use('/api', billRouter);
app.use('/api', productAttributeRouter);
app.use('/api/store', storeProfileRouter);




// SL Routes
app.use('/api', slCartRouter);
app.use('/api', slBillRouter);



// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

export default app;
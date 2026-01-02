import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import { connectToDatabase } from './Database/Database.js';
import adminRouter from './Router/Admin.router.js';
import storeRouter from './Router/Store.router.js';

const app = express();
dotenv.config();

app.use(
    cors({
        credentials: true,
        origin: [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'https://www.hearingzen.in',
            'https://hearingzen.in',
            'https://console.hearingzen.in',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

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

// Connect to database
connectToDatabase();

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/store', storeRouter);

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('Admin Authentication Backend - MySQL Version with Store Management');
});

export default app;
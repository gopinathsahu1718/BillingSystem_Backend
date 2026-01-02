import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Database configuration
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            timestamps: true,
            underscored: false,
            freezeTableName: true,
        },
        timezone: '+05:30', // IST timezone
    }
);

// Test connection
const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Database connection established successfully.');

        // Sync models with database (use { force: true } to drop tables - CAUTION!)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }
};

export { sequelize, connectToDatabase };
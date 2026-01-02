import { sequelize } from '../Database/Database.js';
import { Admin } from '../Model/Admin.model.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const syncDatabase = async () => {
    try {
        console.log('🔄 Starting database synchronization...');

        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync all models (alter: true will update tables without dropping them)
        // Use { force: true } to drop and recreate tables (⚠️ CAUTION: This will delete all data)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized successfully');

        // Optional: Create a default admin
        const createDefaultAdmin = process.argv.includes('--create-admin');

        if (createDefaultAdmin) {
            const existingAdmin = await Admin.findOne();

            if (!existingAdmin) {
                const defaultEmail = 'admin@example.com';
                const hashedPassword = await bcrypt.hash('Admin@123', 10);
                await Admin.create({
                    username: 'Admin',
                    contact: '9876543210',
                    email: defaultEmail,
                    password: hashedPassword,
                    role: 'admin',
                    isVerified: true,
                });
                console.log('✅ Default admin created:');
                console.log('   Email: admin@example.com');
                console.log('   Password: Admin@123');
                console.log('   ⚠️  Please change the password after first login!');
            } else {
                console.log('ℹ️  Admin already exists');
            }
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log('\nTo create a default admin, run:');
        console.log('npm run db:sync -- --create-admin\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Database synchronization failed:', error);
        process.exit(1);
    }
};

syncDatabase();
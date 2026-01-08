import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateDatabase() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to MySQL Database');

        // Check if points column exists in users table
        console.log('\n🔍 Checking users table structure...');
        const [usersColumns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'points'`,
            [process.env.DB_NAME]
        );

        if (usersColumns.length === 0) {
            console.log('⚠️  Points column not found in users table. Adding it...');
            await connection.query(
                `ALTER TABLE users ADD COLUMN points INT DEFAULT 0 AFTER user_id`
            );
            console.log('✅ Added points column to users table');
        } else {
            console.log('✅ Points column already exists in users table');
        }

        // Check if confirmation_token column exists in lead_requests table
        console.log('\n🔍 Checking lead_requests table structure...');
        const [tokenColumns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lead_requests' AND COLUMN_NAME = 'confirmation_token'`,
            [process.env.DB_NAME]
        );

        if (tokenColumns.length === 0) {
            console.log('⚠️  confirmation_token column not found. Adding it...');
            await connection.query(
                `ALTER TABLE lead_requests ADD COLUMN confirmation_token VARCHAR(255) UNIQUE AFTER confirmed`
            );
            console.log('✅ Added confirmation_token column to lead_requests table');
        } else {
            console.log('✅ confirmation_token column already exists');
        }

        // Show final table structures
        console.log('\n📊 Final users table structure:');
        const [usersStructure] = await connection.query('DESCRIBE users');
        console.table(usersStructure);

        console.log('\n📊 Final lead_requests table structure:');
        const [leadRequestsStructure] = await connection.query('DESCRIBE lead_requests');
        console.table(leadRequestsStructure);

        // Check if area column exists in listings table
        console.log('\n🔍 Checking listings table structure...');
        const [areaColumns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'area'`,
            [process.env.DB_NAME]
        );

        if (areaColumns.length === 0) {
            console.log('⚠️  area column not found in listings table. Adding it...');
            await connection.query(
                `ALTER TABLE listings ADD COLUMN area VARCHAR(100) AFTER city`
            );
            console.log('✅ Added area column to listings table');
            
            // Update area based on city for existing listings
            console.log('📝 Updating area values based on city...');
            await connection.query(
                `UPDATE listings SET area = city WHERE area IS NULL OR area = ''`
            );
            console.log('✅ Updated area values');
        } else {
            console.log('✅ area column already exists in listings table');
        }

        // Check if available column exists in listings table
        const [availableColumns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'available'`,
            [process.env.DB_NAME]
        );

        if (availableColumns.length === 0) {
            console.log('⚠️  available column not found in listings table. Adding it...');
            await connection.query(
                `ALTER TABLE listings ADD COLUMN available BOOLEAN DEFAULT TRUE AFTER available_from`
            );
            console.log('✅ Added available column to listings table');
        } else {
            console.log('✅ available column already exists in listings table');
        }

        // Create user_payments table if it doesn't exist
        console.log('\n🔍 Checking if user_payments table exists...');
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_payments'`,
            [process.env.DB_NAME]
        );

        if (tables.length === 0) {
            console.log('⚠️  user_payments table not found. Creating it...');
            await connection.query(`
                CREATE TABLE user_payments (
                    payment_id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    area VARCHAR(255) NOT NULL,
                    user_latitude DECIMAL(10, 6),
                    user_longitude DECIMAL(10, 6),
                    houses_to_view INT NOT NULL,
                    amount_paid DECIMAL(10, 2) NOT NULL,
                    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_status VARCHAR(50) DEFAULT 'completed',
                    houses_viewed INT DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    INDEX idx_user_area (user_id, area)
                )
            `);
            console.log('✅ Created user_payments table');
        } else {
            console.log('✅ user_payments table already exists');
        }

        console.log('\n📊 Final user_payments table structure:');
        const [paymentsStructure] = await connection.query('DESCRIBE user_payments');
        console.table(paymentsStructure);

        console.log('\n✅ Database update completed successfully!');
        console.log('You can now test the email confirmation and payment system.');

    } catch (error) {
        console.error('❌ Error updating database:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateDatabase();

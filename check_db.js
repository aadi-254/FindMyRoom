const mysql = require('mysql2/promise');

async function checkAndCreateTable() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Aditya.254',
        database: 'findmyroom'
    });

    try {
        // Check if table exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'user_accessible_houses'");
        
        if (tables.length === 0) {
            console.log('❌ TABLE user_accessible_houses DOES NOT EXIST!');
            console.log('📝 Creating table...');
            
            await pool.query(`
                CREATE TABLE user_accessible_houses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    payment_id INT NOT NULL,
                    user_id INT NOT NULL,
                    listing_id INT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (payment_id) REFERENCES user_payments(payment_id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
                    UNIQUE KEY unique_payment_listing (payment_id, listing_id),
                    INDEX idx_user_payment (user_id, payment_id)
                )
            `);
            
            console.log('✅ TABLE CREATED SUCCESSFULLY!');
        } else {
            console.log('✅ Table user_accessible_houses exists');
            
            // Check row count
            const [result] = await pool.query('SELECT COUNT(*) as count FROM user_accessible_houses');
            console.log('📊 Table has', result[0].count, 'rows');
            
            // Show sample data if any
            if (result[0].count > 0) {
                const [rows] = await pool.query(`
                    SELECT uah.*, l.room_type, l.rent 
                    FROM user_accessible_houses uah 
                    JOIN listings l ON uah.listing_id = l.listing_id 
                    LIMIT 5
                `);
                console.log('📋 Sample rows:', rows);
            }
        }
        
        // Check if plan_expires_at column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM user_payments LIKE 'plan_expires_at'");
        if (columns.length === 0) {
            console.log('❌ Missing plan_expires_at column in user_payments');
            console.log('📝 Adding columns...');
            await pool.query('ALTER TABLE user_payments ADD COLUMN plan_expires_at DATETIME AFTER payment_date');
            await pool.query('ALTER TABLE user_payments ADD COLUMN plan_active BOOLEAN DEFAULT TRUE AFTER plan_expires_at');
            console.log('✅ Columns added!');
        } else {
            console.log('✅ user_payments table has required columns');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkAndCreateTable();

import mysql from 'mysql2/promise';

async function addLocationColumns() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Aditya.254',
            database: 'findmyroom'
        });

        console.log('✅ Connected to MySQL Database');

        // Add user_latitude and user_longitude columns
        console.log('\n📍 Adding location columns to user_payments table...');
        
        try {
            await connection.query(`
                ALTER TABLE user_payments 
                ADD COLUMN user_latitude DECIMAL(10, 6),
                ADD COLUMN user_longitude DECIMAL(10, 6)
            `);
            console.log('✅ Location columns added successfully!');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('✅ Location columns already exist!');
            } else {
                throw err;
            }
        }

        // Verify the structure
        const [columns] = await connection.query('DESCRIBE user_payments');
        console.log('\n📊 Updated table structure:');
        console.table(columns);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

addLocationColumns();

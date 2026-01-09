import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Payments route is working!' });
});

// Pricing table based on houses to view
const PRICING_TABLE = {
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    5: 40,
    6: 48,
    7: 56,
    8: 64,
    9: 72,
    10: 80,
    15: 120,
    20: 160,
    25: 200,
    30: 240,
    35: 280,
    40: 320,
    45: 360,
    50: 400
};

// Helper function to calculate price
function calculatePrice(housesToView) {
    // Find exact match or calculate based on ₹8 per house
    if (PRICING_TABLE[housesToView]) {
        return PRICING_TABLE[housesToView];
    }
    // For values not in table, calculate proportionally
    return housesToView * 8;
}

// Helper function to calculate plan expiry days
// Formula: days = (houses/5) * 4 - 1
// 5 houses = 3 days, 10 houses = 7 days, 15 houses = 11 days, 20 houses = 17 days
function calculateExpiryDays(housesToView) {
    return Math.floor((housesToView / 5) * 4) - 1;
}

// Helper function to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get pricing table
router.get('/pricing', (req, res) => {
    res.json({
        success: true,
        pricing: PRICING_TABLE
    });
});

// Get available houses count in an area with filters
router.get('/available-houses', async (req, res) => {
    try {
        const { area, propertyType, minPrice, maxPrice, latitude, longitude } = req.query;

        if (!area) {
            return res.status(400).json({
                success: false,
                message: 'Area is required'
            });
        }

        // Build query with filters
        let query = 'SELECT COUNT(*) as count FROM listings WHERE city = ?';
        let params = [area];

        if (propertyType && propertyType !== 'all') {
            query += ' AND room_type = ?';
            params.push(propertyType);
        }

        if (minPrice) {
            query += ' AND rent >= ?';
            params.push(parseInt(minPrice));
        }

        if (maxPrice) {
            query += ' AND rent <= ?';
            params.push(parseInt(maxPrice));
        }

        const [result] = await pool.query(query, params);

        res.json({
            success: true,
            area,
            availableHouses: result[0].count,
            filters: { propertyType, minPrice, maxPrice }
        });
    } catch (error) {
        console.error('Error getting available houses:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get all unique areas
router.get('/areas', async (req, res) => {
    try {
        console.log('📍 Fetching areas from listings...');
        const [areas] = await pool.query(
            'SELECT DISTINCT city as area FROM listings ORDER BY city'
        );
        
        console.log('Found areas:', areas);

        res.json({
            success: true,
            areas: areas.map(row => row.area)
        });
    } catch (error) {
        console.error('❌ Error getting areas:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Check if user has access to view houses in an area
router.get('/check-access', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user?.user_id;
        const { area } = req.query;

        if (!userId) {
            return res.json({
                success: true,
                hasAccess: false,
                message: 'Please login to continue'
            });
        }

        if (!area) {
            return res.status(400).json({
                success: false,
                message: 'Area is required'
            });
        }

        // Check if user has any active payment for this area that hasn't expired
        const [payments] = await pool.query(
            `SELECT payment_id, houses_to_view, houses_viewed, amount_paid, payment_date, 
                    plan_expires_at, plan_active
             FROM user_payments 
             WHERE user_id = ? AND area = ? AND payment_status = 'completed'
             AND plan_active = TRUE AND plan_expires_at > NOW()
             ORDER BY payment_date DESC 
             LIMIT 1`,
            [userId, area]
        );

        if (payments.length > 0) {
            const payment = payments[0];
            
            // Get count of accessible houses for this payment
            const [houseCount] = await pool.query(
                'SELECT COUNT(*) as count FROM user_accessible_houses WHERE payment_id = ?',
                [payment.payment_id]
            );

            res.json({
                success: true,
                hasAccess: true,
                payment: {
                    paymentId: payment.payment_id,
                    housesToView: payment.houses_to_view,
                    housesViewed: payment.houses_viewed,
                    accessibleHouses: houseCount[0].count,
                    remaining: payment.houses_to_view - payment.houses_viewed,
                    amountPaid: payment.amount_paid,
                    paymentDate: payment.payment_date,
                    expiresAt: payment.plan_expires_at,
                    daysRemaining: Math.ceil((new Date(payment.plan_expires_at) - new Date()) / (1000 * 60 * 60 * 24))
                }
            });
        } else {
            res.json({
                success: true,
                hasAccess: false
            });
        }
    } catch (error) {
        console.error('Error checking access:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Process payment (dummy)
router.post('/process-payment', async (req, res) => {
    try {
        console.log('💳 Processing payment request:', req.body);
        
        const { area, housesToView, user_id, propertyType, minPrice, maxPrice } = req.body;
        const userId = user_id || req.user?.user_id;

        console.log('User ID:', userId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to continue'
            });
        }

        if (!area || !housesToView) {
            return res.status(400).json({
                success: false,
                message: 'Area and houses to view are required'
            });
        }

        // Get user location from request
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'User location is required to find closest houses'
            });
        }

        console.log('Payment details:', { userId, area, housesToView, latitude, longitude });

        // Calculate amount and expiry
        const amount = calculatePrice(housesToView);
        const expiryDays = calculateExpiryDays(housesToView);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        
        console.log(`Plan expires in ${expiryDays} days:`, expiryDate);

        // Build query to get closest N houses based on filters
        let housesQuery = `
            SELECT listing_id, title, rent, city, room_type, latitude, longitude,
                   SQRT(POW(69.1 * (latitude - ?), 2) + 
                        POW(69.1 * (? - longitude) * COS(latitude / 57.3), 2)) AS distance
            FROM listings 
            WHERE city = ?
        `;
        let housesParams = [latitude, longitude, area];

        console.log('🔍 Filtering houses with:', { propertyType, minPrice, maxPrice });

        if (propertyType && propertyType !== 'all') {
            housesQuery += ' AND room_type = ?';
            housesParams.push(propertyType);
            console.log('  ✓ Filter: room_type =', propertyType);
        }

        if (minPrice) {
            housesQuery += ' AND rent >= ?';
            housesParams.push(parseInt(minPrice));
        }

        if (maxPrice) {
            housesQuery += ' AND rent <= ?';
            housesParams.push(parseInt(maxPrice));
        }

        housesQuery += ' ORDER BY distance LIMIT ?';
        housesParams.push(parseInt(housesToView));

        console.log('🔎 Executing query:', housesQuery);
        console.log('📊 Query params:', housesParams);

        // Get the closest N houses
        const [closestHouses] = await pool.query(housesQuery, housesParams);

        console.log(`✅ Found ${closestHouses.length} closest houses`);
        if (closestHouses.length > 0) {
            console.log('📝 Sample houses:', closestHouses.slice(0, 3).map(h => ({
                id: h.listing_id,
                type: h.room_type,
                rent: h.rent,
                distance: h.distance?.toFixed(2) + 'km'
            })));
        }

        if (closestHouses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No houses found matching your criteria in this area'
            });
        }

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert payment record with user location and expiry
            const [result] = await connection.query(
                `INSERT INTO user_payments 
                (user_id, area, houses_to_view, amount_paid, payment_status, 
                 user_latitude, user_longitude, plan_expires_at, plan_active)
                VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, TRUE)`,
                [userId, area, housesToView, amount, latitude, longitude, expiryDate]
            );
            
            const paymentId = result.insertId;
            console.log('✅ Payment recorded successfully, ID:', paymentId);

            // Insert accessible houses for this payment
            const accessibleHousesValues = closestHouses.map(house => 
                [paymentId, userId, house.listing_id]
            );
            
            console.log('📥 Inserting accessible houses:', accessibleHousesValues.length, 'rows');
            
            if (accessibleHousesValues.length > 0) {
                const [insertResult] = await connection.query(
                    'INSERT INTO user_accessible_houses (payment_id, user_id, listing_id) VALUES ?',
                    [accessibleHousesValues]
                );
                console.log(`✅ Inserted ${insertResult.affectedRows} accessible houses into database`);
                
                // Verify insertion
                const [verifyRows] = await connection.query(
                    'SELECT COUNT(*) as count FROM user_accessible_houses WHERE payment_id = ?',
                    [paymentId]
                );
                console.log(`✅ Verification: ${verifyRows[0].count} houses in database for payment ${paymentId}`);
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Payment processed successfully',
                payment: {
                    paymentId,
                    area,
                    housesToView,
                    accessibleHouses: closestHouses.length,
                    amount,
                    status: 'completed',
                    expiresAt: expiryDate,
                    expiryDays
                }
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
        res.status(500).json({
            success: false,
            message: 'Payment processing failed',
            error: error.message
        });
    }
});

// Get user's payment history
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user?.user_id;

        if (!userId) {
            return res.json({
                success: true,
                payments: []
            });
        }

        const [payments] = await pool.query(
            `SELECT payment_id, area, houses_to_view, houses_viewed, amount_paid, 
                    payment_date, payment_status, plan_expires_at, plan_active,
                    CASE 
                        WHEN plan_expires_at > NOW() AND plan_active = TRUE THEN 'active'
                        WHEN plan_expires_at <= NOW() THEN 'expired'
                        ELSE 'inactive'
                    END as status
             FROM user_payments
             WHERE user_id = ?
             ORDER BY payment_date DESC`,
            [userId]
        );

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get accessible houses for user's active plan
router.get('/accessible-houses', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user?.user_id;
        const { area } = req.query;

        console.log('🏠 Accessible houses request:', { userId, area });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to continue'
            });
        }

        // Get active payment for the area
        const [payments] = await pool.query(
            `SELECT payment_id FROM user_payments 
             WHERE user_id = ? AND area = ? AND plan_active = TRUE 
             AND plan_expires_at > NOW() AND payment_status = 'completed'
             ORDER BY payment_date DESC LIMIT 1`,
            [userId, area]
        );

        console.log('📊 Found payments:', payments.length);

        if (payments.length === 0) {
            console.log('❌ No active plan found');
            return res.json({
                success: false,
                message: 'No active plan found for this area'
            });
        }

        const paymentId = payments[0].payment_id;
        console.log('✅ Using payment ID:', paymentId);

        // Get accessible houses with full details
        const [houses] = await pool.query(
            `SELECT l.* 
             FROM listings l
             INNER JOIN user_accessible_houses uah ON l.listing_id = uah.listing_id
             WHERE uah.payment_id = ? AND uah.user_id = ?
             ORDER BY l.listing_id`,
            [paymentId, userId]
        );

        console.log('✅ Found accessible houses:', houses.length);
        if (houses.length > 0) {
            console.log('📋 Sample houses:', houses.slice(0, 3).map(h => ({
                id: h.listing_id,
                type: h.room_type,
                rent: h.rent
            })));
        }

        res.json({
            success: true,
            houses
        });
    } catch (error) {
        console.error('❌ Error getting accessible houses:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Increment houses viewed count (called when user views a house detail)
router.post('/increment-viewed', async (req, res) => {
    try {
        const { area, listing_id, user_id } = req.body;
        const userId = user_id || req.user?.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to continue'
            });
        }

        // Get the most recent active payment for this area
        const [payments] = await pool.query(
            `SELECT payment_id, houses_to_view, houses_viewed
             FROM user_payments
             WHERE user_id = ? AND area = ? AND payment_status = 'completed'
             AND plan_active = TRUE AND plan_expires_at > NOW()
             ORDER BY payment_date DESC
             LIMIT 1`,
            [userId, area]
        );

        if (payments.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No active plan found for this area or plan has expired'
            });
        }

        const paymentId = payments[0].payment_id;

        // Check if this house is in user's accessible list
        if (listing_id) {
            const [accessible] = await pool.query(
                'SELECT id FROM user_accessible_houses WHERE payment_id = ? AND listing_id = ?',
                [paymentId, listing_id]
            );

            if (accessible.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'This house is not in your accessible list'
                });
            }
        }

        // Increment houses_viewed if not already reached limit
        if (payments[0].houses_viewed < payments[0].houses_to_view) {
            await pool.query(
                'UPDATE user_payments SET houses_viewed = houses_viewed + 1 WHERE payment_id = ?',
                [paymentId]
            );
        }

        res.json({
            success: true,
            message: 'View count updated'
        });
    } catch (error) {
        console.error('Error incrementing view count:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Deactivate expired plans (can be called periodically or on-demand)
router.post('/deactivate-expired', async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE user_payments 
             SET plan_active = FALSE 
             WHERE plan_expires_at <= NOW() AND plan_active = TRUE`
        );

        res.json({
            success: true,
            message: `Deactivated ${result.affectedRows} expired plans`
        });
    } catch (error) {
        console.error('Error deactivating expired plans:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;

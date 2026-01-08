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

// Get pricing table
router.get('/pricing', (req, res) => {
    res.json({
        success: true,
        pricing: PRICING_TABLE
    });
});

// Get available houses count in an area
router.get('/available-houses', async (req, res) => {
    try {
        const { area } = req.query;

        if (!area) {
            return res.status(400).json({
                success: false,
                message: 'Area is required'
            });
        }

        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM listings WHERE city = ?',
            [area]
        );

        res.json({
            success: true,
            area,
            availableHouses: result[0].count
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

        // Check if user has any active payment for this area
        const [payments] = await pool.query(
            `SELECT payment_id, houses_to_view, houses_viewed, amount_paid, payment_date 
             FROM user_payments 
             WHERE user_id = ? AND area = ? AND payment_status = 'completed'
             AND houses_viewed < houses_to_view
             ORDER BY payment_date DESC 
             LIMIT 1`,
            [userId, area]
        );

        if (payments.length > 0) {
            const payment = payments[0];
            res.json({
                success: true,
                hasAccess: true,
                payment: {
                    housesToView: payment.houses_to_view,
                    housesViewed: payment.houses_viewed,
                    remaining: payment.houses_to_view - payment.houses_viewed,
                    amountPaid: payment.amount_paid,
                    paymentDate: payment.payment_date
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
        
        const { area, housesToView, user_id } = req.body;
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
        
        console.log('Payment details:', { userId, area, housesToView, latitude, longitude });

        // Calculate amount
        const amount = calculatePrice(housesToView);
        
        console.log('Calculated amount:', amount);

        // Insert payment record with user location
        const [result] = await pool.query(
            `INSERT INTO user_payments (user_id, area, houses_to_view, amount_paid, payment_status, user_latitude, user_longitude)
             VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
            [userId, area, housesToView, amount, latitude || null, longitude || null]
        );
        
        console.log('✅ Payment recorded successfully, ID:', result.insertId);

        res.json({
            success: true,
            message: 'Payment processed successfully',
            payment: {
                paymentId: result.insertId,
                area,
                housesToView,
                amount,
                status: 'completed'
            }
        });
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
                    payment_date, payment_status
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

// Increment houses viewed count (called when user views a house detail)
router.post('/increment-viewed', async (req, res) => {
    try {
        const { area, user_id } = req.body;
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
             AND houses_viewed < houses_to_view
             ORDER BY payment_date DESC
             LIMIT 1`,
            [userId, area]
        );

        if (payments.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No active payment found for this area'
            });
        }

        // Increment houses_viewed
        await pool.query(
            'UPDATE user_payments SET houses_viewed = houses_viewed + 1 WHERE payment_id = ?',
            [payments[0].payment_id]
        );

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

export default router;

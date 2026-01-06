import express from 'express';
import db from '../config/database.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Test route to verify the router is loaded
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Lead requests route is working!' });
});

// Test email configuration
router.get('/test-email', (req, res) => {
    const hasEmailUser = !!process.env.EMAIL_USER;
    const hasEmailPassword = !!process.env.EMAIL_PASSWORD;
    
    res.json({
        success: true,
        emailConfigured: hasEmailUser && hasEmailPassword,
        emailUser: hasEmailUser ? process.env.EMAIL_USER : 'Not configured',
        emailPasswordSet: hasEmailPassword ? 'Yes' : 'No'
    });
});

// Function to get email transporter
const getEmailTransporter = () => {
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
        return null;
    } catch (error) {
        console.log('❌ Email configuration error:', error.message);
        return null;
    }
};

// Submit a lead request
router.post('/submit', async (req, res) => {
    console.log('📝 Lead request received');
    try {
        const {
            requesterId,
            requesterName,
            ownerName,
            ownerPhone,
            ownerEmail,
            propertyAddress,
            city,
            roomType,
            expectedRent,
            additionalDetails
        } = req.body;

        console.log('Owner Email:', ownerEmail);

        // Validate required fields
        if (!requesterId || !requesterName || !ownerName || !ownerPhone || !propertyAddress || !city) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields' 
            });
        }

        // Get coordinates for the address (using a geocoding service)
        // For now, we'll set them as NULL and can be updated later
        const latitude = null;
        const longitude = null;

        // Insert lead request into database
        const [result] = await db.query(
            `INSERT INTO lead_requests 
            (requester_id, requester_name, owner_name, owner_phone, owner_email, 
            property_address, city, room_type, expected_rent, latitude, longitude, 
            additional_details, confirmed, points_awarded, reward_points) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, 0)`,
            [requesterId, requesterName, ownerName, ownerPhone, ownerEmail, 
             propertyAddress, city, roomType, expectedRent, latitude, longitude, 
             additionalDetails]
        );

        // Send confirmation email to the property owner (if email provided)
        if (ownerEmail) {
            console.log('🔍 Attempting to send email to:', ownerEmail);
            const transporter = getEmailTransporter();
            
            if (transporter) {
                console.log('✅ Email transporter created successfully');
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: ownerEmail,
                        subject: 'FindMyRoom - Property Listing Request',
                        html: `
                            <h2>Property Listing Request</h2>
                            <p>Hello ${ownerName},</p>
                            <p>We have received information about your property at:</p>
                            <p><strong>Address:</strong> ${propertyAddress}, ${city}</p>
                            <p><strong>Suggested by:</strong> ${requesterName}</p>
                            <p>If you would like to list this property on FindMyRoom, please click the link below:</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-listing/${result.insertId}">Confirm Listing</a>
                            <p>Thank you!</p>
                        `
                    };

                    console.log('📧 Sending email...');
                    await transporter.sendMail(mailOptions);
                    console.log(`✉️ Email sent successfully to ${ownerEmail}`);
                } catch (emailError) {
                    console.error('❌ Email sending failed:');
                    console.error('Error message:', emailError.message);
                    console.error('Error code:', emailError.code);
                    console.error('Full error:', emailError);
                    // Don't fail the request if email fails
                }
            } else {
                console.log('⚠️ Email not sent: Email credentials not configured in .env file');
                console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
                console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');
            }
        } else {
            console.log('ℹ️ No owner email provided, skipping email');
        }

        res.status(201).json({ 
            success: true, 
            message: 'Lead request submitted successfully! We will verify and notify you.',
            leadRequestId: result.insertId
        });

    } catch (error) {
        console.error('Error submitting lead request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit lead request' 
        });
    }
});

// Get all lead requests (admin/owner view)
router.get('/all', async (req, res) => {
    try {
        const [leadRequests] = await db.query(
            `SELECT lr.*, u.email as requester_email 
             FROM lead_requests lr
             JOIN users u ON lr.requester_id = u.user_id
             ORDER BY lr.created_at DESC`
        );

        res.json({ success: true, leadRequests });
    } catch (error) {
        console.error('Error fetching lead requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch lead requests' 
        });
    }
});

// Get user's lead requests
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [leadRequests] = await db.query(
            `SELECT * FROM lead_requests 
             WHERE requester_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({ success: true, leadRequests });
    } catch (error) {
        console.error('Error fetching user lead requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch lead requests' 
        });
    }
});

// Confirm a lead request and award points
router.post('/confirm/:leadRequestId', async (req, res) => {
    try {
        const { leadRequestId } = req.params;
        const { listingId, rewardPoints = 50 } = req.body; // Default 50 points

        // Start transaction
        await db.query('START TRANSACTION');

        // Update lead request
        await db.query(
            `UPDATE lead_requests 
             SET confirmed = TRUE, listing_id = ?, points_awarded = TRUE, reward_points = ?
             WHERE lead_request_id = ?`,
            [listingId, rewardPoints, leadRequestId]
        );

        // Get requester info
        const [leadRequest] = await db.query(
            `SELECT requester_id, requester_name FROM lead_requests 
             WHERE lead_request_id = ?`,
            [leadRequestId]
        );

        if (leadRequest.length > 0) {
            // Award points to the requester
            await db.query(
                `UPDATE users 
                 SET points = points + ?
                 WHERE user_id = ?`,
                [rewardPoints, leadRequest[0].requester_id]
            );

            // Get updated user points
            const [user] = await db.query(
                `SELECT points FROM users WHERE user_id = ?`,
                [leadRequest[0].requester_id]
            );

            await db.query('COMMIT');

            res.json({ 
                success: true, 
                message: `Lead confirmed! ${rewardPoints} points awarded to ${leadRequest[0].requester_name}`,
                newPoints: user[0].points
            });
        } else {
            await db.query('ROLLBACK');
            res.status(404).json({ 
                success: false, 
                message: 'Lead request not found' 
            });
        }

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error confirming lead request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to confirm lead request' 
        });
    }
});

// Reject a lead request
router.post('/reject/:leadRequestId', async (req, res) => {
    try {
        const { leadRequestId } = req.params;

        await db.query(
            `UPDATE lead_requests 
             SET confirmed = FALSE
             WHERE lead_request_id = ?`,
            [leadRequestId]
        );

        res.json({ 
            success: true, 
            message: 'Lead request rejected' 
        });

    } catch (error) {
        console.error('Error rejecting lead request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reject lead request' 
        });
    }
});

// Get geocoding coordinates for an address (optional helper endpoint)
router.post('/geocode', async (req, res) => {
    try {
        const { address } = req.body;
        
        // You can integrate with Google Maps API, OpenStreetMap, or other geocoding services
        // For now, returning a placeholder
        
        res.json({ 
            success: true, 
            message: 'Geocoding service to be integrated',
            coordinates: { latitude: null, longitude: null }
        });

    } catch (error) {
        console.error('Error geocoding address:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to geocode address' 
        });
    }
});

export default router;

import express from 'express';
import db from '../config/database.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

        // Generate unique confirmation token
        const confirmationToken = crypto.randomBytes(32).toString('hex');

        // Insert lead request into database
        const [result] = await db.query(
            `INSERT INTO lead_requests 
            (requester_id, requester_name, owner_name, owner_phone, owner_email, 
            property_address, city, room_type, expected_rent, latitude, longitude, 
            additional_details, confirmed, confirmation_token, points_awarded, reward_points) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, FALSE, 0)`,
            [requesterId, requesterName, ownerName, ownerPhone, ownerEmail, 
             propertyAddress, city, roomType, expectedRent, latitude, longitude, 
             additionalDetails, confirmationToken]
        );

        // Send confirmation email to the property owner (if email provided)
        if (ownerEmail) {
            console.log('🔍 Attempting to send email to:', ownerEmail);
            const transporter = getEmailTransporter();
            
            if (transporter) {
                console.log('✅ Email transporter created successfully');
                try {
                    const confirmUrl = `http://localhost:5000/api/lead-requests/confirm-token/${confirmationToken}`;
                    const rejectUrl = `http://localhost:5000/api/lead-requests/reject-token/${confirmationToken}`;
                    
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: ownerEmail,
                        subject: 'FindMyRoom - Property Listing Request',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                                <h2 style="color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px;">🏠 Property Listing Request</h2>
                                
                                <p style="font-size: 16px; color: #555;">Hello <strong>${ownerName}</strong>,</p>
                                
                                <p style="font-size: 16px; color: #555;">Great news! Someone is interested in helping you list your property on <strong>FindMyRoom</strong>.</p>
                                
                                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <h3 style="color: #4CAF50; margin-top: 0;">📍 Property Details:</h3>
                                    <p style="margin: 10px 0;"><strong>Address:</strong> ${propertyAddress}, ${city}</p>
                                    <p style="margin: 10px 0;"><strong>Room Type:</strong> ${roomType || 'Not specified'}</p>
                                    <p style="margin: 10px 0;"><strong>Expected Rent:</strong> ₹${expectedRent || 'Not specified'}</p>
                                    <p style="margin: 10px 0;"><strong>Suggested by:</strong> ${requesterName}</p>
                                    ${additionalDetails ? `<p style="margin: 10px 0;"><strong>Additional Details:</strong> ${additionalDetails}</p>` : ''}
                                </div>
                                
                                <p style="font-size: 16px; color: #555; margin: 30px 0 20px 0;"><strong>Would you like to list this property on FindMyRoom?</strong></p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${confirmUrl}" style="display: inline-block; padding: 15px 40px; margin: 10px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">✅ YES, List My Property</a>
                                    
                                    <a href="${rejectUrl}" style="display: inline-block; padding: 15px 40px; margin: 10px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">❌ NO, Not Interested</a>
                                </div>
                                
                                <p style="font-size: 14px; color: #777; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                                    <em>This is an automated email. If you did not expect this message, please ignore it.</em><br>
                                    <strong>FindMyRoom</strong> - Your trusted platform for finding the perfect accommodation
                                </p>
                            </div>
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

// Confirm lead request via email token (YES button)
router.get('/confirm-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const rewardPoints = 50; // Default reward points

        // Find lead request by token
        const [leadRequests] = await db.query(
            `SELECT * FROM lead_requests WHERE confirmation_token = ?`,
            [token]
        );

        if (leadRequests.length === 0) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid Link</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { color: #f44336; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Invalid Link</h1>
                        <p>This confirmation link is invalid or has expired.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const leadRequest = leadRequests[0];

        // Check if already confirmed
        if (leadRequest.confirmed) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Already Confirmed</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { color: #FF9800; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>ℹ️ Already Confirmed</h1>
                        <p>This property listing request has already been confirmed.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Start transaction
        await db.query('START TRANSACTION');

        // Update lead request
        await db.query(
            `UPDATE lead_requests 
             SET confirmed = TRUE, points_awarded = TRUE, reward_points = ?
             WHERE confirmation_token = ?`,
            [rewardPoints, token]
        );

        // Award points to the requester
        await db.query(
            `UPDATE users 
             SET points = points + ?
             WHERE user_id = ?`,
            [rewardPoints, leadRequest.requester_id]
        );

        // Get updated user points
        const [user] = await db.query(
            `SELECT points, full_name FROM users WHERE user_id = ?`,
            [leadRequest.requester_id]
        );

        await db.query('COMMIT');

        // Send success page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Property Confirmed!</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container { 
                        background: white; 
                        padding: 40px; 
                        border-radius: 15px; 
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
                        max-width: 600px; 
                        margin: 0 auto; 
                    }
                    h1 { color: #4CAF50; margin-bottom: 20px; }
                    .success-icon { font-size: 80px; margin: 20px 0; }
                    .details { 
                        background: #f0f8ff; 
                        padding: 20px; 
                        border-radius: 8px; 
                        margin: 20px 0; 
                        text-align: left;
                    }
                    .details p { margin: 10px 0; color: #555; }
                    .points-badge { 
                        background: #4CAF50; 
                        color: white; 
                        padding: 10px 20px; 
                        border-radius: 20px; 
                        display: inline-block; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">🎉</div>
                    <h1>Thank You for Confirming!</h1>
                    <p style="font-size: 18px; color: #666;">Your property listing request has been successfully confirmed.</p>
                    
                    <div class="details">
                        <p><strong>🏠 Property:</strong> ${leadRequest.property_address}, ${leadRequest.city}</p>
                        <p><strong>👤 Suggested by:</strong> ${leadRequest.requester_name}</p>
                    </div>
                    
                    <p style="margin: 30px 0; font-size: 16px; color: #555;">
                        <strong>${leadRequest.requester_name}</strong> has been awarded:
                    </p>
                    <div class="points-badge">
                        ⭐ +${rewardPoints} Reward Points
                    </div>
                    
                    <p style="margin-top: 30px; color: #888; font-size: 14px;">
                        We'll be in touch soon with next steps for listing your property on FindMyRoom.
                    </p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error confirming lead request:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                    .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    h1 { color: #f44336; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error</h1>
                    <p>An error occurred while processing your confirmation. Please try again later.</p>
                </div>
            </body>
            </html>
        `);
    }
});

// Reject lead request via email token (NO button)
router.get('/reject-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find lead request by token
        const [leadRequests] = await db.query(
            `SELECT * FROM lead_requests WHERE confirmation_token = ?`,
            [token]
        );

        if (leadRequests.length === 0) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid Link</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { color: #f44336; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Invalid Link</h1>
                        <p>This link is invalid or has expired.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const leadRequest = leadRequests[0];

        // Update lead request as rejected (confirmed = FALSE)
        await db.query(
            `UPDATE lead_requests 
             SET confirmed = FALSE
             WHERE confirmation_token = ?`,
            [token]
        );

        // Send rejection confirmation page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Request Declined</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background-color: #f9f9f9;
                    }
                    .container { 
                        background: white; 
                        padding: 40px; 
                        border-radius: 15px; 
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
                        max-width: 500px; 
                        margin: 0 auto; 
                    }
                    h1 { color: #666; margin-bottom: 20px; }
                    .icon { font-size: 60px; margin: 20px 0; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📝</div>
                    <h1>Request Declined</h1>
                    <p>Thank you for your response. We've noted that you're not interested in listing this property at this time.</p>
                    <p style="margin-top: 30px; font-size: 14px; color: #888;">
                        If you change your mind in the future, feel free to contact us.
                    </p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error rejecting lead request:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                    .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    h1 { color: #f44336; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error</h1>
                    <p>An error occurred while processing your response. Please try again later.</p>
                </div>
            </body>
            </html>
        `);
    }
});

export default router;

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all requests received by a seller (for their listings)
router.get('/received/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [requests] = await pool.query(
      `SELECT r.*, 
              u.full_name as sender_name, 
              u.email as sender_email, 
              u.phone as sender_phone,
              l.title as listing_title,
              l.rent as listing_rent
       FROM requests r
       JOIN users u ON r.sender_id = u.user_id
       JOIN listings l ON r.listing_id = l.listing_id
       WHERE r.receiver_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(requests);
  } catch (error) {
    console.error('Error fetching received requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all requests sent by a user (taker's sent requests)
router.get('/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [requests] = await pool.query(
      `SELECT r.*, 
              u.full_name as receiver_name, 
              u.email as receiver_email,
              l.title as listing_title,
              l.rent as listing_rent,
              l.city as listing_city
       FROM requests r
       JOIN users u ON r.receiver_id = u.user_id
       JOIN listings l ON r.listing_id = l.listing_id
       WHERE r.sender_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(requests);
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new request (taker requests a listing)
router.post('/', async (req, res) => {
  try {
    const { listing_id, sender_id, message } = req.body;

    if (!listing_id) {
      return res.status(400).json({ message: 'Listing ID is required' });
    }

    // Get the listing to find the receiver (owner)
    const [listings] = await pool.query(
      'SELECT user_id, title FROM listings WHERE listing_id = ?',
      [listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const receiver_id = listings[0].user_id;

    // Check if user is trying to request their own listing
    if (sender_id === receiver_id) {
      return res.status(400).json({ message: 'You cannot request your own listing' });
    }

    // Check if request already exists
    const [existingRequests] = await pool.query(
      'SELECT * FROM requests WHERE sender_id = ? AND listing_id = ?',
      [sender_id, listing_id]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({ message: 'You have already sent a request for this listing' });
    }

    // Create the request
    const [result] = await pool.query(
      'INSERT INTO requests (sender_id, receiver_id, listing_id) VALUES (?, ?, ?)',
      [sender_id, receiver_id, listing_id]
    );

    res.status(201).json({
      message: 'Request sent successfully',
      request_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update request status (accept/reject)
router.put('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, user_id } = req.body;
    const userId = user_id;

    // Validate status
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "Accepted" or "Rejected"' });
    }

    // Check if the request exists and belongs to the user (as receiver)
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE request_id = ? AND receiver_id = ?',
      [requestId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found or not authorized' });
    }

    // Update the request status
    await pool.query(
      'UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ?',
      [status, requestId]
    );

    res.json({ message: `Request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel a request (sender cancels their own request)
router.delete('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { user_id } = req.query;
    const userId = user_id;

    // Check if the request exists and belongs to the user (as sender)
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE request_id = ? AND sender_id = ?',
      [requestId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found or not authorized' });
    }

    // Only allow cancellation if request is still pending
    if (requests[0].status !== 'Pending') {
      return res.status(400).json({ 
        message: 'Cannot cancel a request that has already been processed' 
      });
    }

    await pool.query('DELETE FROM requests WHERE request_id = ?', [requestId]);

    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get request statistics for a user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get sent requests stats
    const [sentStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_sent,
         SUM(status = 'Pending') as pending_sent,
         SUM(status = 'Accepted') as accepted_sent,
         SUM(status = 'Rejected') as rejected_sent
       FROM requests 
       WHERE sender_id = ?`,
      [userId]
    );

    // Get received requests stats
    const [receivedStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_received,
         SUM(status = 'Pending') as pending_received,
         SUM(status = 'Accepted') as accepted_received,
         SUM(status = 'Rejected') as rejected_received
       FROM requests 
       WHERE receiver_id = ?`,
      [userId]
    );

    res.json({
      sent: sentStats[0],
      received: receivedStats[0]
    });
  } catch (error) {
    console.error('Error fetching request statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
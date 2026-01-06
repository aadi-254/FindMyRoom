import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all listings for a specific user (seller's listings)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [listings] = await pool.query(
      'SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    console.log(listings);
    console.log(userId);
    res.json(listings);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all listings (for search/browse - takers)
router.get('/', async (req, res) => {
  try {
    const { city, room_type, min_rent, max_rent, gender_pref } = req.query;
    
    let query = `
      SELECT l.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM listings l 
      JOIN users u ON l.user_id = u.user_id 
      WHERE 1=1
    `;
    const queryParams = [];

    if (city) {
      query += ' AND l.city LIKE ?';
      queryParams.push(`%${city}%`);
    }

    if (room_type) {
      query += ' AND l.room_type = ?';
      queryParams.push(room_type);
    }

    if (min_rent) {
      query += ' AND l.rent >= ?';
      queryParams.push(min_rent);
    }

    if (max_rent) {
      query += ' AND l.rent <= ?';
      queryParams.push(max_rent);
    }

    if (gender_pref && gender_pref !== 'Any') {
      query += ' AND (l.gender_pref = ? OR l.gender_pref = "Any")';
      queryParams.push(gender_pref);
    }

    query += ' ORDER BY l.created_at DESC';

    const [listings] = await pool.query(query, queryParams);
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new listing
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      rent,
      city,
      room_type,
      gender_pref,
      available_from,
      latitude,
      longitude
    } = req.body;

    const userId = user_id;

    // Validate required fields
    if (!title || !rent || !city || !available_from) {
      return res.status(400).json({ 
        message: 'Title, rent, city, and available date are required' 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO listings 
       (user_id, title, description, rent, city, latitude, longitude, 
        room_type, gender_pref, available_from) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description,
        rent,
        city,
        latitude || null,
        longitude || null,
        room_type || '1BHK',
        gender_pref || 'Any',
        available_from
      ]
    );

    res.status(201).json({
      message: 'Listing created successfully',
      listing_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a listing
router.put('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { user_id } = req.body;
    const userId = user_id;

    // Check if the listing belongs to the user
    const [existing] = await pool.query(
      'SELECT * FROM listings WHERE listing_id = ? AND user_id = ?',
      [listingId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Listing not found or not authorized' });
    }

    const {
      title,
      description,
      rent,
      city,
      room_type,
      gender_pref,
      available_from,
      latitude,
      longitude
    } = req.body;

    await pool.query(
      `UPDATE listings SET 
       title = ?, description = ?, rent = ?, city = ?, 
       latitude = ?, longitude = ?, room_type = ?, 
       gender_pref = ?, available_from = ?, updated_at = CURRENT_TIMESTAMP
       WHERE listing_id = ?`,
      [
        title,
        description,
        rent,
        city,
        latitude,
        longitude,
        room_type,
        gender_pref,
        available_from,
        listingId
      ]
    );

    res.json({ message: 'Listing updated successfully' });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a listing
router.delete('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { user_id } = req.query;
    const userId = user_id;

    // Check if the listing belongs to the user
    const [existing] = await pool.query(
      'SELECT * FROM listings WHERE listing_id = ? AND user_id = ?',
      [listingId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Listing not found or not authorized' });
    }

    await pool.query('DELETE FROM listings WHERE listing_id = ?', [listingId]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific listing by ID
router.get('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const [listings] = await pool.query(
      `SELECT l.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
       FROM listings l 
       JOIN users u ON l.user_id = u.user_id 
       WHERE l.listing_id = ?`,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json(listings[0]);
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
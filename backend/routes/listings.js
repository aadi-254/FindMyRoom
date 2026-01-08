import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Haversine formula to calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Middleware to check payment access
async function checkPaymentAccess(req, res, next) {
  try {
    const userId = req.query.user_id || req.user?.user_id;
    const { area } = req.query;

    if (!userId) {
      req.hasPaymentAccess = false;
      return next();
    }

    if (!area) {
      req.hasPaymentAccess = false;
      return next();
    }

    // Check if user has active payment for requested area
    const [payments] = await pool.query(
      `SELECT payment_id, houses_to_view, houses_viewed, user_latitude, user_longitude 
       FROM user_payments 
       WHERE user_id = ? AND area = ? AND payment_status = 'completed'
       AND houses_viewed < houses_to_view
       ORDER BY payment_date DESC 
       LIMIT 1`,
      [userId, area]
    );

    req.hasPaymentAccess = payments.length > 0;
    req.activePayment = payments.length > 0 ? payments[0] : null;
    next();
  } catch (error) {
    console.error('Error checking payment access:', error);
    req.hasPaymentAccess = false;
    next();
  }
}

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
router.get('/', checkPaymentAccess, async (req, res) => {
  try {
    const { city, room_type, min_rent, max_rent, gender_pref, area, user_id } = req.query;
    const hasAccess = req.hasPaymentAccess;
    
    console.log('📊 Listings request:', { 
      user_id, 
      area, 
      hasAccess, 
      activePayment: req.activePayment 
    });
    
    let query = `
      SELECT l.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM listings l 
      JOIN users u ON l.user_id = u.user_id 
      WHERE 1=1
    `;
    const queryParams = [];

    // Filter by area (using city column) if specified
    if (area) {
      query += ' AND l.city = ?';
      queryParams.push(area);
    }

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

    const [listings] = await pool.query(query, queryParams);
    
    console.log(`🏠 Found ${listings.length} listings before filtering`);
    
    // Calculate distances and sort by proximity if user has payment with location
    let sortedListings = listings;
    if (hasAccess && req.activePayment) {
      const userLat = req.activePayment.user_latitude;
      const userLng = req.activePayment.user_longitude;
      const housesToView = req.activePayment.houses_to_view;
      const housesViewed = req.activePayment.houses_viewed;
      const remaining = housesToView - housesViewed;
      
      console.log(`💰 Payment details:`, { 
        housesToView, 
        housesViewed, 
        remaining,
        userLocation: { lat: userLat, lng: userLng }
      });
      
      // Calculate distance for each listing
      if (userLat && userLng) {
        sortedListings = listings.map(listing => {
          const distance = calculateDistance(
            userLat, userLng,
            listing.latitude, listing.longitude
          );
          return { ...listing, distance };
        }).sort((a, b) => {
          // Sort by distance (closest first), nulls at the end
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        
        console.log(`📍 Sorted by distance, limiting to ${remaining} houses`);
      } else {
        // If no user location, sort by creation date
        sortedListings = listings.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        console.log(`📅 No user location, sorted by date, limiting to ${remaining} houses`);
      }
      
      // Limit to remaining houses
      sortedListings = sortedListings.slice(0, remaining);
      console.log(`✂️ After limiting: ${sortedListings.length} houses`);
    } else {
      // No payment access - return limited results sorted by date
      sortedListings = listings.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      console.log(`🔒 No payment access, returning ${sortedListings.length} houses with limited data`);
    }
    
    // Return limited data if user hasn't paid
    if (!hasAccess) {
      const limitedListings = sortedListings.map(listing => ({
        listing_id: listing.listing_id,
        title: listing.title,
        rent: listing.rent,
        city: listing.city,
        area: listing.city, // Use city as area since listings table doesn't have area column
        room_type: listing.room_type,
        gender_pref: listing.gender_pref,
        latitude: listing.latitude,
        longitude: listing.longitude,
        created_at: listing.created_at,
        // Hide sensitive information
        description: '🔒 Payment required to view full details',
        owner_name: '🔒 Hidden',
        owner_email: '🔒 Hidden',
        owner_phone: '🔒 Hidden',
        isPaidAccess: false
      }));
      return res.json(limitedListings);
    }

    // Return full data for paid users
    const fullListings = sortedListings.map(listing => ({
      ...listing,
      area: listing.city, // Use city as area
      isPaidAccess: true,
      distanceKm: listing.distance ? listing.distance.toFixed(2) : null
    }));
    
    res.json(fullListings);
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
      address,
      room_type,
      gender_pref,
      available_from,
      latitude,
      longitude
    } = req.body;

    const userId = user_id;

    // Validate required fields
    if (!title || !rent || !city || !address || !available_from) {
      return res.status(400).json({ 
        message: 'Title, rent, city, address, and available date are required' 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO listings 
       (user_id, title, description, rent, city, address, latitude, longitude, 
        room_type, gender_pref, available_from) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description,
        rent,
        city,
        address,
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
      address,
      room_type,
      gender_pref,
      available_from,
      latitude,
      longitude
    } = req.body;

    await pool.query(
      `UPDATE listings SET 
       title = ?, description = ?, rent = ?, city = ?, address = ?,
       latitude = ?, longitude = ?, room_type = ?, 
       gender_pref = ?, available_from = ?, updated_at = CURRENT_TIMESTAMP
       WHERE listing_id = ?`,
      [
        title,
        description,
        rent,
        city,
        address,
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
router.get('/:listingId', checkPaymentAccess, async (req, res) => {
  try {
    const { listingId } = req.params;
    const hasAccess = req.hasPaymentAccess;

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

    const listing = listings[0];

    // If user doesn't have payment access, return limited data
    if (!hasAccess) {
      return res.json({
        listing_id: listing.listing_id,
        title: listing.title,
        rent: listing.rent,
        city: listing.city,
        area: listing.area,
        room_type: listing.room_type,
        gender_pref: listing.gender_pref,
        latitude: listing.latitude,
        longitude: listing.longitude,
        created_at: listing.created_at,
        description: '🔒 Payment required to view full details',
        owner_name: '🔒 Hidden',
        owner_email: '🔒 Hidden',
        owner_phone: '🔒 Hidden',
        isPaidAccess: false
      });
    }

    // Increment houses_viewed count for paid access
    if (req.activePayment) {
      await pool.query(
        'UPDATE user_payments SET houses_viewed = houses_viewed + 1 WHERE payment_id = ?',
        [req.activePayment.payment_id]
      );
    }

    res.json({
      ...listing,
      isPaidAccess: true
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
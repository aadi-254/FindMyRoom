-- Test query to verify filtering works correctly
-- Run this to see what houses would be selected for a 1BHK filter

-- Check houses in Ahmedabad
SELECT 
    listing_id,
    title,
    room_type,
    rent,
    city,
    latitude,
    longitude
FROM listings
WHERE city = 'Ahmedabad'
ORDER BY room_type, rent;

-- Test filter for 1BHK only
SELECT 
    listing_id,
    title,
    room_type,
    rent,
    city,
    SQRT(POW(69.1 * (latitude - 22.777533), 2) + 
         POW(69.1 * (72.332273 - longitude) * COS(latitude / 57.3), 2)) AS distance
FROM listings
WHERE city = 'Ahmedabad'
  AND room_type = '1BHK'
ORDER BY distance
LIMIT 5;

-- Check if any entries in user_accessible_houses
SELECT 
    uah.id,
    uah.payment_id,
    uah.user_id,
    uah.listing_id,
    l.title,
    l.room_type,
    l.rent
FROM user_accessible_houses uah
JOIN listings l ON uah.listing_id = l.listing_id
ORDER BY uah.payment_id DESC, uah.id
LIMIT 20;

-- Check recent payments
SELECT 
    payment_id,
    user_id,
    area,
    houses_to_view,
    amount_paid,
    plan_expires_at,
    plan_active
FROM user_payments
ORDER BY payment_id DESC
LIMIT 5;

-- Add latitude and longitude columns to user_payments table
-- Run this script to add location tracking to payments

USE rentAhouse;

-- Add columns if they don't exist
ALTER TABLE user_payments 
ADD COLUMN IF NOT EXISTS user_latitude DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS user_longitude DECIMAL(10, 6);

-- Show updated table structure
DESCRIBE user_payments;

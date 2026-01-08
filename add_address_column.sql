-- SQL script to add address column if it doesn't exist
-- Run this only if your database doesn't have the address column

USE rentAhouse;

-- Check if address column exists and add it if it doesn't
ALTER TABLE listings ADD COLUMN IF NOT EXISTS address VARCHAR(255) NOT NULL DEFAULT '';

-- Update existing records with empty addresses
UPDATE listings SET address = CONCAT(city, ' - Address not provided') WHERE address = '' OR address IS NULL;

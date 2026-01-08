-- Update database schema for automated email confirmation system
USE findmyroom;

-- Add confirmation_token column to lead_requests table if it doesn't exist
ALTER TABLE lead_requests 
ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(255) UNIQUE AFTER confirmed;

-- Ensure users table has points column (should already exist but adding IF NOT EXISTS for safety)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0 AFTER user_id;

-- Show the updated table structures
DESCRIBE lead_requests;
DESCRIBE users;

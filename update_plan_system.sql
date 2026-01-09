-- Add plan expiry and house access tracking to user_payments table
ALTER TABLE user_payments 
ADD COLUMN plan_expires_at DATETIME AFTER payment_date,
ADD COLUMN plan_active BOOLEAN DEFAULT TRUE AFTER plan_expires_at;

-- Create table to track which houses a user has access to
CREATE TABLE IF NOT EXISTS user_accessible_houses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    user_id INT NOT NULL,
    listing_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES user_payments(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
    UNIQUE KEY unique_payment_listing (payment_id, listing_id)
);

-- Add index for faster queries
CREATE INDEX idx_user_payment_active ON user_payments(user_id, plan_active, plan_expires_at);
CREATE INDEX idx_user_accessible ON user_accessible_houses(user_id, payment_id);

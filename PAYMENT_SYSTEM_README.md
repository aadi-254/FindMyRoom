# Payment Gateway Implementation - Testing Guide

## Overview
A dummy payment gateway has been implemented that requires users to pay before viewing house details.

## How It Works

### 1. **Area Selection**
   - Users first select their preferred area
   - System shows how many houses are available in that area

### 2. **Pricing Table**
   | Houses to View | Price (₹) |
   |----------------|-----------|
   | 1              | 10        |
   | 2              | 20        |
   | 3              | 30        |
   | 4              | 40        |
   | 5              | 40        |
   | 6              | 48        |
   | 7              | 56        |
   | 8              | 64        |
   | 9              | 72        |
   | 10             | 80        |
   | 15             | 120       |
   | 20             | 160       |
   | 25             | 200       |
   | 30             | 240       |
   | 35             | 280       |
   | 40             | 320       |
   | 45             | 360       |
   | 50             | 400       |

### 3. **Payment Process**
   - Select number of houses to view
   - See price calculation
   - Proceed to dummy payment gateway
   - Complete "payment" (no real transaction)

### 4. **Access Control**
   - Before payment: Only basic info visible (title, rent, area, type)
   - After payment: Full details visible (description, owner contact, etc.)
   - View counter tracks how many houses user has viewed

## Files Changed

### Backend
1. **`backend/update-database.js`** - Added user_payments table schema
2. **`backend/routes/payments.js`** (NEW) - Payment API endpoints
3. **`backend/routes/listings.js`** - Added payment access middleware
4. **`backend/server.js`** - Added payment routes

### Frontend
1. **`frontend/src/components/PaymentSelection.jsx`** (NEW) - Payment UI
2. **`frontend/src/components/PaymentSelection.css`** (NEW) - Payment styles
3. **`frontend/src/components/SearchWithPayment.jsx`** (NEW) - Wrapper component
4. **`frontend/src/components/SearchWithPayment.css`** (NEW) - Wrapper styles

## Setup Instructions

### 1. Update Database
```bash
cd backend
node update-database.js
```

### 2. Start Backend
```bash
cd backend
npm start
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

### 4. Update App.jsx (Required)
Replace the Search component import with SearchWithPayment:
```javascript
// In App.jsx
import SearchWithPayment from './components/SearchWithPayment';

// Replace <Search> with <SearchWithPayment>
```

## API Endpoints

### Payment APIs
- `GET /api/payments/areas` - Get all unique areas
- `GET /api/payments/available-houses?area=X` - Get house count in area
- `GET /api/payments/check-access?area=X` - Check if user has access
- `POST /api/payments/process-payment` - Process payment (dummy)
- `GET /api/payments/history` - Get user's payment history
- `POST /api/payments/increment-viewed` - Increment view count

### Listings APIs (Modified)
- `GET /api/listings` - Returns limited/full data based on payment
- `GET /api/listings/:id` - Returns limited/full data, increments counter

## Features

### ✅ Implemented
- Area selection interface
- House count display
- Pricing calculator with popular options
- Dummy payment gateway UI
- Payment tracking in database
- Access control middleware
- Limited vs. full data response
- View counter for paid users
- Payment history

### 🎨 UI Features
- Step-by-step payment flow
- Responsive design
- Loading states
- Error handling
- Price summary
- Payment confirmation

### 🔒 Security Features
- User authentication required
- Payment verification before showing data
- Area-specific access control
- View limit enforcement

## Testing Steps

1. **Login to the application**
2. **Navigate to Search/Browse**
3. **See payment required screen**
4. **Click "Get Access Now"**
5. **Select an area** (e.g., "Downtown")
6. **See available house count**
7. **Select number of houses** (use popular options or custom)
8. **See price calculation**
9. **Proceed to payment**
10. **Complete dummy payment**
11. **See full house details**
12. **View counter decreases** as you view houses

## Database Schema

### user_payments Table
```sql
CREATE TABLE user_payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    area VARCHAR(255) NOT NULL,
    houses_to_view INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'completed',
    houses_viewed INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
```

## Notes
- This is a **DUMMY** payment gateway for demonstration only
- No real transactions are processed
- Payment status is automatically set to 'completed'
- Card details in the payment form are placeholder values
- The system is area-based: payment for one area doesn't grant access to others

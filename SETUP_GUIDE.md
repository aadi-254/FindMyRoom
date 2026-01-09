# 🚀 QUICK START GUIDE - Filtering Before Payment System

## ✅ What's Implemented

Your system now has **FILTERS BEFORE PAYMENT** working properly:

### User Flow:
1. **Select Area** → User chooses location (e.g., "Mumbai")
2. **Apply Filters** → User selects:
   - Property Type (2BHK, PG, etc.)
   - Price Range (₹10,000 - ₹30,000)
   - See real-time count of matching houses
3. **Select Location** → User marks their location on map
4. **Choose Plan** → User selects how many houses (e.g., 10 houses = 7 days = ₹80)
5. **Payment** → Complete dummy payment
6. **View Houses** → User ONLY sees the 10 closest 2BHK houses (matching their filters)

### Example Scenario:
- User wants **2BHK** in **Mumbai** between **₹15,000-₹25,000**
- System shows: "25 houses match your filters"
- User purchases plan for **10 houses**
- System finds the **10 closest 2BHK houses** within that price range
- User will **NEVER see hostels or 1RK** - only the 10 filtered 2BHK houses!

## 🔧 Setup Steps

### Step 1: Update Database (IMPORTANT!)

Open MySQL Workbench or MySQL Command Line and run:

```sql
USE findmyroom;

-- Add plan expiry columns
ALTER TABLE user_payments 
ADD COLUMN plan_expires_at DATETIME AFTER payment_date,
ADD COLUMN plan_active BOOLEAN DEFAULT TRUE AFTER plan_expires_at;

-- Create accessible houses table
CREATE TABLE user_accessible_houses (
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

-- Add indexes
CREATE INDEX idx_user_payment_active ON user_payments(user_id, plan_active, plan_expires_at);
CREATE INDEX idx_user_accessible ON user_accessible_houses(user_id, payment_id);
```

Or simply copy-paste the content from `run_migration.sql` into MySQL.

### Step 2: Verify Backend is Running

The backend code has already been updated in `backend/routes/payments.js`. Just make sure it's running:

```powershell
cd backend
npm start
```

Backend should be running on: http://localhost:5000

### Step 3: Start Frontend

```powershell
cd frontend
npm run dev
```

Frontend should be running on: http://localhost:5173 (or shown port)

## 🧪 Test the System

### Test Flow:

1. **Login/Signup** as a taker (not seller)

2. **You'll see "Get Access" screen** with:
   - Plan examples (5 houses = 3 days, 10 houses = 7 days, etc.)
   - "Get Access Now" button

3. **Click "Get Access Now"**

4. **Step 1 - Select Area:**
   - Choose your city (e.g., "Mumbai")
   - See available houses count
   - Click "Continue to Filters"

5. **Step 2 - Apply Filters (THIS IS KEY!):**
   - Property Type: Select "2BHK"
   - Price Range: Enter ₹15000 to ₹25000
   - **Watch the counter update** - e.g., "25 houses match your filters"
   - Click "Continue to Location"

6. **Step 3 - Select Location:**
   - Click anywhere on the map to mark your location
   - This determines which houses are "closest"
   - Click "Continue to Plan Selection"

7. **Step 4 - Choose Plan:**
   - Select "10 Houses" (shows: 7 days, ₹80)
   - Or enter custom number
   - See plan summary
   - Click "Proceed to Payment"

8. **Step 5 - Payment:**
   - Review summary (shows your filters)
   - Click "Pay ₹80"
   - Payment processes

9. **View Houses:**
   - You'll see **ONLY** the 10 closest 2BHK houses in your price range
   - **NO hostels, NO 1RK, NO other types** - only what you filtered!
   - Banner shows: "10 houses (0 viewed)" and "7 days" remaining

10. **Click on a house** to view full details

## 🎯 Key Points

### ✅ Filters BEFORE Payment:
- User selects property type FIRST
- User sets price range FIRST
- User sees house count FIRST
- Then payment happens

### ✅ Only Filtered Houses:
- Backend finds closest N houses matching filters
- Stores ONLY those houses in `user_accessible_houses` table
- User can ONLY view those specific houses
- No way to see houses outside the filter

### ✅ Time-Limited Access:
- 5 houses = 3 days
- 10 houses = 7 days
- 15 houses = 11 days
- 20 houses = 17 days
- Formula: days = (houses/5) × 4 - 1

### ✅ After Expiry:
- Plan expires automatically
- User must buy new plan
- Can apply different filters for new plan

## 📊 Check Database

To verify it's working, run these queries:

```sql
-- Check a user's active plan
SELECT * FROM user_payments 
WHERE user_id = 1 AND plan_active = TRUE AND plan_expires_at > NOW();

-- Check accessible houses for a payment
SELECT l.title, l.property_type, l.rent, l.city
FROM user_accessible_houses uah
JOIN listings l ON uah.listing_id = l.listing_id
WHERE uah.payment_id = 1;
```

## 🐛 Troubleshooting

### Issue: "No houses match your filters"
**Solution:** Adjust filters or try different property type/price range

### Issue: After payment, showing all houses
**Solution:** 
1. Check that `user_accessible_houses` table exists
2. Verify payment was successful in `user_payments` table
3. Check browser console for errors

### Issue: Can't see any houses after payment
**Solution:**
1. Check if listings have `latitude` and `longitude` columns
2. Verify houses exist in the selected area with matching filters
3. Check `user_accessible_houses` table has entries

### Issue: Database migration fails
**Solution:**
1. Manually run each ALTER/CREATE statement one by one
2. Check if columns already exist (you can skip those)
3. Ensure foreign key references are correct

## 📝 What Changed from Before

### Before:
- Payment first ❌
- Filters shown AFTER payment ❌
- Could see all houses in area ❌
- No time limit ❌

### Now:
- Filters BEFORE payment ✅
- User selects type/price FIRST ✅
- Only sees N closest matching houses ✅
- Time-limited based on house count ✅

## 🎉 Summary

**The key fix:** User selects **property type** and **price range** in Step 2 (before payment), and the system **ONLY stores and shows** those filtered houses. If user wants 2BHK, they will **NEVER see hostels or other types**!

The flow is:
```
Area → FILTERS → Location → Plan → Payment → ONLY FILTERED HOUSES
```

Not:
```
Area → Payment → Filters → All Houses (WRONG - OLD WAY)
```

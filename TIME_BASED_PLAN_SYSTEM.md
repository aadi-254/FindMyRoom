# Time-Based Plan System Implementation Guide

## Overview
Implemented a time-based plan system where users purchase access to N closest houses for a specific duration based on the number of houses.

## Key Features

### 1. **Plan Duration Formula**
```
Days = (Houses / 5) × 4 - 1
```

Examples:
- 5 houses = 3 days (₹40)
- 10 houses = 7 days (₹80)
- 15 houses = 11 days (₹120)
- 20 houses = 17 days (₹160)

### 2. **Filters Before Payment**
Users now select their preferences BEFORE purchasing:
- **Property Type**: 1RK, 1BHK, 2BHK, 3BHK, PG, Flat, Apartment
- **Price Range**: Min and Max rent filters
- **Location**: Map-based selection to find closest houses

### 3. **Closest N Houses**
- System calculates distance from user's selected location
- Filters houses based on preferences
- Stores only the N closest matching houses
- User can only view these pre-selected houses during plan validity

### 4. **Plan Expiry**
- Plans automatically expire after calculated days
- Warning shown when plan expires in 1 day
- User must purchase new plan after expiry
- Old accessible houses are no longer viewable

## Database Changes

### Run SQL Migration
```bash
# Apply the database changes
mysql -u root -p findmyroom < update_plan_system.sql
```

### New Columns in `user_payments` table:
- `plan_expires_at` (DATETIME): When the plan expires
- `plan_active` (BOOLEAN): Whether plan is currently active

### New Table: `user_accessible_houses`
Stores which houses each user can access:
- `payment_id`: Reference to payment
- `user_id`: Reference to user
- `listing_id`: Reference to house
- `added_at`: Timestamp

## Backend Changes

### New Endpoints

#### 1. Get Available Houses with Filters
```
GET /api/payments/available-houses?area=X&propertyType=Y&minPrice=Z&maxPrice=W
```
Returns count of houses matching filters.

#### 2. Get Accessible Houses
```
GET /api/payments/accessible-houses?area=X&user_id=Y
```
Returns full details of houses user has access to.

#### 3. Process Payment (Enhanced)
```
POST /api/payments/process-payment
Body: {
  area, housesToView, user_id,
  latitude, longitude,
  propertyType, minPrice, maxPrice
}
```
Now:
- Calculates plan expiry based on house count
- Finds N closest houses matching filters
- Stores accessible houses in database
- Returns expiry information

#### 4. Check Access (Enhanced)
```
GET /api/payments/check-access?area=X&user_id=Y
```
Now checks:
- Plan is active (`plan_active = TRUE`)
- Plan hasn't expired (`plan_expires_at > NOW()`)
- Returns days remaining

#### 5. Deactivate Expired Plans
```
POST /api/payments/deactivate-expired
```
Deactivates all expired plans (run periodically or on-demand).

### Helper Functions Added

```javascript
// Calculate expiry days from house count
function calculateExpiryDays(housesToView) {
    return Math.floor((housesToView / 5) * 4) - 1;
}

// Calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Returns distance in kilometers
}
```

## Frontend Changes

### New Components

#### 1. `PaymentSelectionNew.jsx`
Enhanced payment flow with 5 steps:
1. **Select Area**: Choose location
2. **Apply Filters**: Property type, price range
3. **Select Location**: Map-based user location
4. **Choose Plan**: Number of houses with calculated duration
5. **Payment**: Summary and confirmation

#### 2. `SearchWithPaymentNew.jsx`
Enhanced search wrapper with:
- Active plan banner showing:
  - Area
  - Houses (total/viewed)
  - Days remaining
- Expiry warning when < 1 day left
- Restricted to accessible houses only
- Buy new plan button

### Updated Components

#### Search Component Enhancement
Modify [Search.jsx](frontend/src/components/Search.jsx) to accept:
```jsx
<Search 
  user={user}
  restrictedArea={selectedArea}
  accessibleHouses={accessibleHouses}
  onViewHouse={() => checkAccessStatus()}
/>
```

The Search component should:
- Only show houses from `accessibleHouses` array
- Filter by `restrictedArea`
- Call `onViewHouse()` when user views details

## Setup Instructions

### Step 1: Update Database
```bash
cd c:\Users\adity\Desktop\projects\findMyRoom
mysql -u root -p findmyroom < update_plan_system.sql
```

### Step 2: Backend is Already Updated
The backend changes are already in [payments.js](backend/routes/payments.js).

### Step 3: Update App.jsx
Replace the Search component import:

```javascript
// In App.jsx
import SearchWithPaymentNew from './components/SearchWithPaymentNew';

// In the routes, replace SearchWithPayment with:
<Route path="/search" element={<SearchWithPaymentNew user={user} />} />
```

### Step 4: Update Search Component
Modify [Search.jsx](frontend/src/components/Search.jsx) to:

1. Accept new props:
```javascript
const Search = ({ user, restrictedArea, accessibleHouses, onViewHouse }) => {
```

2. Filter listings:
```javascript
// Only show accessible houses
const filteredListings = accessibleHouses && accessibleHouses.length > 0
  ? accessibleHouses
  : listings; // Fallback to all if no restrictions
```

3. Call onViewHouse when viewing details:
```javascript
const handleViewHouse = (house) => {
  // Your existing view logic
  if (onViewHouse) {
    onViewHouse();
  }
};
```

### Step 5: Test the System

#### Test Flow:
1. **Login/Signup** as a user
2. **Navigate to Search** - Should show "Get Access" screen
3. **Click "Get Access Now"**
4. **Step 1**: Select area (e.g., "Mumbai")
5. **Step 2**: Apply filters:
   - Property Type: "2BHK"
   - Price: ₹10000 - ₹30000
   - See updated house count
6. **Step 3**: Click on map to set location
7. **Step 4**: Select plan:
   - Try "10 Houses" - Should show "7 days" duration
   - See price calculation
8. **Step 5**: Complete payment
9. **View Houses**: Should only see the 10 closest houses
10. **Check Banner**: Shows area, houses, days remaining
11. **Wait for Expiry**: Plan expires after calculated days

## API Testing

### Test Plan Purchase:
```bash
curl -X POST http://localhost:5000/api/payments/process-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "area": "Mumbai",
    "housesToView": 10,
    "user_id": 1,
    "latitude": 19.0760,
    "longitude": 72.8777,
    "propertyType": "2BHK",
    "minPrice": 10000,
    "maxPrice": 30000
  }'
```

### Test Check Access:
```bash
curl "http://localhost:5000/api/payments/check-access?area=Mumbai&user_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Accessible Houses:
```bash
curl "http://localhost:5000/api/payments/accessible-houses?area=Mumbai&user_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Features Summary

### ✅ Before Payment:
- Area selection
- Property type filter
- Price range filter
- See available house count with filters
- Location selection on map
- Plan duration calculation

### ✅ After Payment:
- Access to N closest houses only
- Time-limited access based on plan
- Full house details visible
- Owner contact information
- View counter tracking
- Days remaining display

### ✅ Plan Expiry:
- Automatic expiration after calculated days
- Warning when < 1 day remaining
- Must purchase new plan to continue
- Old houses no longer accessible

## Troubleshooting

### Issue: No houses match filters
**Solution**: User needs to adjust filter criteria or select different area

### Issue: Plan expired but still showing access
**Solution**: Run the deactivate endpoint:
```bash
curl -X POST http://localhost:5000/api/payments/deactivate-expired
```

### Issue: Distance calculation not working
**Solution**: Ensure listings table has `latitude` and `longitude` columns

### Issue: Accessible houses not showing
**Solution**: Check if `user_accessible_houses` table was created:
```sql
SELECT * FROM user_accessible_houses WHERE user_id = 1;
```

## Future Enhancements

1. **Auto-deactivation**: Cron job to deactivate expired plans
2. **Email Notifications**: Alert users before plan expires
3. **Plan Extension**: Allow extending current plan
4. **Favorite Houses**: Let users save houses within accessible list
5. **Analytics**: Track which houses are viewed most
6. **Bulk Plans**: Discounts for purchasing multiple plans

## Files Modified

### Backend:
- ✅ `backend/routes/payments.js` - Enhanced with new endpoints
- ✅ `update_plan_system.sql` - Database schema updates

### Frontend:
- ✅ `frontend/src/components/PaymentSelectionNew.jsx` - New payment flow
- ✅ `frontend/src/components/SearchWithPaymentNew.jsx` - New search wrapper
- ✅ `frontend/src/components/PaymentSelection.css` - Enhanced styles
- ✅ `frontend/src/components/SearchWithPayment.css` - New styles
- ⏳ `frontend/src/components/Search.jsx` - Needs update (see Step 4)
- ⏳ `frontend/src/App.jsx` - Needs update (see Step 3)

## Support

For issues or questions, check:
1. Browser console for errors
2. Backend terminal for API logs
3. Database tables for data integrity
4. This guide's troubleshooting section

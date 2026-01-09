# 🔄 System Flow Diagram - Filters Before Payment

## Current Implementation (CORRECT ✅)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

STEP 1: SELECT AREA
┌──────────────────┐
│  User arrives    │
│  at search page  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Show "Get Access"│
│ screen with plan │
│ examples         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Click "Get       │
│ Access Now"      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Area      │
│ e.g., "Mumbai"   │
│ Show: 100 houses │
└────────┬─────────┘
         │
         ▼

STEP 2: APPLY FILTERS ⭐ (BEFORE PAYMENT!)
┌──────────────────────────────────────┐
│ Property Type: [2BHK ▼]              │
│ Min Price: ₹15,000                   │
│ Max Price: ₹25,000                   │
│                                      │
│ ✨ 25 houses match your filters     │
└────────┬─────────────────────────────┘
         │ (User sees filtered count FIRST)
         ▼

STEP 3: SELECT LOCATION
┌──────────────────┐
│ Click on map     │
│ to set location  │
│ (for distance    │
│  calculation)    │
└────────┬─────────┘
         │
         ▼

STEP 4: CHOOSE PLAN
┌──────────────────────────────────────┐
│ Select: 10 Houses                    │
│ Duration: 7 days                     │
│ Price: ₹80                           │
└────────┬─────────────────────────────┘
         │
         ▼

STEP 5: PAYMENT
┌──────────────────────────────────────┐
│ Summary:                             │
│ - Area: Mumbai                       │
│ - Type: 2BHK                         │
│ - Price: ₹15K-₹25K                   │
│ - Houses: 10 closest                 │
│ - Duration: 7 days                   │
│ - Amount: ₹80                        │
│                                      │
│ [Pay ₹80] ← Click to complete       │
└────────┬─────────────────────────────┘
         │
         ▼

BACKEND PROCESSING:
┌──────────────────────────────────────┐
│ 1. Find all 2BHK houses in Mumbai   │
│    with rent ₹15K-₹25K               │
│                                      │
│ 2. Calculate distance from user     │
│    location to each house            │
│                                      │
│ 3. Sort by distance (closest first) │
│                                      │
│ 4. Select TOP 10 closest             │
│                                      │
│ 5. Store in user_accessible_houses  │
│    table (ONLY these 10!)            │
│                                      │
│ 6. Set expiry: today + 7 days       │
└────────┬─────────────────────────────┘
         │
         ▼

RESULT: VIEW HOUSES
┌──────────────────────────────────────┐
│ 📍 Area: Mumbai                      │
│ 🏠 Access: 10 houses (0 viewed)      │
│ ⏱️ Valid for: 7 days                 │
│                                      │
│ [Buy New Plan 🛒]                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🏘️ SHOWING HOUSES:                   │
│                                      │
│ ✅ House 1: 2BHK, ₹18,000, 0.5km    │
│ ✅ House 2: 2BHK, ₹20,000, 0.8km    │
│ ✅ House 3: 2BHK, ₹22,000, 1.2km    │
│ ✅ House 4: 2BHK, ₹16,000, 1.5km    │
│ ... (6 more 2BHK houses)            │
│                                      │
│ ❌ NO hostels shown                  │
│ ❌ NO 1RK shown                      │
│ ❌ NO 3BHK shown                     │
│ ❌ NO houses outside price range     │
└──────────────────────────────────────┘
```

## Example Scenario

### User's Intent:
**"I want a 2BHK apartment in Mumbai between ₹15,000-₹25,000"**

### System Response:

#### Step 1-2: Filter Application
```
Database has 100 houses in Mumbai:
- 30 × Hostels/PG (₹5K-₹12K)     ← Will NOT be shown ❌
- 20 × 1RK (₹10K-₹15K)            ← Will NOT be shown ❌
- 25 × 2BHK (₹15K-₹25K)           ← MATCHES FILTER ✅
- 15 × 2BHK (₹30K-₹50K)           ← Outside price range ❌
- 10 × 3BHK (₹25K-₹40K)           ← Wrong type ❌

→ System shows: "25 houses match your filters"
```

#### Step 3: Location Selection
```
User clicks location: (19.0760, 72.8777)

System calculates distance to all 25 matching 2BHK houses:
- House A: 0.5 km ✅
- House B: 0.8 km ✅
- House C: 1.2 km ✅
- House D: 1.5 km ✅
- House E: 2.1 km ✅
- House F: 2.3 km ✅
- House G: 3.0 km ✅
- House H: 3.5 km ✅
- House I: 4.2 km ✅
- House J: 5.0 km ✅
- House K: 6.5 km ← NOT selected
- ... (14 more distant houses) ← NOT selected
```

#### Step 4-5: Payment & Storage
```
User buys plan: 10 houses

Database stores ONLY:
user_accessible_houses table:
┌────────────┬─────────┬────────────┐
│ payment_id │ user_id │ listing_id │
├────────────┼─────────┼────────────┤
│     1      │    5    │    123     │ ← House A (0.5km)
│     1      │    5    │    124     │ ← House B (0.8km)
│     1      │    5    │    125     │ ← House C (1.2km)
│     1      │    5    │    126     │ ← House D (1.5km)
│     1      │    5    │    127     │ ← House E (2.1km)
│     1      │    5    │    128     │ ← House F (2.3km)
│     1      │    5    │    129     │ ← House G (3.0km)
│     1      │    5    │    130     │ ← House H (3.5km)
│     1      │    5    │    131     │ ← House I (4.2km)
│     1      │    5    │    132     │ ← House J (5.0km)
└────────────┴─────────┴────────────┘

House K and others: NOT stored ❌
All hostels: NOT stored ❌
All 1RK: NOT stored ❌
All 3BHK: NOT stored ❌
```

#### Result: What User Sees
```
✅ CAN SEE: Only Houses A-J (the 10 closest 2BHK)
❌ CANNOT SEE: Any hostels, 1RK, 3BHK, or distant houses
✅ FOR: 7 days only
✅ AFTER 7 DAYS: Access expires, must buy new plan
```

## Database Structure

### user_payments (Enhanced)
```sql
┌────────────┬─────────┬──────┬────────────────┬────────────┬──────────────────────┬─────────────┐
│ payment_id │ user_id │ area │ houses_to_view │ amount_paid│ plan_expires_at      │ plan_active │
├────────────┼─────────┼──────┼────────────────┼────────────┼──────────────────────┼─────────────┤
│     1      │    5    │Mumbai│       10       │    80      │ 2026-01-16 10:30:00  │    TRUE     │
└────────────┴─────────┴──────┴────────────────┴────────────┴──────────────────────┴─────────────┘
                                                                    ↑
                                               Today + 7 days (because 10 houses)
```

### user_accessible_houses (New)
```sql
┌────┬────────────┬─────────┬────────────┬──────────────────────┐
│ id │ payment_id │ user_id │ listing_id │     added_at         │
├────┼────────────┼─────────┼────────────┼──────────────────────┤
│  1 │     1      │    5    │    123     │ 2026-01-09 10:30:00 │ ← Only filtered
│  2 │     1      │    5    │    124     │ 2026-01-09 10:30:00 │   houses stored
│  3 │     1      │    5    │    125     │ 2026-01-09 10:30:00 │
│ .. │    ...     │   ...   │    ...     │        ...          │
│ 10 │     1      │    5    │    132     │ 2026-01-09 10:30:00 │
└────┴────────────┴─────────┴────────────┴──────────────────────┘
```

## API Flow

### POST /api/payments/process-payment
```javascript
{
  area: "Mumbai",
  housesToView: 10,
  propertyType: "2BHK",        // ← Filter applied HERE
  minPrice: 15000,              // ← Filter applied HERE
  maxPrice: 25000,              // ← Filter applied HERE
  latitude: 19.0760,
  longitude: 72.8777
}

Backend does:
1. Find houses WHERE city='Mumbai' 
   AND property_type='2BHK' 
   AND rent BETWEEN 15000 AND 25000
   
2. Calculate distance from (19.0760, 72.8777)

3. ORDER BY distance

4. LIMIT 10

5. Insert into user_accessible_houses

Response:
{
  success: true,
  payment: {
    accessibleHouses: 10,  // Only these 10!
    expiryDays: 7
  }
}
```

### GET /api/payments/accessible-houses
```javascript
Request: ?area=Mumbai&user_id=5

Backend does:
SELECT l.* 
FROM listings l
INNER JOIN user_accessible_houses uah 
ON l.listing_id = uah.listing_id
WHERE uah.user_id = 5

Response:
[
  { id: 123, title: "2BHK Near Beach", type: "2BHK", rent: 18000 },
  { id: 124, title: "2BHK City Center", type: "2BHK", rent: 20000 },
  ... (only the 10 accessible houses)
]
```

## Key Differences

### ❌ OLD WRONG WAY:
```
User → Payment → Dashboard → Filters → See All Houses in Area
```
Problem: If area has 100 houses, user sees all 100, then filters

### ✅ NEW CORRECT WAY:
```
User → Filters → Payment → See ONLY Filtered Houses
```
Solution: User applies filters first, only N closest filtered houses stored

## Summary

🎯 **The magic happens in Step 2 (Filters) and Backend Processing:**

1. User selects filters **BEFORE** payment
2. Backend finds **ONLY** houses matching those filters
3. Backend stores **ONLY** the N closest matching houses
4. User can **ONLY** view those specific houses
5. **No way** to see houses outside the filter

**Result:** If user wants 2BHK, they will **NEVER EVER** see hostels! 🎉

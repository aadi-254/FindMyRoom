# 🔧 Payment System - Troubleshooting Guide

## Common Issues & Solutions

### 1. Database Issues

#### Problem: "user_payments table doesn't exist"
**Solution:**
```bash
cd backend
node update-database.js
```
Check output for: ✅ Created user_payments table

#### Problem: Database connection failed
**Solution:**
1. Check if MySQL is running
2. Verify `.env` file in backend folder:
```env
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=findmyroom
```
3. Test connection:
```bash
mysql -u your_user -p
USE findmyroom;
SHOW TABLES;
```

---

### 2. Backend Issues

#### Problem: "Cannot find module './routes/payments.js'"
**Solution:**
- Ensure [payments.js](backend/routes/payments.js) exists in routes folder
- Check file name spelling (case-sensitive on Linux)
- Restart backend server

#### Problem: Backend won't start
**Solution:**
```bash
cd backend
npm install    # Reinstall dependencies
npm start      # Start server
```

#### Problem: 404 on /api/payments endpoints
**Solution:**
- Check [server.js](backend/server.js) has:
```javascript
import paymentsRoutes from './routes/payments.js';
app.use('/api/payments', paymentsRoutes);
```
- Restart server after changes

---

### 3. Frontend Issues

#### Problem: "Cannot find module './components/PaymentSelection'"
**Solution:**
1. Verify files exist:
   - `frontend/src/components/PaymentSelection.jsx`
   - `frontend/src/components/PaymentSelection.css`
   - `frontend/src/components/SearchWithPayment.jsx`
   - `frontend/src/components/SearchWithPayment.css`

2. Check imports in [App.jsx](frontend/src/App.jsx):
```javascript
import SearchWithPayment from './components/SearchWithPayment'
```

#### Problem: Payment screen not showing
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check browser console for errors (F12)
3. Verify you're logged in as "Taker" role
4. Check localStorage: `localStorage.getItem('token')`

#### Problem: Blank screen after payment
**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify API response:
```javascript
// In browser console
fetch('http://localhost:5000/api/payments/areas', {
  headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
})
.then(r => r.json())
.then(console.log)
```

---

### 4. Authentication Issues

#### Problem: "Please login to continue"
**Solution:**
1. Check if token exists:
```javascript
localStorage.getItem('token')  // Should return JWT token
```
2. If null, logout and login again
3. Verify token is sent in headers:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

#### Problem: Token expired
**Solution:**
- Logout and login again
- Check token expiration in backend
- Implement token refresh (future enhancement)

---

### 5. Payment Flow Issues

#### Problem: No areas showing in dropdown
**Solution:**
1. Check if listings have 'area' field populated
2. Verify database:
```sql
SELECT DISTINCT area FROM listings WHERE available = TRUE;
```
3. If empty, add area to existing listings:
```sql
UPDATE listings SET area = city WHERE area IS NULL;
```

#### Problem: House count showing 0
**Solution:**
1. Check listings table:
```sql
SELECT COUNT(*) FROM listings WHERE area = 'YourArea' AND available = TRUE;
```
2. Ensure 'available' field is TRUE
3. Update listings if needed:
```sql
UPDATE listings SET available = TRUE WHERE listing_id = ?;
```

#### Problem: Payment not processing
**Solution:**
1. Check browser console for errors
2. Verify API endpoint:
```bash
curl -X POST http://localhost:5000/api/payments/process-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"area":"Downtown","housesToView":10}'
```
3. Check backend logs for errors

#### Problem: After payment, still seeing locked content
**Solution:**
1. Check payment was recorded:
```sql
SELECT * FROM user_payments WHERE user_id = YOUR_USER_ID;
```
2. Verify payment_status = 'completed'
3. Check houses_viewed < houses_to_view
4. Refresh page or re-login

---

### 6. Access Control Issues

#### Problem: Seeing locked content even after payment
**Solution:**
1. Verify area matches:
   - Paid for: "Downtown"
   - Searching in: "downtown" ❌
   - Area names are case-sensitive!

2. Check active payment:
```javascript
// In browser console
fetch('http://localhost:5000/api/payments/check-access?area=Downtown', {
  headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
})
.then(r => r.json())
.then(console.log)
```

#### Problem: Counter not decreasing
**Solution:**
1. Check if middleware is called
2. Verify SQL query executes:
```sql
SELECT houses_viewed FROM user_payments 
WHERE user_id = ? AND area = ?;
```
3. Check backend logs for errors

---

### 7. Display Issues

#### Problem: CSS not loading / looks broken
**Solution:**
1. Verify CSS files exist and are imported
2. Clear browser cache
3. Check for CSS syntax errors
4. Inspect element (F12) to see applied styles

#### Problem: Modal not appearing
**Solution:**
1. Check z-index in CSS (should be 1000+)
2. Verify overlay class exists
3. Check if parent has `position: relative`
4. Look for JavaScript errors blocking render

---

### 8. Development Issues

#### Problem: Hot reload not working
**Solution:**
```bash
# Stop both servers
# Restart frontend
cd frontend
npm run dev

# Restart backend
cd backend
npm start
```

#### Problem: Port already in use
**Solution:**
```bash
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
```

---

### 9. Data Issues

#### Problem: Payment history not showing
**Solution:**
```sql
-- Check if payments exist
SELECT * FROM user_payments WHERE user_id = ?;

-- Check table structure
DESCRIBE user_payments;
```

#### Problem: Duplicate area names
**Solution:**
```sql
-- Standardize area names
UPDATE listings SET area = TRIM(area);
UPDATE listings SET area = INITCAP(area);  -- If available
```

---

### 10. Testing Issues

#### Problem: Can't test with multiple users
**Solution:**
1. Create multiple test accounts
2. Use different browsers/incognito windows
3. Clear localStorage between tests:
```javascript
localStorage.clear()
```

#### Problem: Need to reset payment data
**Solution:**
```sql
-- Delete all payments (WARNING: This deletes data!)
DELETE FROM user_payments WHERE user_id = ?;

-- Or reset counter
UPDATE user_payments SET houses_viewed = 0 WHERE payment_id = ?;
```

---

## Debugging Commands

### Check Database Status
```sql
-- Show all tables
SHOW TABLES;

-- Check table structure
DESCRIBE user_payments;

-- View recent payments
SELECT * FROM user_payments ORDER BY payment_date DESC LIMIT 10;

-- Check user's active payments
SELECT * FROM user_payments 
WHERE user_id = ? AND houses_viewed < houses_to_view;
```

### Check API Endpoints
```bash
# Test areas endpoint
curl http://localhost:5000/api/payments/areas

# Test with authentication
curl http://localhost:5000/api/payments/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Browser Console Debugging
```javascript
// Check authentication
console.log(localStorage.getItem('token'))
console.log(JSON.parse(localStorage.getItem('user')))

// Test API call
fetch('http://localhost:5000/api/payments/areas', {
  headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
})
.then(r => r.json())
.then(console.log)
.catch(console.error)

// Check component state (in React DevTools)
// Look for SearchWithPayment component
```

---

## Error Messages & Meanings

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "Please login to continue" | No token found | Login again |
| "Area is required" | Missing area parameter | Check API call |
| "No houses available" | No listings in area | Add listings or try different area |
| "Payment processing failed" | Backend error | Check server logs |
| "Failed to load areas" | API error | Check backend connection |
| "No active payment found" | Payment expired/used | Make new payment |

---

## Still Having Issues?

### 1. Check Console Logs
- Backend console: Look for error stack traces
- Browser console (F12): Check for JavaScript errors
- Network tab: Verify API requests/responses

### 2. Verify File Structure
```
backend/
├── routes/
│   ├── payments.js ✓
│   └── listings.js ✓
├── server.js ✓
└── update-database.js ✓

frontend/src/
├── components/
│   ├── PaymentSelection.jsx ✓
│   ├── PaymentSelection.css ✓
│   ├── SearchWithPayment.jsx ✓
│   └── SearchWithPayment.css ✓
└── App.jsx ✓
```

### 3. Reset Everything
```bash
# Backend
cd backend
rm -rf node_modules
npm install
node update-database.js
npm start

# Frontend
cd frontend
rm -rf node_modules
npm install
npm run dev

# Browser
Clear cache and cookies
Logout and login again
```

### 4. Check Versions
```bash
node --version   # Should be 14+
npm --version    # Should be 6+
mysql --version  # Should be 5.7+
```

---

## Getting Help

If issues persist:
1. Check the implementation files
2. Review [PAYMENT_IMPLEMENTATION.md](PAYMENT_IMPLEMENTATION.md)
3. Check [PAYMENT_SYSTEM_README.md](PAYMENT_SYSTEM_README.md)
4. Enable debug mode in backend
5. Use React DevTools for frontend debugging

---

**Last Updated**: January 7, 2026

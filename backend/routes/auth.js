import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const router = express.Router();

// Helper function to check if email or phone exists
const checkUserExists = async (email, phone = null) => {
  let query = 'SELECT * FROM users WHERE email = ?';
  let params = [email];
  
  if (phone) {
    query += ' OR phone = ?';
    params.push(phone);
  }
  
  const [rows] = await pool.execute(query, params);
  return rows.length > 0 ? rows[0] : null;
};

// SIGNUP Route
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, role, phone, gender, bio } = req.body;

    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Full name, email, password, and role are required' 
      });
    }

    // Check if user already exists
    const existingUser = await checkUserExists(email, phone);
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (full_name, email, password, role, phone, gender, bio) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(insertQuery, [
      full_name,
      email,
      hashedPassword,
      role,
      phone || null,
      gender || null,
      bio || null
    ]);

    // Get the created user
    const [newUser] = await pool.execute(
      'SELECT user_id, full_name, email, role, phone, gender, bio, created_at FROM users WHERE user_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: newUser[0]
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// LOGIN Route
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Validation
    if (!emailOrPhone || !password) {
      return res.status(400).json({ 
        message: 'Email/phone and password are required' 
      });
    }

    // Check if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const query = isEmail 
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE phone = ?';

    const [users] = await pool.execute(query, [emailOrPhone]);
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Remove password from user object
    const { password: userPassword, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [users] = await pool.execute(
      'SELECT user_id, full_name, email, role, phone, gender, bio, points, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Get user by ID (alias for profile endpoint)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [users] = await pool.execute(
      'SELECT user_id, full_name, email, role, phone, gender, bio, points, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Update user profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone, gender, bio } = req.body;

    const updateQuery = `
      UPDATE users 
      SET full_name = ?, phone = ?, gender = ?, bio = ? 
      WHERE user_id = ?
    `;

    await pool.execute(updateQuery, [
      full_name,
      phone || null,
      gender || null,
      bio || null,
      userId
    ]);

    // Get updated user data
    const [users] = await pool.execute(
      'SELECT user_id, full_name, email, role, phone, gender, bio, points, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
const { getDb } = require('../database/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

const signup = async (req, res) => {
  const db = getDb();
  const { username, email, mobile, password } = req.body || {};

  if (!username || !email || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 OR mobile = $3',
      [email, username, mobile]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email, username, or mobile already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, mobile, password) VALUES ($1, $2, $3, $4) RETURNING id, username, email, mobile',
      [username, email, mobile, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    return res.status(201).json({
      message: 'User created successfully',
      token,
      user
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'User with this email, username, or mobile already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const db = getDb();
  const { identifier, email, password } = req.body || {};
  const rawIdentifier = String(identifier || email || '').trim();

  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: 'Username, email, or phone and password are required' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) OR mobile = $1',
      [rawIdentifier]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getProfile = async (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT id, username, email, mobile, profile_image, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { username, mobile, profile_image } = req.body || {};

  if (!username && !mobile && profile_image === undefined) {
    return res.status(400).json({ error: 'At least one field (username, mobile, or profile image) is required' });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (username) {
    updates.push(`username = $${idx++}`);
    params.push(username);
  }
  if (mobile) {
    updates.push(`mobile = $${idx++}`);
    params.push(mobile);
  }
  if (profile_image !== undefined) {
    updates.push(`profile_image = $${idx++}`);
    params.push(profile_image);
  }

  params.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, mobile, profile_image, created_at`;

  try {
    const result = await db.query(query, params);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or mobile already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
};

const forgotPasswordVerify = async (req, res) => {
  const db = getDb();
  const email = String(req.body?.email || '').trim();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Email not registered. Please enter your registered email.' });
    }
    return res.json({ message: 'Email verified' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const db = getDb();
  const email = String(req.body?.email || '').trim();
  const { newPassword } = req.body || {};

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const userResult = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Email not registered. Please enter your registered email.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update password' });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  forgotPasswordVerify,
  resetPassword,
};

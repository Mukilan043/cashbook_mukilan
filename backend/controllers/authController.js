const { getDb } = require('../database/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

const signup = async (req, res) => {
  const db = getDb();
  const { username, email, mobile, password } = req.body;

  // Validation
  if (!username || !email || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if user already exists
  db.get('SELECT * FROM users WHERE email = ? OR username = ? OR mobile = ?', 
    [email, username, mobile], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email, username, or mobile already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    db.run(
      'INSERT INTO users (username, email, mobile, password) VALUES (?, ?, ?, ?)',
      [username, email, mobile, hashedPassword],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const token = generateToken({ id: this.lastID, username, email });
        res.status(201).json({
          message: 'User created successfully',
          token,
          user: {
            id: this.lastID,
            username,
            email,
            mobile
          }
        });
      }
    );
  });
};

const login = (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile
      }
    });
  });
};

const getProfile = (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  db.get('SELECT id, username, email, mobile, profile_image, created_at FROM users WHERE id = ?', 
    [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });
};

const updateProfile = (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { username, mobile, profile_image } = req.body;

  if (!username && !mobile && profile_image === undefined) {
    return res.status(400).json({ error: 'At least one field (username, mobile, or profile image) is required' });
  }

  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (mobile) {
    updates.push('mobile = ?');
    params.push(mobile);
  }
  if (profile_image !== undefined) {
    updates.push('profile_image = ?');
    params.push(profile_image);
  }

  params.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'Username or mobile already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user
    db.get('SELECT id, username, email, mobile, profile_image, created_at FROM users WHERE id = ?', 
      [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Profile updated successfully', user });
    });
  });
};

const forgotPasswordVerify = (req, res) => {
  const db = getDb();
  const email = String(req.body?.email || '').trim();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'Email not registered. Please enter your registered email.' });
    }

    return res.json({ message: 'Email verified' });
  });
};

const resetPassword = (req, res) => {
  const db = getDb();
  const email = String(req.body?.email || '').trim();
  const { newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'Email not registered. Please enter your registered email.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, user.id],
        function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          return res.json({ message: 'Password updated successfully' });
        }
      );
    } catch (hashErr) {
      return res.status(500).json({ error: 'Failed to update password' });
    }
  });
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  forgotPasswordVerify,
  resetPassword,
};

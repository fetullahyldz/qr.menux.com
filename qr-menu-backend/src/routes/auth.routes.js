const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('Login failed: Missing username or password');
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre gereklidir'
      });
    }

    try {
      // Try to use database for normal login
      console.log('Attempting database login for user:', username);

      // Find user
      const user = await db.getOne('SELECT * FROM users WHERE username = ?', [username]);

      // Check if user exists
      if (!user) {
        console.log('User not found in database, checking fallback login');
        // Fall back to test login if database user not found
        if (username === user.username && password === user.password) {
          console.log('Admin fallback login successful');
          // Create JWT token for test admin user
          const token = jwt.sign(
            {
              id: 1,
              username: user.username,
              role: user.role
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );

          return res.json({
            success: true,
            token,
            user: {
              id: 1,
              username: user.username,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role,
              is_active: user.is_active
            }
          });
        }

        console.log('Authentication failed: Invalid username');
        return res.status(401).json({
          success: false,
          message: 'Geçersiz kullanıcı adı veya şifre'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        console.log('Authentication failed: Inactive account');
        return res.status(403).json({
          success: false,
          message: 'Bu hesap aktif değil. Lütfen yönetici ile iletişime geçin.'
        });
      }

      // Check password
      console.log('Verifying password for user:', user.username);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('Authentication failed: Invalid password');
        return res.status(401).json({
          success: false,
          message: 'Geçersiz kullanıcı adı veya şifre'
        });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Remove password from user object
      delete user.password;

      console.log('Authentication successful for user:', user.username);
      return res.json({
        success: true,
        token,
        user
      });
    } catch (dbError) {
      console.error('Database login error:', dbError);

      // Use test login if database fails
      if (username === this.use.username && password === this.use.password) {
        console.log('Admin fallback login (DB error) successful');
        // Create JWT token for test admin user
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active
          }
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken bir hata oluştu',
      error: error.message
    });
  }
});

// Register route (admin only)
router.post('/register', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, email ve şifre gereklidir'
      });
    }

    // Check if username already exists
    const existingUsername = await db.getOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı adı zaten kullanılıyor'
      });
    }

    // Check if email already exists
    const existingEmail = await db.getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await db.run(
      'INSERT INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [
        username,
        email,
        hashedPassword,
        first_name || null,
        last_name || null,
        role || 'waiter'
      ]
    );

    if (!result || !result.insertId) {
      throw new Error('Kullanıcı oluşturma başarısız oldu');
    }

    // Get created user (without password)
    const newUser = await db.getOne('SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: newUser
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting profile for user ID:', userId);

    // Get user data
    const user = await db.getOne(
      'SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    console.log('User profile retrieved successfully');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken bir hata oluştu',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email, current_password, new_password } = req.body;

    // Check if user exists
    const user = await db.getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    // Add fields if provided
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }

    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }

    if (email !== undefined && email !== user.email) {
      // Check if email is already in use
      const existingEmail = await db.getOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Bu email adresi zaten kullanılıyor'
        });
      }

      updates.push('email = ?');
      params.push(email);
    }

    // If password change is requested
    if (current_password && new_password) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Mevcut şifre yanlış'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);

      updates.push('password = ?');
      params.push(hashedPassword);
    }

    // If no updates, return success
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          is_active: user.is_active
        }
      });
    }

    // Complete the SQL query
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(userId);

    // Update user
    await db.run(sql, params);

    // Get updated user
    const updatedUser = await db.getOne(
      'SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;

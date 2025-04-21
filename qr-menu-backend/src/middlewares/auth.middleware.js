const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Token authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({
    success: false,
    message: 'Yetkilendirme token\'ı bulunamadı'
  });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({
      success: false,
      message: 'Token geçersiz'
    });

    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({
      success: false,
      message: 'Kullanıcı yetkilendirmesi gereklidir'
    });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};

const jwt = require('jsonwebtoken');
require('dotenv').config();
const { pool } = require('../config/db');

/**
 * JWT Authentication Middleware
 * Verifies the token from Authorization header and attaches user info to req.user
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecommerce_secret_key');
    
    if (decoded.role === 'admin') {
      const [rows] = await pool.execute('SELECT Admin_ID FROM admins WHERE Admin_ID = ?', [decoded.id]);
      if (rows.length === 0) return res.status(401).json({ success: false, message: 'Session expired. Admin no longer exists.' });
    } else {
      const [rows] = await pool.execute('SELECT Customer_ID FROM customers WHERE Customer_ID = ?', [decoded.id]);
      if (rows.length === 0) return res.status(401).json({ success: false, message: 'Session expired. Customer no longer exists.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}
/**
 * Generate JWT Token
 */
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'ecommerce_secret_key', { expiresIn: '24h' });
}

module.exports = { authenticateToken, generateToken };

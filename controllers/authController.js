const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { generateId, isValidEmail, isValidMobile, isValidPassword } = require('../utils/helpers');

/**
 * POST /api/auth/register
 * Register a new customer
 */
async function register(req, res) {
  try {
    const { name, email, password, mobile, address } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (mobile && !isValidMobile(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits.' });
    }

    // Check if email already exists
    const [existing] = await pool.execute('SELECT Customer_ID FROM customers WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique customer ID
    const customerId = generateId('CUS');

    // Insert customer
    await pool.execute(
      'INSERT INTO customers (Customer_ID, Name, Email, Password, Mobile_No, Address) VALUES (?, ?, ?, ?, ?, ?)',
      [customerId, name, email, hashedPassword, mobile || null, address || null]
    );

    // Generate token
    const token = generateToken({ id: customerId, email, role: 'customer', name });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: { id: customerId, name, email, role: 'customer' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

/**
 * POST /api/auth/login
 * Login for both customers and admins
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check admin first
    const [admins] = await pool.execute('SELECT * FROM admins WHERE Email = ?', [email]);
    if (admins.length > 0) {
      const admin = admins[0];
      const isMatch = await bcrypt.compare(password, admin.Password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = generateToken({ id: admin.Admin_ID, email: admin.Email, role: 'admin', name: admin.Name });
      return res.json({
        success: true,
        message: 'Admin login successful.',
        token,
        user: { id: admin.Admin_ID, name: admin.Name, email: admin.Email, role: 'admin' }
      });
    }

    // Check customer
    const [customers] = await pool.execute('SELECT * FROM customers WHERE Email = ?', [email]);
    if (customers.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const customer = customers[0];
    const isMatch = await bcrypt.compare(password, customer.Password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken({ id: customer.Customer_ID, email: customer.Email, role: 'customer', name: customer.Name });
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: customer.Customer_ID, name: customer.Name, email: customer.Email, role: 'customer' }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

/**
 * GET /api/auth/profile
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    const { id, role } = req.user;

    if (role === 'admin') {
      const [rows] = await pool.execute('SELECT Admin_ID, Name, Email, Mobile_No, Created_At FROM admins WHERE Admin_ID = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
      return res.json({ success: true, user: { ...rows[0], role: 'admin' } });
    }

    const [rows] = await pool.execute('SELECT Customer_ID, Name, Email, Mobile_No, Address, Created_At FROM customers WHERE Customer_ID = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, user: { ...rows[0], role: 'customer' } });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ==========================================
// OTP STORAGE (in-memory, keyed by email)
// ==========================================
const otpStore = new Map(); // email -> { otp, expiresAt, userType, userName }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/forgot-password
 * Send OTP to user's email
 */
async function sendOTP(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Check customers table
    let userType = null;
    let userName = null;
    const [customers] = await pool.execute('SELECT Customer_ID, Name, Email FROM customers WHERE Email = ?', [email]);
    if (customers.length > 0) {
      userType = 'customer';
      userName = customers[0].Name;
    }

    // Check admins table
    if (!userType) {
      const [admins] = await pool.execute('SELECT Admin_ID, Name, Email FROM admins WHERE Email = ?', [email]);
      if (admins.length > 0) {
        userType = 'admin';
        userName = admins[0].Name;
      }
    }

    if (!userType) {
      // Don't reveal whether the email exists
      return res.json({ success: true, message: 'If an account with that email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { otp, expiresAt, userType, userName });

    console.log('📧 OTP requested for:', email);
    console.log('   OTP:', otp, '(expires in 10 min)');

    // Send email via nodemailer
    const nodemailer = require('nodemailer');

    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: (process.env.SMTP_SECURE === 'true'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };
      if (process.env.SMTP_HOST.includes('gmail')) {
        smtpConfig.service = 'gmail';
      }
      console.log('   SMTP Host:', process.env.SMTP_HOST, '| User:', process.env.SMTP_USER);
      transporter = nodemailer.createTransport(smtpConfig);
    } else {
      console.log('   ⚠️ No SMTP config, using Ethereal');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ShopVault" <noreply@shopvault.com>',
      to: email,
      subject: '🔐 ShopVault — Your Password Reset OTP',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f1729; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 8px;">🛒</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">ShopVault</h1>
          </div>
          <div style="padding: 32px; color: #e2e8f0;">
            <h2 style="color: #f1f5f9; margin-top: 0;">Password Reset OTP</h2>
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your one-time password (OTP) for resetting your password is:</p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 48px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px;">
                ${otp}
              </div>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;">
            <p style="font-size: 12px; color: #64748b;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `
    };

    console.log('   Sending OTP email to:', email, '...');
    const info = await transporter.sendMail(mailOptions);
    console.log('   ✅ OTP email sent! Message ID:', info.messageId);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('   📧 Preview URL:', previewUrl);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
      ...(previewUrl ? { previewUrl } : {})
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error sending OTP.' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Verify the OTP entered by user
 */
async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const stored = otpStore.get(email.toLowerCase());

    if (!stored) {
      return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid — generate a short-lived reset token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'ecommerce_secret_key';
    const resetToken = jwt.sign(
      { email, userType: stored.userType, purpose: 'password_reset' },
      secret,
      { expiresIn: '10m' }
    );

    // Remove used OTP
    otpStore.delete(email.toLowerCase());

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using the verified reset token
 */
async function resetPasswordWithOTP(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Verify the reset token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'ecommerce_secret_key';
    let decoded;
    try {
      decoded = jwt.verify(resetToken, secret);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Session expired. Please start over.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token.' });
    }

    const { email, userType } = decoded;

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (userType === 'customer') {
      await pool.execute('UPDATE customers SET Password = ? WHERE Email = ?', [hashedPassword, email]);
    } else if (userType === 'admin') {
      await pool.execute('UPDATE admins SET Password = ? WHERE Email = ?', [hashedPassword, email]);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type.' });
    }

    res.json({ success: true, message: 'Password reset successfully! You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
}

module.exports = { register, login, getProfile, sendOTP, verifyOTP, resetPasswordWithOTP };

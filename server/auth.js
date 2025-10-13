// Authentication middleware and utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

// JWT secret - MUST be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// Security check: Ensure JWT_SECRET is configured
if (!JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET is not set in environment variables!');
  console.error('Please add JWT_SECRET to server/.env file.');
  process.exit(1);
}

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Register new user
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password requirements
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check for at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ error: 'Password must contain both letters and numbers.' });
    }

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM reguser WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user (default role is 'Read Only Admin')
    const [result] = await db.execute(
      'INSERT INTO reguser (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, 'Read Only Admin']
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email, firstName, lastName, role: 'Read Only Admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        firstName,
        lastName,
        email,
        role: 'Read Only Admin'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT id, first_name, last_name, email, password_hash, role FROM reguser WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    await db.execute(
      'UPDATE reguser SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'Webapp Admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role || 'Webapp Admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// Verify token endpoint
export const verifyToken = (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
};

// Middleware to check for Top Gun role
export const requireTopGun = (req, res, next) => {
  if (!req.user || req.user.role !== 'Top Gun') {
    return res.status(403).json({ error: 'Access denied. Top Gun role required.' });
  }
  next();
};

// Middleware to check for write permissions (blocks Read Only Admin from write operations)
export const requireWritePermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Read Only Admin cannot perform write operations
  if (req.user.role === 'Read Only Admin') {
    return res.status(403).json({ error: 'Access denied. Read-only access only.' });
  }

  next();
};

// Helper function to check if user has read access
export const hasReadAccess = (role) => {
  return ['Top Gun', 'Webapp Admin', 'Read Only Admin'].includes(role);
};

// Helper function to check if user has write access
export const hasWriteAccess = (role) => {
  return ['Top Gun', 'Webapp Admin'].includes(role);
};

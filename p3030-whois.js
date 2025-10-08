// p3030_whois.js (run with: node p3030_whois.js or pm2 start p3030_whois.js)

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from './server/db.js';
import { authenticateToken, register, login, verifyToken } from './server/auth.js';

// __dirname workaround in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3030;

app.use(cors());
app.use(express.json());

// Authentication routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/verify', authenticateToken, verifyToken);


// ISP logo folder
// const logoFolder = '/var/www/whois.ciscoar.com/public/img/us_isp_logos';
const logoFolder = path.join(__dirname, 'public', 'img', 'us_isp_logos');

app.post('/whois', async (req, res) => {
  const { ip, wan } = req.body;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'Invalid IP address' });
  }

  // Get visitor information
  const visitorIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || req.headers['referrer'] || '';
  const wanPanel = wan || 'unknown';

  exec(`sh ${path.join(__dirname, 'server', 'whois.sh')} ${ip}`, async (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(500).json({ error: 'Lookup failed' });
    }

    const output = stdout.trim();
    const lines = output.split('\n').map(line => line.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Check both the first and last lines for a match
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];

    // Read the list of logo files
    const logoFiles = fs.readdirSync(logoFolder);

    // Find a matching logo file by checking both lines
    const matchedLogo = logoFiles.find((file) => {
        const fileName = path.basename(file, path.extname(file)).toLowerCase();
        const processedFileName = fileName.replace(/[^a-z0-9]/g, '');
        const filenameParts = fileName.split(/[^a-z0-9]+/).filter(part => part.length > 0);

        // Return true if either the first or last line includes the processed filename
        // OR if any part of the filename (split by underscores) matches the output
        return firstLine.includes(processedFileName) ||
               lastLine.includes(processedFileName) ||
               filenameParts.some(part => firstLine.includes(part) || lastLine.includes(part));
    });

    const logo = matchedLogo || 'generic_logo.png';

    // Log to database
    try {
      await db.execute(
        'INSERT INTO whois_queries (searched_ip, organization_name, matched_logo, visitor_ip, user_agent, referer, wan_panel) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ip, output, logo, visitorIp, userAgent, referer, wanPanel]
      );
    } catch (dbError) {
      console.error('Database logging error:', dbError);
      // Continue even if logging fails
    }

    res.json({ output, logo });
  });
});
// app.post('/whois', (req, res) => {
//   const { ip } = req.body;

//   if (!ip || typeof ip !== 'string') {
//     return res.status(400).json({ error: 'Invalid IP address' });
//   }

//   exec(`sh ${path.join(__dirname, 'server', 'whois.sh')} ${ip}`, (error, stdout, stderr) => {
//     if (error || stderr) {
//       return res.status(500).json({ error: 'Lookup failed' });
//     }

//     const output = stdout.trim();
//     const lines = output.split('\n');
//     const lastLine = lines[lines.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');

//     // Try to find matching logo file
//     const logoFiles = fs.readdirSync(logoFolder);
//     const matchedLogo = logoFiles.find((file) =>
//       lastLine.includes(path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]/g, ''))
//     );

//     const logo = matchedLogo || 'generic_logo.png';

//     res.json({ output, logo });
//   });
// });

// Get total query count
app.get('/api/stats/count', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT COUNT(*) as total FROM whois_queries');
    res.json({ total: rows[0].total });
  } catch (error) {
    console.error('Error fetching count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// Admin dashboard - Get queries with pagination, search, and sorting (Protected)
app.get('/api/admin/queries', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'searched_ip', 'organization_name', 'visitor_ip', 'created_at', 'wan_panel'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Build search query
    let whereClause = '';
    let queryParams = [];
    if (search) {
      whereClause = 'WHERE searched_ip LIKE ? OR organization_name LIKE ? OR visitor_ip LIKE ? OR matched_logo LIKE ?';
      const searchPattern = `%${search}%`;
      queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM whois_queries ${whereClause}`;
    const [countRows] = await db.execute(countQuery, queryParams);
    const total = countRows[0].total;

    // Get paginated results
    const dataQuery = `
      SELECT id, searched_ip, organization_name, matched_logo, visitor_ip, user_agent, referer, wan_panel, created_at
      FROM whois_queries
      ${whereClause}
      ORDER BY ${safeSortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(dataQuery, [...queryParams, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Delete query by ID (Protected)
app.delete('/api/admin/queries/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid query ID' });
    }

    // Delete the query
    const [result] = await db.execute('DELETE FROM whois_queries WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({ message: 'Query deleted successfully', id });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ error: 'Failed to delete query' });
  }
});

// Get all users with pagination (Protected)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'first_name', 'last_name', 'email', 'created_at', 'last_login'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Build search query
    let whereClause = '';
    let queryParams = [];
    if (search) {
      whereClause = 'WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?';
      const searchPattern = `%${search}%`;
      queryParams = [searchPattern, searchPattern, searchPattern];
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countRows] = await db.execute(countQuery, queryParams);
    const total = countRows[0].total;

    // Get paginated results (exclude password_hash)
    const dataQuery = `
      SELECT id, first_name, last_name, email, created_at, last_login
      FROM users
      ${whereClause}
      ORDER BY ${safeSortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(dataQuery, [...queryParams, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user by ID (Protected)
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, email } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate input
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already in use by another user' });
    }

    // Update the user
    const [result] = await db.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [firstName, lastName, email, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', id });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user by ID (Protected)
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent deleting yourself (optional safety check)
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete the user
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', id });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Serve static files from public directory
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`WHOIS service listening at http://localhost:${port}`);
});

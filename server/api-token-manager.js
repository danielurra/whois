// API Token Management Module
import crypto from 'crypto';
import db from './db.js';

/**
 * Generate a secure random API token using Node.js crypto library
 * Format: whois_[32 bytes of random hex]
 * @returns {Object} Object containing the token and its hash
 */
export const generateApiToken = () => {
  // Generate 32 random bytes (256 bits) and convert to hex
  const randomBytes = crypto.randomBytes(32);
  const token = `whois_${randomBytes.toString('hex')}`;

  // Create a hash of the token for secure storage
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return { token, tokenHash };
};

/**
 * Hash a token for verification
 * @param {string} token - The token to hash
 * @returns {string} The hashed token
 */
export const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Create a new API user
 * @param {Object} userData - User data (firstName, lastName, email, phone, website, notes)
 * @param {number} createdBy - ID of the admin user creating this API user
 * @returns {Promise<Object>} The created user data
 */
export const createApiUser = async (userData, createdBy) => {
  const { firstName, lastName, email, phone, website, notes } = userData;

  // Validate required fields
  if (!firstName || !lastName || !email) {
    throw new Error('First name, last name, and email are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Check if user with this email already exists
  const [existingUsers] = await db.execute(
    'SELECT id FROM api_users WHERE email = ?',
    [email]
  );

  if (existingUsers.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Insert new API user
  const [result] = await db.execute(
    `INSERT INTO api_users (first_name, last_name, email, phone, website, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [firstName, lastName, email, phone || null, website || null, notes || null, createdBy]
  );

  return {
    id: result.insertId,
    firstName,
    lastName,
    email,
    phone,
    website,
    notes
  };
};

/**
 * Create a new API token for a user
 * @param {Object} tokenData - Token configuration
 * @returns {Promise<Object>} The created token (including the plain token - show only once!)
 */
export const createApiToken = async (tokenData) => {
  const {
    userId,
    name,
    expiresInDays,
    rateLimit,
    scope,
    ipWhitelist,
    createdBy
  } = tokenData;

  // Validate required fields
  if (!userId || !name) {
    throw new Error('User ID and token name are required');
  }

  // Check if user exists
  const [users] = await db.execute('SELECT id FROM api_users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new Error('API user not found');
  }

  // Generate token
  const { token, tokenHash } = generateApiToken();

  // Calculate expiration date if specified
  let expiresAt = null;
  if (expiresInDays && expiresInDays > 0) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiresInDays);
    expiresAt = expirationDate;
  }

  // Parse IP whitelist if provided
  const ipWhitelistJson = ipWhitelist ? JSON.stringify(ipWhitelist) : null;

  // Insert token
  const [result] = await db.execute(
    `INSERT INTO api_tokens
     (user_id, token, token_hash, name, expires_at, rate_limit, scope, ip_whitelist, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      token,
      tokenHash,
      name,
      expiresAt,
      rateLimit || 1000,
      scope || 'read',
      ipWhitelistJson,
      createdBy
    ]
  );

  return {
    id: result.insertId,
    token, // IMPORTANT: This is the only time the plain token is returned!
    name,
    expiresAt,
    rateLimit: rateLimit || 1000,
    scope: scope || 'read',
    ipWhitelist
  };
};

/**
 * Verify an API token
 * @param {string} token - The token to verify
 * @returns {Promise<Object|null>} Token data if valid, null if invalid
 */
export const verifyApiToken = async (token) => {
  if (!token || !token.startsWith('whois_')) {
    return null;
  }

  const tokenHash = hashToken(token);

  const [tokens] = await db.execute(
    `SELECT t.*, u.email, u.status as user_status
     FROM api_tokens t
     JOIN api_users u ON t.user_id = u.id
     WHERE t.token_hash = ? AND t.status = 'active'`,
    [tokenHash]
  );

  if (tokens.length === 0) {
    return null;
  }

  const tokenData = tokens[0];

  // Check if token is expired
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    // Mark as expired
    await db.execute(
      'UPDATE api_tokens SET status = ? WHERE id = ?',
      ['expired', tokenData.id]
    );
    return null;
  }

  // Check if user is active
  if (tokenData.user_status !== 'active') {
    return null;
  }

  // Update last used timestamp and usage count
  await db.execute(
    'UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE id = ?',
    [tokenData.id]
  );

  return tokenData;
};

/**
 * Check rate limit for a token
 * @param {number} tokenId - The token ID
 * @param {number} rateLimit - Requests per hour allowed
 * @returns {Promise<Object>} Rate limit status
 */
export const checkRateLimit = async (tokenId, rateLimit) => {
  // Get usage in the last hour
  const [usage] = await db.execute(
    `SELECT COUNT(*) as count
     FROM api_token_usage
     WHERE token_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [tokenId]
  );

  const currentUsage = usage[0].count;
  const remaining = Math.max(0, rateLimit - currentUsage);
  const isLimited = currentUsage >= rateLimit;

  return {
    limit: rateLimit,
    remaining,
    used: currentUsage,
    isLimited
  };
};

/**
 * Log API token usage
 * @param {Object} usageData - Usage log data
 */
export const logTokenUsage = async (usageData) => {
  const {
    tokenId,
    userId,
    endpoint,
    method,
    ipAddress,
    userAgent,
    responseStatus,
    responseTimeMs
  } = usageData;

  await db.execute(
    `INSERT INTO api_token_usage
     (token_id, user_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tokenId, userId, endpoint, method, ipAddress, userAgent, responseStatus, responseTimeMs]
  );
};

/**
 * Revoke an API token
 * @param {number} tokenId - The token ID to revoke
 * @param {number} revokedBy - ID of the admin revoking the token
 * @param {string} reason - Reason for revocation
 */
export const revokeApiToken = async (tokenId, revokedBy, reason = null) => {
  const [result] = await db.execute(
    `UPDATE api_tokens
     SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = ?, revoked_reason = ?
     WHERE id = ?`,
    [revokedBy, reason, tokenId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Token not found');
  }
};

/**
 * Update API token status
 * @param {number} tokenId - The token ID
 * @param {string} status - New status (active, inactive, revoked)
 */
export const updateTokenStatus = async (tokenId, status) => {
  const validStatuses = ['active', 'inactive', 'revoked', 'expired'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  await db.execute(
    'UPDATE api_tokens SET status = ? WHERE id = ?',
    [status, tokenId]
  );
};

/**
 * Get all API users with pagination and search
 */
export const getApiUsers = async (options = {}) => {
  const {
    page = 1,
    limit = 50,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;
  const allowedSortFields = ['id', 'first_name', 'last_name', 'email', 'created_at', 'status'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let whereClause = '';
  let queryParams = [];

  if (search) {
    whereClause = 'WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?';
    const searchPattern = `%${search}%`;
    queryParams = [searchPattern, searchPattern, searchPattern, searchPattern];
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM api_users ${whereClause}`;
  const [countRows] = await db.execute(countQuery, queryParams);
  const total = countRows[0].total;

  // Get paginated data
  const dataQuery = `
    SELECT id, first_name, last_name, email, phone, website, notes, status, created_at, updated_at
    FROM api_users
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  const [rows] = await db.execute(dataQuery, [...queryParams, limit, offset]);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get tokens for a specific user
 */
export const getUserTokens = async (userId) => {
  const [tokens] = await db.execute(
    `SELECT id, name, expires_at, rate_limit, status, scope, last_used_at, usage_count, created_at
     FROM api_tokens
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return tokens;
};

/**
 * Get all tokens with user information
 */
export const getAllTokens = async (options = {}) => {
  const {
    page = 1,
    limit = 50,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
    status = null
  } = options;

  const offset = (page - 1) * limit;
  const allowedSortFields = ['id', 'name', 'user_email', 'expires_at', 'status', 'created_at'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let whereClause = '';
  let queryParams = [];

  const conditions = [];

  if (search) {
    conditions.push('(t.name LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (status) {
    conditions.push('t.status = ?');
    queryParams.push(status);
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM api_tokens t
    JOIN api_users u ON t.user_id = u.id
    ${whereClause}
  `;
  const [countRows] = await db.execute(countQuery, queryParams);
  const total = countRows[0].total;

  // Get paginated data (don't return the actual token!)
  const dataQuery = `
    SELECT
      t.id,
      t.name,
      t.expires_at,
      t.rate_limit,
      t.status,
      t.scope,
      t.last_used_at,
      t.usage_count,
      t.created_at,
      t.user_id,
      u.first_name,
      u.last_name,
      u.email as user_email,
      u.phone,
      u.website,
      u.notes
    FROM api_tokens t
    JOIN api_users u ON t.user_id = u.id
    ${whereClause}
    ORDER BY t.${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  const [rows] = await db.execute(dataQuery, [...queryParams, limit, offset]);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Update API user
 */
export const updateApiUser = async (userId, userData) => {
  const { firstName, lastName, email, phone, website, notes, status } = userData;

  // Validate required fields
  if (!firstName || !lastName || !email) {
    throw new Error('First name, last name, and email are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Check if email is taken by another user
  const [existingUsers] = await db.execute(
    'SELECT id FROM api_users WHERE email = ? AND id != ?',
    [email, userId]
  );

  if (existingUsers.length > 0) {
    throw new Error('Email already in use by another user');
  }

  const [result] = await db.execute(
    `UPDATE api_users
     SET first_name = ?, last_name = ?, email = ?, phone = ?, website = ?, notes = ?, status = ?
     WHERE id = ?`,
    [firstName, lastName, email, phone || null, website || null, notes || null, status || 'active', userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('User not found');
  }
};

/**
 * Delete API user and all associated tokens
 */
export const deleteApiUser = async (userId) => {
  const [result] = await db.execute('DELETE FROM api_users WHERE id = ?', [userId]);

  if (result.affectedRows === 0) {
    throw new Error('User not found');
  }
};

/**
 * Delete API token
 */
export const deleteApiToken = async (tokenId) => {
  const [result] = await db.execute('DELETE FROM api_tokens WHERE id = ?', [tokenId]);

  if (result.affectedRows === 0) {
    throw new Error('Token not found');
  }
};

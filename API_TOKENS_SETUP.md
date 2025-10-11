# API Token Management System - Setup Instructions

## Overview

This API Token Management System provides a comprehensive dashboard for creating, managing, and tracking API tokens for external users. It includes:

- **API Users Management**: Create and manage API users with details (name, email, phone, website, notes)
- **Token Generation**: Generate secure API tokens using Node.js crypto library
- **Token Management**: View, revoke, and delete tokens
- **Rate Limiting**: Configure requests per hour for each token
- **Expiration Control**: Set token expiration dates
- **Status Tracking**: Monitor token status (active, inactive, revoked, expired)
- **Usage Analytics**: Track last used timestamp and usage count
- **Scope/Permissions**: Define token permissions (read, write, admin)
- **Authentication**: Protected dashboard accessible only to logged-in admin users

## Database Setup

### Step 1: Run the Database Migration

Execute the SQL migration script to create the necessary tables:

```bash
mysql -u your_username -p whois_db < server/api-tokens-schema.sql
```

Or run the SQL commands manually in your MySQL/MariaDB console.

### Database Tables Created

1. **api_users**: Stores API user information
   - id, first_name, last_name, email, phone, website, notes, status, created_at, updated_at, created_by

2. **api_tokens**: Stores API tokens
   - id, user_id, token, token_hash, name, expires_at, rate_limit, status, scope, ip_whitelist, last_used_at, usage_count, created_at, created_by, revoked_at, revoked_by, revoked_reason

3. **api_token_usage**: Tracks token usage for analytics and rate limiting
   - id, token_id, user_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms, created_at

4. **v_active_tokens**: View for quick access to active tokens with user info

## Access the Dashboard

### URL

Access the API Token Management dashboard at:

```
https://www.whois.nginx.encasa/api-tokens
```

Or click the "API Tokens" button in the admin portal at:

```
https://www.whois.nginx.encasa/reguser
```

### Authentication

The dashboard is protected and requires authentication:

1. You must first log in through the main admin portal (`/reguser`)
2. Once authenticated, you can access the API tokens dashboard
3. Your JWT token is automatically used for all API requests

## Using the Dashboard

### API Users Tab

**Create a New API User:**
1. Click "Add New User" button
2. Fill in required fields:
   - First Name *
   - Last Name *
   - Email * (must be unique)
   - Phone (optional)
   - Website (optional)
   - Notes (optional)
3. Click "Save"

**Edit/Delete Users:**
- Click "Edit" to modify user details
- Click "Delete" to remove user (will also delete all associated tokens)

### API Tokens Tab

**Generate a New Token:**
1. Click "Generate New Token" button
2. Select the API user
3. Enter token details:
   - Token Name * (e.g., "Production API Key")
   - Expires In Days (leave empty or set to 0 for permanent)
   - Rate Limit (requests per hour, default 1000)
   - Scope (comma-separated permissions, default "read")
4. Click "Generate Token"
5. **IMPORTANT**: Copy the token immediately - it will only be shown once!

**Token Format:**
```
whois_[64 character hex string]
```

**Manage Tokens:**
- **Revoke**: Marks token as revoked with a reason
- **Delete**: Permanently removes token from database
- Filter by status: All, Active, Inactive, Revoked, Expired

## API Endpoints Reference

All endpoints require authentication via JWT Bearer token.

### API Users

- `GET /api/admin/api-users` - List all API users (with pagination, search, sort)
- `POST /api/admin/api-users` - Create new API user
- `PUT /api/admin/api-users/:id` - Update API user
- `DELETE /api/admin/api-users/:id` - Delete API user

### API Tokens

- `GET /api/admin/api-tokens` - List all tokens (with pagination, search, sort, filter)
- `GET /api/admin/api-users/:userId/tokens` - Get tokens for specific user
- `POST /api/admin/api-tokens` - Create new token
- `PUT /api/admin/api-tokens/:id/revoke` - Revoke token
- `PUT /api/admin/api-tokens/:id/status` - Update token status
- `DELETE /api/admin/api-tokens/:id` - Delete token

## Token Security

### How Tokens are Generated

Tokens are generated using Node.js built-in `crypto` library:

```javascript
const randomBytes = crypto.randomBytes(32); // 256 bits
const token = `whois_${randomBytes.toString('hex')}`;
```

### Storage

- **Plain token**: Returned ONLY ONCE when created
- **Token hash**: Stored in database (SHA-256 hash)
- Tokens cannot be retrieved after creation - only verified

### Verification

Token verification:
1. Hash the provided token using SHA-256
2. Look up the hash in the database
3. Check status, expiration, and user status
4. Update last_used_at and usage_count

## Suggested Additional Fields

The system includes these additional important fields:

1. **Token Status**: active, inactive, revoked, expired
2. **Rate Limit**: Requests per hour allowed
3. **Expiration Date**: Optional expiration timestamp
4. **Scope**: Permissions (e.g., "read", "write", "admin")
5. **IP Whitelist**: JSON array of allowed IP addresses (optional)
6. **Last Used**: Timestamp of last token usage
7. **Usage Count**: Total number of times token was used
8. **Token Name**: Friendly identifier for the token
9. **Revocation Info**: Who revoked, when, and why
10. **Created By**: Which admin created the user/token

## Rate Limiting

Rate limiting is tracked using the `api_token_usage` table:

```sql
SELECT COUNT(*) FROM api_token_usage
WHERE token_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
```

Compare this count against the token's `rate_limit` value.

## Best Practices

1. **Token Rotation**: Encourage users to rotate tokens regularly
2. **Expiration**: Set expiration dates for sensitive tokens
3. **Scope**: Use minimal required permissions
4. **Monitoring**: Review usage logs regularly
5. **Revocation**: Revoke compromised tokens immediately
6. **IP Whitelist**: Use IP restrictions when possible

## Implementation Example

To implement token authentication in your API endpoints:

```javascript
import { verifyApiToken, checkRateLimit, logTokenUsage } from './server/api-token-manager.js';

app.get('/api/whois/:ip', async (req, res) => {
  const token = req.headers['x-api-key'];

  // Verify token
  const tokenData = await verifyApiToken(token);
  if (!tokenData) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(tokenData.id, tokenData.rate_limit);
  if (rateLimit.isLimited) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: rateLimit.limit,
      remaining: 0
    });
  }

  const startTime = Date.now();

  // Process request...
  const result = { /* your data */ };

  // Log usage
  await logTokenUsage({
    tokenId: tokenData.id,
    userId: tokenData.user_id,
    endpoint: req.path,
    method: req.method,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    responseStatus: 200,
    responseTimeMs: Date.now() - startTime
  });

  res.json(result);
});
```

## Troubleshooting

### Issue: Can't access dashboard
- Ensure you're logged in to `/reguser` first
- Check that JWT token is stored in localStorage
- Verify authentication endpoints are working

### Issue: Database errors
- Confirm tables were created successfully
- Check foreign key constraints
- Verify database user has proper permissions

### Issue: Token generation fails
- Check that the user exists and is active
- Verify all required fields are provided
- Check server logs for detailed errors

## Files Modified/Created

1. **server/api-tokens-schema.sql** - Database schema
2. **server/api-token-manager.js** - Token management utility functions
3. **p3030-whois.js** - Added API endpoints and route
4. **public/api-tokens.html** - Dashboard HTML interface
5. **public/api-tokens.js** - Dashboard JavaScript
6. **public/reguser.html** - Added "API Tokens" button

## Support

For issues or questions, refer to the main application logs:
- PM2 logs: `/root/.pm2/logs/`
- Application errors are logged to console

## Future Enhancements

Consider adding:
- API token usage charts and analytics
- Email notifications for token expiration
- Webhook support for token events
- API documentation generator
- Token rotation scheduler
- Multiple API token versions per user

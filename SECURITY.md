# Security Guidelines

## ⚠️ CRITICAL: Never Commit Sensitive Data

This project contains sensitive configuration files that **must never** be committed to version control:

### Protected Files (Already in .gitignore)

- `server/.env` - Database credentials, JWT secret
- `.env` - Application configuration
- `*.key`, `*.pem` - SSL/TLS certificates
- `*.sql` (except migrations) - Database dumps

## Environment Variables Setup

### Required Environment Variables

Create `server/.env` with the following structure (see `server/.env.example`):

```bash
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=your_database_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=your_database_name

# Security
JWT_SECRET=generate_strong_secret_here

# Application URLs
CLIENT_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api
```

### Generating Secure Secrets

Generate a strong JWT secret:
```bash
openssl rand -hex 32
```

Then add it to `server/.env`:
```bash
JWT_SECRET=your_generated_secret_here
```

## First Time Setup

1. **Copy example files**:
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

2. **Generate JWT_SECRET**:
   ```bash
   openssl rand -hex 32
   ```

3. **Edit `server/.env`** with your actual credentials:
   - Database connection details
   - JWT secret (from step 2)
   - Application URLs

4. **Verify .gitignore** is protecting sensitive files:
   ```bash
   git status
   # Should NOT show .env or server/.env
   ```

## Security Features Implemented

### Authentication
- JWT-based authentication with configurable secret
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Secure token verification middleware

### Role-Based Access Control
- **Top Gun**: Full access including API Token Management
- **Webapp Admin**: Standard admin dashboard access
- Role enforcement at both backend (middleware) and frontend (UI)

### Database Security
- Prepared statements (SQL injection prevention)
- Password hash storage only (no plaintext)
- Environment variable configuration
- Connection pooling with limits

### API Security
- Protected endpoints with JWT authentication
- Role-based endpoint protection
- Input validation on all requests
- CORS configuration

## Deployment Checklist

Before deploying to production:

- [ ] Generate new JWT_SECRET (different from development)
- [ ] Use strong database passwords (min 16 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Verify all `.env` files are in `.gitignore`
- [ ] Test authentication flows
- [ ] Verify role-based access controls
- [ ] Enable HTTPS/SSL
- [ ] Set up PM2 for process management
- [ ] Configure proper logging (no sensitive data in logs)
- [ ] Set up database backups
- [ ] Review and restrict CORS settings

## Git Security

### If Secrets Were Accidentally Committed

If you've committed sensitive files:

1. **Immediately rotate all credentials**:
   - Change database passwords
   - Generate new JWT_SECRET
   - Update all API tokens

2. **Remove from Git history** (already done):
   ```bash
   # History has been cleaned in this repository
   # .env file was removed from all commits
   ```

3. **Force push to remote** (⚠️ Coordinate with team first):
   ```bash
   git push origin main --force
   ```

### Verifying Protection

Check that sensitive files are ignored:
```bash
git status
# Should show only:
# - Code files (.js, .html)
# - Config templates (.env.example)
# - Documentation (.md)
```

Check git history is clean:
```bash
git log --all --full-history -- "*.env"
# Should show no results
```

## Security Best Practices

1. **Never hardcode secrets** in source code
2. **Use environment variables** for all sensitive configuration
3. **Rotate credentials regularly** (every 90 days minimum)
4. **Use different secrets** for development/staging/production
5. **Implement rate limiting** on authentication endpoints
6. **Monitor failed login attempts**
7. **Keep dependencies updated** (`npm audit fix`)
8. **Use HTTPS only** in production
9. **Implement proper logging** (without sensitive data)
10. **Regular security audits**

## Incident Response

If you suspect a security breach:

1. **Immediately rotate all credentials**
2. **Review access logs** for suspicious activity
3. **Check database** for unauthorized changes
4. **Notify team members**
5. **Document the incident**
6. **Implement additional security measures**

## Security Contacts

For security issues:
- Review code before committing
- Use `git diff` to verify changes
- Never commit files in `.gitignore`

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

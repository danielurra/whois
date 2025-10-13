# Role-Based Access Control Implementation

## Overview
This document describes the implementation of a role-based access control system for the WHOIS application, specifically for managing access to the API Token Management dashboard.

## Roles

### Top Gun
- **Access Level**: Full administrative access
- **Permissions**:
  - Access to all Admin Dashboard features
  - Exclusive access to API Token Management dashboard
  - Can manage API users and tokens
- **Badge**: Displays a purple gradient badge with star icon (⭐ TOP GUN)

### Webapp Admin
- **Access Level**: Standard administrative access
- **Permissions**:
  - Access to Admin Dashboard (Queries and Users)
  - Cannot access API Token Management

## Implementation Details

### Database Changes

**Migration File**: `/server/migrations/add_roles.sql`

Added `role` column to `reguser` table:
```sql
ALTER TABLE reguser ADD COLUMN role VARCHAR(50) DEFAULT 'Webapp Admin' AFTER email;
CREATE INDEX idx_reguser_role ON reguser(role);
```

**User Assignments**:
- `amigo@amigo.com` → Top Gun
- `etaba@etaba.com` → Webapp Admin

### Backend Changes

#### 1. Authentication (`server/auth.js`)
- Added `role` field to JWT tokens during registration and login
- Created `requireTopGun` middleware to protect routes requiring Top Gun access
- Updated user queries to include role information

#### 2. API Endpoints (`p3030-whois.js`)
Protected all API Token Management endpoints with `requireTopGun` middleware:
- `/api/admin/api-users` (GET, POST, PUT, DELETE)
- `/api/admin/api-tokens` (GET, POST, PUT, DELETE)
- `/api/admin/api-tokens/:id/revoke`
- `/api/admin/api-tokens/:id/status`
- `/api/admin/api-users/:userId/tokens`

### Frontend Changes

#### 1. Admin Dashboard (`public/admin.js`)
- Shows/hides "API Tokens" link based on user role
- Displays Top Gun badge for users with Top Gun role
- Badge appears next to user name in header

#### 2. API Tokens Dashboard (`public/api-tokens.js`)
- Checks for Top Gun role on page load
- Redirects non-Top Gun users to main dashboard with alert
- Displays Top Gun badge in header

## Visual Indicators

### Top Gun Badge
- **Style**: Purple gradient background (#667eea → #764ba2)
- **Icon**: ⭐ (star emoji)
- **Text**: "TOP GUN"
- **Placement**: Next to user's name in "logged as:" section

## Security

1. **Backend Protection**: All API Token endpoints require valid JWT + Top Gun role
2. **Frontend Protection**: UI elements hidden/shown based on role
3. **Page Access**: API Tokens page redirects non-Top Gun users
4. **Default Role**: New users automatically assigned "Webapp Admin" role

## Testing

To test the role system:

1. **Top Gun User** (amigo@amigo.com):
   - Can see "API Tokens" button in Admin Dashboard
   - Can access `/api-tokens` page
   - See purple "⭐ TOP GUN" badge

2. **Webapp Admin User** (etaba@etaba.com):
   - Cannot see "API Tokens" button
   - Gets denied access if trying to access `/api-tokens` directly
   - No badge displayed

## Future Enhancements

Potential additions to the role system:
- Admin interface to manage user roles
- Additional role types (e.g., "Read Only Admin")
- Role-based permissions for specific features within dashboards
- Audit log for role changes

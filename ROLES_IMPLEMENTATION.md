# Role-Based Access Control Implementation

## Overview
This document describes the implementation of a comprehensive role-based access control system for the WHOIS application, including role management, audit logging, and permission-based access controls.

## Roles

### Top Gun
- **Access Level**: Full administrative access
- **Permissions**:
  - Full read and write access to all Admin Dashboard features
  - Exclusive access to API Token Management dashboard
  - Exclusive access to Role Management dashboard
  - Can manage API users and tokens
  - Can change user roles
  - Can view role audit logs
- **Badge**: Displays a purple gradient badge with star icon (⭐ TOP GUN)

### Webapp Admin
- **Access Level**: Standard administrative access
- **Permissions**:
  - Read and write access to Admin Dashboard (Queries and Users)
  - Can view, edit, and delete queries
  - Can view, edit, and delete users
  - Cannot access API Token Management
  - Cannot access Role Management
  - Cannot change user roles

### Read Only Admin
- **Access Level**: View-only administrative access
- **Permissions**:
  - Read-only access to Admin Dashboard (Queries and Users)
  - Can view queries and users
  - Cannot edit or delete queries
  - Cannot edit or delete users
  - Cannot access API Token Management
  - Cannot access Role Management
  - Cannot change user roles
- **Badge**: Displays a yellow badge with amber text

## Implementation Details

### Database Changes

**Migration File 1**: `/server/migrations/add_roles.sql`

Added `role` column to `reguser` table:
```sql
ALTER TABLE reguser ADD COLUMN role VARCHAR(50) DEFAULT 'Webapp Admin' AFTER email;
CREATE INDEX idx_reguser_role ON reguser(role);
```

**Migration File 2**: `/server/migrations/add_role_audit.sql`

Added `role_audit` table for tracking role changes:
```sql
CREATE TABLE IF NOT EXISTS role_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  previous_role VARCHAR(50),
  new_role VARCHAR(50) NOT NULL,
  changed_by_user_id INT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES reguser(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES reguser(id) ON DELETE CASCADE
);
CREATE INDEX idx_role_audit_user_id ON role_audit(user_id);
CREATE INDEX idx_role_audit_changed_by ON role_audit(changed_by_user_id);
CREATE INDEX idx_role_audit_created_at ON role_audit(created_at);
```

**User Assignments**:
- `admin@example.com` → Top Gun
- `user@example.com` → Webapp Admin

### Backend Changes

#### 1. Authentication (`server/auth.js`)
- Added `role` field to JWT tokens during registration and login
- Created `requireTopGun` middleware to protect routes requiring Top Gun access
- Created `requireWritePermission` middleware to block Read Only Admin from write operations
- Added helper functions:
  - `hasReadAccess(role)` - Checks if role has read permissions
  - `hasWriteAccess(role)` - Checks if role has write permissions
- Updated user queries to include role information

#### 2. API Endpoints (`p3030-whois.js`)

**Role Management Endpoints** (Top Gun Only):
- `GET /api/admin/roles` - Get list of available roles and their descriptions
- `GET /api/admin/role-audit` - Get role audit log with pagination
- `PUT /api/admin/users/:id/role` - Update user role (with audit logging)

**Protected Write Operations** (Requires `requireWritePermission` - blocks Read Only Admin):
- `DELETE /api/admin/queries/:id` - Delete query
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

**Top Gun Only Endpoints**:
- `/api/admin/api-users` (GET, POST, PUT, DELETE)
- `/api/admin/api-tokens` (GET, POST, PUT, DELETE)
- `/api/admin/api-tokens/:id/revoke`
- `/api/admin/api-tokens/:id/status`
- `/api/admin/api-users/:userId/tokens`

**Updated Endpoints**:
- `GET /api/admin/users` - Now includes `role` field in response

### Frontend Changes

#### 1. Admin Dashboard (`public/reguser.html` & `public/admin.js`)
- Added "Role Management" link in navigation (purple button)
- Shows/hides "Role Management" and "API Tokens" links based on user role (Top Gun only)
- Displays role badges for all users in the Users table:
  - **Top Gun**: Purple gradient badge
  - **Webapp Admin**: Blue badge
  - **Read Only Admin**: Yellow/amber badge
- Disables Edit/Delete buttons for Read Only Admin users
- Edit and Delete buttons show "Read-only access" tooltip when disabled
- Queries table Delete buttons disabled for Read Only Admin
- Users table includes Role column
- Displays Top Gun badge next to logged-in user's name

#### 2. Role Management Dashboard (`public/role-management.html` & `public/role-management.js`)
- **Top Gun only** - Redirects non-Top Gun users to main dashboard
- Two-tab interface:
  - **User Roles Tab**: View and manage user roles
  - **Audit Log Tab**: View history of role changes
- Features:
  - Search, sort, and pagination for both tables
  - Change role modal with role descriptions
  - Prevents users from changing their own role
  - Requires reason for role changes (optional)
  - Real-time role change with immediate feedback
  - Displays role badges with consistent styling
  - Shows who changed the role and when in audit log

#### 3. API Tokens Dashboard (`public/api-tokens.js`)
- Checks for Top Gun role on page load
- Redirects non-Top Gun users to main dashboard with alert
- Displays Top Gun badge in header

## Visual Indicators

### Role Badges

#### Top Gun Badge
- **Style**: Purple gradient background (#667eea → #764ba2)
- **Icon**: ⭐ (star emoji)
- **Text**: "TOP GUN"
- **Placement**:
  - Next to user's name in "logged as:" section
  - In Role column of Users table

#### Webapp Admin Badge
- **Style**: Blue background (#dbeafe), dark blue text (#1e40af)
- **Text**: "WEBAPP ADMIN"
- **Placement**: In Role column of Users table

#### Read Only Admin Badge
- **Style**: Yellow/amber background (#fef3c7), dark amber text (#92400e)
- **Text**: "READ ONLY ADMIN"
- **Placement**: In Role column of Users table

## Security

1. **Backend Protection**:
   - All API Token endpoints require valid JWT + Top Gun role
   - All Role Management endpoints require valid JWT + Top Gun role
   - Write operations (DELETE, PUT) require `requireWritePermission` middleware
   - Read Only Admin users are blocked from write operations at the API level

2. **Frontend Protection**:
   - UI elements hidden/shown based on role
   - Edit/Delete buttons disabled for Read Only Admin users
   - Role Management link only visible to Top Gun users
   - API Tokens link only visible to Top Gun users

3. **Page Access**:
   - API Tokens page redirects non-Top Gun users
   - Role Management page redirects non-Top Gun users

4. **Role Change Protection**:
   - Users cannot change their own role
   - All role changes are logged in the audit table
   - Role changes include who made the change and optional reason

5. **Default Role**: New users automatically assigned "Webapp Admin" role

## Testing

To test the role system:

1. **Top Gun User** (admin@example.com):
   - Can see "Role Management" and "API Tokens" buttons in Admin Dashboard
   - Can access `/role-management` and `/api-tokens` pages
   - Can view and change user roles
   - Can view role audit log
   - Can edit and delete queries and users
   - See purple "⭐ TOP GUN" badge

2. **Webapp Admin User** (user@example.com):
   - Cannot see "Role Management" or "API Tokens" buttons
   - Gets denied access if trying to access protected pages directly
   - Can edit and delete queries and users
   - No badge displayed

3. **Read Only Admin User**:
   - Cannot see "Role Management" or "API Tokens" buttons
   - Can view queries and users but cannot edit or delete
   - Edit/Delete buttons are disabled with "Read-only access" tooltip
   - See yellow/amber "READ ONLY ADMIN" badge

## Role Audit Logging

All role changes are automatically logged to the `role_audit` table with the following information:
- User whose role was changed
- Previous role
- New role
- Who made the change
- Reason for change (optional)
- Timestamp of change

The audit log can be viewed in the Role Management dashboard (Top Gun only) and includes:
- Full search and filter capabilities
- Pagination and sorting
- Complete history of all role changes
- User information for both the affected user and the admin who made the change

## Usage Instructions

### Changing a User's Role

1. Log in as a Top Gun user
2. Navigate to Admin Dashboard (`/reguser`)
3. Click "Role Management" button (purple)
4. In the "User Roles" tab, find the user you want to modify
5. Click "Change Role" button
6. Select the new role from the dropdown
7. (Optional) Enter a reason for the change
8. Click "Change Role" to confirm
9. The change is immediately applied and logged

### Viewing Role Audit Log

1. Log in as a Top Gun user
2. Navigate to Role Management (`/role-management`)
3. Click "Audit Log" tab
4. View the complete history of role changes
5. Use search, sort, and pagination to find specific changes

## Future Enhancements

Potential additions to the role system:
- Email notifications for role changes
- Additional role types for specific use cases
- Granular permissions for specific features within dashboards
- Export audit log to CSV
- Role change approval workflow

-- Migration: Add role support to reguser table
-- Date: 2025-10-12

-- Add role column to reguser table
ALTER TABLE reguser ADD COLUMN role VARCHAR(50) DEFAULT 'Webapp Admin' AFTER email;

-- Update specific users with their roles (EXAMPLES - Update with your actual users)
-- UPDATE reguser SET role = 'Top Gun' WHERE email = 'your-admin@example.com';
-- UPDATE reguser SET role = 'Webapp Admin' WHERE email = 'your-user@example.com';

-- Create index on role for better query performance
CREATE INDEX idx_reguser_role ON reguser(role);

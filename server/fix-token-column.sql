-- Fix for token column size issue
-- Run this to fix the "Data too long for column 'token'" error

USE whois_db;

ALTER TABLE api_tokens MODIFY COLUMN token VARCHAR(100) NOT NULL UNIQUE;

-- Verify the change
DESCRIBE api_tokens;

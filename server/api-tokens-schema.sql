-- API Token Management Schema
-- Database: whois_db

-- Table to store API users (separate from admin users)
CREATE TABLE IF NOT EXISTS api_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    website VARCHAR(255),
    notes TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_email (email),
    INDEX idx_status (status),
    FOREIGN KEY (created_by) REFERENCES reguser(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store API tokens
CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT 'Friendly name for the token',
    expires_at TIMESTAMP NULL,
    rate_limit INT DEFAULT 1000 COMMENT 'Requests per hour',
    status ENUM('active', 'inactive', 'revoked', 'expired') DEFAULT 'active',
    scope VARCHAR(255) DEFAULT 'read' COMMENT 'Comma-separated permissions: read,write,admin',
    ip_whitelist TEXT COMMENT 'JSON array of allowed IP addresses',
    last_used_at TIMESTAMP NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    revoked_at TIMESTAMP NULL,
    revoked_by INT,
    revoked_reason TEXT,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES api_users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES reguser(id) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by) REFERENCES reguser(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to track API token usage for rate limiting and analytics
CREATE TABLE IF NOT EXISTS api_token_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL,
    user_id INT NOT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45),
    user_agent TEXT,
    response_status INT,
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_id (token_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_token_hour (token_id, created_at),
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES api_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- View for active tokens with user information
CREATE OR REPLACE VIEW v_active_tokens AS
SELECT
    t.id,
    t.token,
    t.name AS token_name,
    t.expires_at,
    t.rate_limit,
    t.status,
    t.scope,
    t.last_used_at,
    t.usage_count,
    t.created_at AS token_created_at,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.website,
    u.notes,
    u.status AS user_status
FROM api_tokens t
JOIN api_users u ON t.user_id = u.id
WHERE t.status = 'active'
  AND (t.expires_at IS NULL OR t.expires_at > NOW());

-- WHOIS Lookup Logging Schema
-- Database: whois_db

-- Table to store all WHOIS lookup queries
CREATE TABLE IF NOT EXISTS whois_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    searched_ip VARCHAR(45) NOT NULL,
    organization_name TEXT,
    matched_logo VARCHAR(255),
    visitor_ip VARCHAR(45),
    user_agent TEXT,
    referer VARCHAR(500),
    wan_panel VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_searched_ip (searched_ip),
    INDEX idx_visitor_ip (visitor_ip),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store admin users for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

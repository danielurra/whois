-- Migration: Add role audit logging
-- Date: 2025-10-12

-- Create role_audit table to track role changes
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

-- Create index for better query performance
CREATE INDEX idx_role_audit_user_id ON role_audit(user_id);
CREATE INDEX idx_role_audit_changed_by ON role_audit(changed_by_user_id);
CREATE INDEX idx_role_audit_created_at ON role_audit(created_at);

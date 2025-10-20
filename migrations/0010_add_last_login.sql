-- Add last_login column to users table
-- This is a safe migration that won't break existing functionality
-- The column is nullable, so existing users will have NULL until they log in again

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add index for better query performance on last_login
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Add comment for documentation
COMMENT ON COLUMN users.last_login IS 'Timestamp of user''s last successful login for analytics and re-engagement';

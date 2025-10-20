-- Add is_admin column to users table for admin dashboard access
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set your email as admin (update with your actual email)
UPDATE users SET is_admin = TRUE WHERE email = 'leon.lodewyks@gmail.com';
UPDATE users SET is_admin = TRUE WHERE email = 'info@imageupscaler.app';
UPDATE users SET is_admin = TRUE WHERE email = 'llodewyks@inspiredtesting.com';

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Admin access for marketing dashboard and analytics';

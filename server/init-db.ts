import { db } from './db';
import { sql } from 'drizzle-orm';

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database tables...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        credits INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT now()
      )
    `);

    // Add password column if it doesn't exist (migration for existing databases)
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password TEXT
    `);

    // Note: Users without passwords will need to use password reset functionality
    // We removed the hardcoded default password for security reasons
    // Users can reset their password through the auth system if needed
    
    // Create projects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        original_image_url TEXT NOT NULL,
        upscaled_image_url TEXT,
        mockup_image_url TEXT,
        mockup_images JSONB,
        resized_images JSONB DEFAULT '[]'::jsonb,
        etsy_listing JSONB,
        mockup_template TEXT,
        upscale_option TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploading',
        zip_url TEXT,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    
    // Create contact messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase().then(() => process.exit(0));
}

export { initializeDatabase };
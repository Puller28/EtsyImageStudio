// Production database schema deployment for blog_posts table
const { Pool } = require('pg');

// Use production database URL (will be set as environment variable in production)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deploySchema() {
  console.log('🚀 Deploying blog_posts schema to production...');
  
  try {
    const client = await pool.connect();
    
    // Create blog_posts table with all required fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL UNIQUE,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(255) DEFAULT 'Digital Art Team',
        category VARCHAR(100) NOT NULL,
        tags JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        featured BOOLEAN DEFAULT false,
        read_time VARCHAR(50),
        seo_title TEXT,
        seo_description TEXT,
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
    `);
    
    console.log('✅ Blog posts table and indexes created successfully');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    process.exit(1);
  }
}

deploySchema();

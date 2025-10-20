-- Create blog_posts table for storing and publishing blog content
CREATE TABLE IF NOT EXISTS blog_posts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  author_id VARCHAR NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  reading_time INTEGER NOT NULL DEFAULT 5,
  seo_score INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- Create index on published_at for sorting
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);

-- Add comment for documentation
COMMENT ON TABLE blog_posts IS 'AI-generated and manually edited blog posts';
COMMENT ON COLUMN blog_posts.status IS 'Post status: draft, published, archived';

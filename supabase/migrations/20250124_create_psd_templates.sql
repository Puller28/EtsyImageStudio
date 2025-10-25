-- Create PSD templates table
CREATE TABLE IF NOT EXISTS psd_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  smart_object_layer TEXT NOT NULL,
  frame_layer TEXT,
  artwork_bounds JSONB NOT NULL,
  psd_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_psd_templates_category ON psd_templates(category);

-- Create index on is_active for filtering active templates
CREATE INDEX IF NOT EXISTS idx_psd_templates_active ON psd_templates(is_active);

-- Enable RLS
ALTER TABLE psd_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to active PSD templates"
  ON psd_templates
  FOR SELECT
  USING (is_active = true);

-- Create policy to allow authenticated users to read all templates
CREATE POLICY "Allow authenticated users to read all PSD templates"
  ON psd_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow service role to manage templates
CREATE POLICY "Allow service role to manage PSD templates"
  ON psd_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_psd_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_psd_templates_updated_at
  BEFORE UPDATE ON psd_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_psd_templates_updated_at();

-- Comments
COMMENT ON TABLE psd_templates IS 'PSD mockup templates for generating product mockups';
COMMENT ON COLUMN psd_templates.id IS 'Unique identifier (slug from filename)';
COMMENT ON COLUMN psd_templates.name IS 'Display name of the template';
COMMENT ON COLUMN psd_templates.category IS 'Category (living-room, bedroom, office, etc.)';
COMMENT ON COLUMN psd_templates.smart_object_layer IS 'Name of the smart object layer in PSD';
COMMENT ON COLUMN psd_templates.frame_layer IS 'Name of the frame layer (if exists)';
COMMENT ON COLUMN psd_templates.artwork_bounds IS 'Bounds for artwork placement {left, top, width, height}';
COMMENT ON COLUMN psd_templates.psd_url IS 'Public URL to PSD file in Supabase Storage';
COMMENT ON COLUMN psd_templates.thumbnail_url IS 'Public URL to thumbnail image';
COMMENT ON COLUMN psd_templates.is_active IS 'Whether template is active and visible to users';

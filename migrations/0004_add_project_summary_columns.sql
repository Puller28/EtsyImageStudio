ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS has_original_image boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_upscaled_image boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_mockup_image boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_mockup_images boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mockup_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_resized_images boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resized_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_etsy_listing boolean DEFAULT FALSE;

UPDATE projects
SET
  has_original_image = COALESCE(NULLIF(TRIM(original_image_url), '') IS NOT NULL, FALSE),
  has_upscaled_image = COALESCE(NULLIF(TRIM(upscaled_image_url), '') IS NOT NULL, FALSE),
  has_mockup_image = COALESCE(NULLIF(TRIM(mockup_image_url), '') IS NOT NULL, FALSE),
  has_mockup_images = COALESCE(
    CASE
      WHEN jsonb_typeof(mockup_images) = 'object' THEN EXISTS (
        SELECT 1 FROM jsonb_each(mockup_images) LIMIT 1
      )
      WHEN jsonb_typeof(mockup_images) = 'array' THEN jsonb_array_length(mockup_images) > 0
      ELSE FALSE
    END,
    FALSE
  ),
  mockup_count = COALESCE(
    CASE
      WHEN jsonb_typeof(mockup_images) = 'object' THEN (
        SELECT COUNT(*) FROM jsonb_each(mockup_images)
      )
      WHEN jsonb_typeof(mockup_images) = 'array' THEN jsonb_array_length(mockup_images)
      ELSE 0
    END,
    0
  ),
  has_resized_images = COALESCE(
    CASE
      WHEN jsonb_typeof(resized_images) = 'array' THEN jsonb_array_length(resized_images) > 0
      ELSE FALSE
    END,
    FALSE
  ),
  resized_count = COALESCE(
    CASE
      WHEN jsonb_typeof(resized_images) = 'array' THEN jsonb_array_length(resized_images)
      ELSE 0
    END,
    0
  ),
  has_etsy_listing = COALESCE(
    CASE
      WHEN jsonb_typeof(etsy_listing) = 'object' THEN EXISTS (
        SELECT 1 FROM jsonb_each(etsy_listing) LIMIT 1
      )
      ELSE FALSE
    END,
    FALSE
  );

ALTER TABLE projects
  ALTER COLUMN has_original_image SET NOT NULL,
  ALTER COLUMN has_upscaled_image SET NOT NULL,
  ALTER COLUMN has_mockup_image SET NOT NULL,
  ALTER COLUMN has_mockup_images SET NOT NULL,
  ALTER COLUMN mockup_count SET NOT NULL,
  ALTER COLUMN has_resized_images SET NOT NULL,
  ALTER COLUMN resized_count SET NOT NULL,
  ALTER COLUMN has_etsy_listing SET NOT NULL;

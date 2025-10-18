# Template Migration Plan

## Problem
The `templates/` directory (71MB of PNG files) is not being deployed to Render because:
- It exceeds Render's slug size limits
- Large binary files in git cause deployment issues

## Solution
Move templates to Google Cloud Storage (GCS), similar to how we handle project images.

## Implementation Steps

### 1. Upload Templates to GCS
- Create a one-time script to upload all templates to GCS bucket
- Path structure: `templates/{room}/{template_id}/{file}`
- Example: `templates/bedroom/bedroom_01/bedroom_01_bg.png`

### 2. Update Template Discovery
- Modify `/api/templates` endpoint to:
  - Check if templates exist locally (for dev)
  - If not, generate signed URLs from GCS
  - Cache template metadata in memory

### 3. Update Template Serving
- Modify `/api/templates/preview/:room/:templateId` to serve from GCS
- Use signed URLs with 1-hour expiration
- Cache URLs to minimize GCS requests

### 4. Update Mockup Generation
- Modify mockup generation to download templates from GCS when needed
- Cache downloaded templates in memory during processing
- Clean up after processing

## Benefits
- ✅ No deployment size limits
- ✅ Faster deployments (no 71MB of files)
- ✅ Same infrastructure as project images
- ✅ Can scale to unlimited templates
- ✅ Works in all environments (dev, staging, prod)

## Migration
1. Run upload script once to populate GCS
2. Deploy updated code
3. Remove templates from git (optional, keep for local dev)

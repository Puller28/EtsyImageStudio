import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

// Upload templates to Google Cloud Storage during build
// This is needed because the templates directory (71MB) is too large for Render's slug

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'etsy-image-studio';
const TEMPLATES_DIR = 'templates';

async function uploadTemplates() {
  console.log('📤 Uploading templates to Google Cloud Storage...');
  
  // Check if we're in production and have GCS credentials
  if (!process.env.GCS_CREDENTIALS) {
    console.log('⚠️ No GCS credentials found, skipping template upload (dev mode)');
    return;
  }

  try {
    const storage = new Storage({
      credentials: JSON.parse(process.env.GCS_CREDENTIALS),
    });

    const bucket = storage.bucket(BUCKET_NAME);
    let uploadCount = 0;

    // Recursively upload all files in templates directory
    async function uploadDir(dirPath, prefix = '') {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const remotePath = path.join(prefix, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          await uploadDir(fullPath, remotePath);
        } else {
          await bucket.upload(fullPath, {
            destination: `templates/${remotePath}`,
            metadata: {
              cacheControl: 'public, max-age=31536000',
            },
          });
          uploadCount++;
          if (uploadCount % 10 === 0) {
            console.log(`  Uploaded ${uploadCount} files...`);
          }
        }
      }
    }

    await uploadDir(TEMPLATES_DIR);
    console.log(`✅ Successfully uploaded ${uploadCount} template files to GCS`);
  } catch (error) {
    console.error('❌ Failed to upload templates:', error.message);
    // Don't fail the build, templates can be added later
  }
}

uploadTemplates();

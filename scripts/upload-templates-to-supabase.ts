import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const storageBaseUrl = (() => {
  const explicitUrl = process.env.SUPABASE_PROJECT_ASSETS_URL?.replace(/\/+$/, '');
  if (explicitUrl) return explicitUrl;

  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  if (projectUrl) return `${projectUrl}/storage/v1`;

  throw new Error("SUPABASE_PROJECT_ASSETS_URL or SUPABASE_URL must be configured");
})();

const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const bucket = 'project-assets'; // Same bucket as project images

if (!serviceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log(`📡 Using storage URL: ${storageBaseUrl}`);

async function uploadFile(filePath: string, objectName: string) {
  const buffer = fs.readFileSync(filePath);
  const contentType = filePath.endsWith('.json') ? 'application/json' : 'image/png';
  
  const uploadUrl = `${storageBaseUrl}/object/${encodeURIComponent(bucket)}/${objectName.split('/').map(s => encodeURIComponent(s)).join('/')}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey!,
    'Content-Type': contentType,
    'x-upsert': 'true',
  };

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: buffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed for ${objectName}: ${response.status} - ${error}`);
  }
}

async function uploadTemplates() {
  const templatesDir = 'templates';
  let uploadCount = 0;
  let errorCount = 0;

  console.log('📤 Starting template upload to Supabase Storage...');
  console.log(`📂 Bucket: ${bucket}`);
  console.log('');

  async function processDirectory(dirPath: string, prefix: string = '') {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const objectName = path.join('templates', prefix, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        await processDirectory(fullPath, path.join(prefix, entry.name));
      } else {
        try {
          await uploadFile(fullPath, objectName);
          uploadCount++;
          if (uploadCount % 10 === 0) {
            console.log(`  ✅ Uploaded ${uploadCount} files...`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to upload ${objectName}:`, (error as Error).message);
          errorCount++;
        }
      }
    }
  }

  try {
    await processDirectory(templatesDir);
    console.log('');
    console.log(`✅ Upload complete!`);
    console.log(`   Uploaded: ${uploadCount} files`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} files`);
    }
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadTemplates();

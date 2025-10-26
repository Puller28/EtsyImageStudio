import { createClient } from '@supabase/supabase-js';
import { agPsdMockupService } from '../server/services/agpsd-mockup-service.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const NEW_PSDS_DIR = 'psd-mockups/New PSDS';

// Supabase setup
let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!supabaseUrl && process.env.SUPABASE_PROJECT_ASSETS_URL) {
  const match = process.env.SUPABASE_PROJECT_ASSETS_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
}

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl!, supabaseKey);

async function processPSD(psdFile: string, index: number, total: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Processing ${index + 1}/${total}: ${psdFile}`);
  console.log('='.repeat(80));

  try {
    const psdPath = path.join(NEW_PSDS_DIR, psdFile);
    const psdBuffer = await fs.readFile(psdPath);
    
    // Generate a unique ID from filename
    const id = psdFile.replace('.psd', '').toLowerCase().replace(/\s+/g, '-');
    const name = psdFile.replace('.psd', '');

    // 1. Upload PSD file to storage
    console.log('📤 Uploading PSD to storage...');
    const psdStoragePath = `psd-templates/${id}.psd`;
    
    const { error: psdUploadError } = await supabase.storage
      .from('mockup-templates')
      .upload(psdStoragePath, psdBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (psdUploadError) {
      throw new Error(`PSD upload failed: ${psdUploadError.message}`);
    }

    const { data: psdUrlData } = supabase.storage
      .from('mockup-templates')
      .getPublicUrl(psdStoragePath);

    console.log('✅ PSD uploaded');

    // 2. Generate preview with white background
    console.log('🎨 Generating preview...');
    
    const whiteArtwork = await sharp({
      create: {
        width: 500,
        height: 700,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const previewBuffer = await agPsdMockupService.generateMockup(
      psdBuffer,
      whiteArtwork,
      'Change Poster'
    );

    // Resize preview to 400px wide
    const thumbnailBuffer = await sharp(previewBuffer)
      .resize(400, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // 3. Upload preview
    console.log('📤 Uploading preview...');
    const previewPath = `previews/${id}.jpg`;
    
    const { error: previewUploadError } = await supabase.storage
      .from('mockup-templates')
      .upload(previewPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (previewUploadError) {
      throw new Error(`Preview upload failed: ${previewUploadError.message}`);
    }

    const { data: thumbnailUrlData } = supabase.storage
      .from('mockup-templates')
      .getPublicUrl(previewPath);

    console.log('✅ Preview uploaded');

    // 4. Add to database
    console.log('💾 Adding to database...');
    
    const { error: dbError } = await supabase
      .from('psd_templates')
      .upsert({
        id: id,
        name: name,
        category: 'frame',
        width: 2000,
        height: 1600,
        smart_object_layer: 'Change Poster',
        frame_layer: 'Background',
        artwork_bounds: JSON.stringify({ left: 0, top: 0, right: 2000, bottom: 1600 }),
        psd_url: psdUrlData.publicUrl,
        thumbnail_url: thumbnailUrlData.publicUrl,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log('✅ Added to database');
    console.log(`🎉 Successfully processed: ${id}`);

    return { success: true, id };

  } catch (error: any) {
    console.error(`❌ Error processing ${psdFile}:`, error.message);
    return { success: false, id: psdFile, error: error.message };
  }
}

async function batchUploadPSDs() {
  console.log('🚀 Batch uploading new PSDs...\n');

  const files = await fs.readdir(NEW_PSDS_DIR);
  const psdFiles = files.filter(f => f.endsWith('.psd'));

  console.log(`📊 Found ${psdFiles.length} PSD files\n`);

  if (psdFiles.length === 0) {
    console.log('⚠️  No PSD files found in the directory');
    return;
  }

  const results = [];
  
  for (let i = 0; i < psdFiles.length; i++) {
    const result = await processPSD(psdFiles[i], i, psdFiles.length);
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    if (i < psdFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 BATCH UPLOAD SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed files:');
    failed.forEach(f => {
      console.log(`   - ${f.id}: ${f.error}`);
    });
  }

  console.log('\n🎉 Batch upload complete!');
}

batchUploadPSDs().catch(console.error);

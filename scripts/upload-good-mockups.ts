import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TemplateMetadata {
  id: string;
  filename: string;
  name: string;
  category: string;
  width: number;
  height: number;
  smartObjectLayer: string;
  frameLayer: string | null;
  artworkBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  thumbnailPath: string;
  psdPath: string;
}

/**
 * Upload good mockups to Supabase
 */
async function uploadGoodMockups() {
  console.log('☁️  Uploading Good Mockups to Supabase\n');
  console.log('='.repeat(80));
  
  try {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
      throw new Error('Missing Supabase credentials in .env file. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
    }
    
    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Using key type:', supabaseKey.substring(0, 20) + '...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Connected to Supabase\n');
    
    // Read metadata
    const metadataPath = path.join(process.cwd(), 'good-mockups-processed', 'templates-metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const templates: TemplateMetadata[] = JSON.parse(metadataContent);
    
    console.log(`📁 Found ${templates.length} templates to upload\n`);
    console.log('='.repeat(80));
    
    const psdFolder = path.join(process.cwd(), 'psd-mockups');
    const thumbnailFolder = path.join(process.cwd(), 'good-mockups-processed', 'thumbnails');
    
    let uploadedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      console.log(`\n[${i + 1}/${templates.length}] Uploading: ${template.name}`);
      
      try {
        // 1. Upload PSD file
        console.log('   📤 Uploading PSD...');
        const psdPath = path.join(psdFolder, template.psdPath);
        const psdBuffer = await fs.readFile(psdPath);
        
        const psdStoragePath = `psd-templates/${template.id}.psd`;
        const { error: psdError } = await supabase.storage
          .from('mockup-templates')
          .upload(psdStoragePath, psdBuffer, {
            contentType: 'application/octet-stream',
            upsert: true
          });
        
        if (psdError) throw psdError;
        
        const { data: psdUrlData } = supabase.storage
          .from('mockup-templates')
          .getPublicUrl(psdStoragePath);
        
        const psdUrl = psdUrlData.publicUrl;
        console.log('   ✅ PSD uploaded');
        
        // 2. Upload thumbnail
        console.log('   📤 Uploading thumbnail...');
        const thumbnailPath = path.join(thumbnailFolder, `${template.id}.jpg`);
        const thumbnailBuffer = await fs.readFile(thumbnailPath);
        
        const thumbnailStoragePath = `thumbnails/${template.id}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('mockup-templates')
          .upload(thumbnailStoragePath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (thumbError) throw thumbError;
        
        const { data: thumbUrlData } = supabase.storage
          .from('mockup-templates')
          .getPublicUrl(thumbnailStoragePath);
        
        const thumbnailUrl = thumbUrlData.publicUrl;
        console.log('   ✅ Thumbnail uploaded');
        
        // 3. Insert into database
        console.log('   💾 Saving to database...');
        const { error: dbError } = await supabase
          .from('psd_templates')
          .upsert({
            id: template.id,
            name: template.name,
            category: template.category,
            width: template.width,
            height: template.height,
            smart_object_layer: template.smartObjectLayer,
            frame_layer: template.frameLayer,
            artwork_bounds: template.artworkBounds,
            psd_url: psdUrl,
            thumbnail_url: thumbnailUrl,
            is_active: true,
            updated_at: new Date().toISOString()
          });
        
        if (dbError) throw dbError;
        
        console.log('   ✅ Database updated');
        uploadedCount++;
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
        failedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Upload Results:');
    console.log(`   ✅ Uploaded: ${uploadedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📁 Total: ${templates.length}`);
    
    if (uploadedCount > 0) {
      console.log('\n🎉 Success! Your mockups are now live on the website!');
      console.log('\n💡 You can now:');
      console.log('   1. View them at: GET /api/psd-mockup/templates');
      console.log('   2. Generate mockups: POST /api/psd-mockup/generate');
      console.log('   3. Filter by category: GET /api/psd-mockup/templates?category=living-room');
    }
    
    console.log('\n='.repeat(80) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

uploadGoodMockups();

import Psd from '@webtoon/psd';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

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
 * Process the 32 good mockups for website upload
 */
async function processGoodMockups() {
  console.log('🎨 Processing Good Mockups for Website\n');
  console.log('='.repeat(80));
  
  try {
    const goodFolder = path.join(process.cwd(), 'test-outputs-selected', 'Good');
    const psdFolder = path.join(process.cwd(), 'psd-mockups');
    const outputFolder = path.join(process.cwd(), 'good-mockups-processed');
    const thumbnailFolder = path.join(outputFolder, 'thumbnails');
    
    await fs.mkdir(outputFolder, { recursive: true });
    await fs.mkdir(thumbnailFolder, { recursive: true });
    
    // Get PNG files from Good folder
    const goodFiles = await fs.readdir(goodFolder);
    const goodPngs = goodFiles.filter(f => f.toLowerCase().endsWith('.png'));
    
    // Convert to PSD names
    const goodPsds = goodPngs.map(png => png.replace('.png', '.psd'));
    
    console.log(`📁 Found ${goodPsds.length} good mockups to process\n`);
    console.log('='.repeat(80));
    
    const templates: TemplateMetadata[] = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < goodPsds.length; i++) {
      const filename = goodPsds[i];
      
      console.log(`\n[${i + 1}/${goodPsds.length}] Processing: ${filename}`);
      
      try {
        const psdPath = path.join(psdFolder, filename);
        const psdBuffer = await fs.readFile(psdPath);
        const arrayBuffer = psdBuffer.buffer.slice(
          psdBuffer.byteOffset,
          psdBuffer.byteOffset + psdBuffer.byteLength
        ) as ArrayBuffer;
        
        const psd = Psd.parse(arrayBuffer);
        
        // Find design layer
        const designLayer = findDesignLayer(psd);
        if (!designLayer) {
          console.log('   ❌ No design layer found');
          failCount++;
          continue;
        }
        
        console.log(`   ✅ Layer: ${designLayer.name}`);
        
        // Get bounds
        let bounds = null;
        if (designLayer.width && designLayer.height) {
          bounds = {
            left: designLayer.left || 0,
            top: designLayer.top || 0,
            width: designLayer.width,
            height: designLayer.height
          };
        } else if (designLayer.right && designLayer.bottom) {
          bounds = {
            left: designLayer.left || 0,
            top: designLayer.top || 0,
            width: designLayer.right - (designLayer.left || 0),
            height: designLayer.bottom - (designLayer.top || 0)
          };
        }
        
        if (!bounds) {
          console.log('   ❌ Could not determine bounds');
          failCount++;
          continue;
        }
        
        // Look for frame layer
        const frameLayer = findFrameLayer(psd);
        let artworkBounds = bounds;
        
        if (frameLayer && frameLayer.width && frameLayer.height) {
          artworkBounds = {
            left: frameLayer.left || 0,
            top: frameLayer.top || 0,
            width: frameLayer.width,
            height: frameLayer.height
          };
          console.log(`   🖼️  Frame layer found: ${artworkBounds.width}x${artworkBounds.height}`);
        } else {
          console.log(`   📐 Using design layer bounds: ${artworkBounds.width}x${artworkBounds.height}`);
        }
        
        // Generate ID and name
        const id = filename.replace('.psd', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const name = filename.replace('.psd', '').replace(/[-_]/g, ' ');
        
        // Detect category from filename
        const category = detectCategory(filename);
        
        // Generate thumbnail
        const thumbnailFilename = `${id}.jpg`;
        const thumbnailPath = path.join(thumbnailFolder, thumbnailFilename);
        
        const compositeData = await psd.composite();
        if (compositeData) {
          await sharp(Buffer.from(compositeData), {
            raw: {
              width: psd.width,
              height: psd.height,
              channels: 4
            }
          })
            .resize(400, 400, { fit: 'inside' })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
          
          console.log(`   📸 Thumbnail created`);
        }
        
        // Create metadata
        templates.push({
          id,
          filename,
          name,
          category,
          width: psd.width || 0,
          height: psd.height || 0,
          smartObjectLayer: designLayer.name || 'unknown',
          frameLayer: frameLayer?.name || null,
          artworkBounds,
          thumbnailPath: `thumbnails/${thumbnailFilename}`,
          psdPath: filename
        });
        
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Processing Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📁 Total: ${goodPsds.length}`);
    
    // Save metadata
    const metadataPath = path.join(outputFolder, 'templates-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(templates, null, 2));
    console.log(`\n💾 Metadata saved to: templates-metadata.json`);
    
    // Generate summary by category
    const byCategory = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Templates by category:');
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });
    
    console.log('\n💡 Next step: Upload to Supabase');
    console.log('   Run: npm run upload:good-mockups');
    console.log('\n='.repeat(80) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function findDesignLayer(node: any): any {
  const commonNames = [
    'add design here',
    'paste your design here',
    'your design here',
    'place your design here',
    'design',
    'artwork',
    'smart object',
    'replace me',
    'your artwork',
    'insert design',
    'add your design',
    'your design',
    'place design'
  ];
  
  function findByName(n: any, targetName: string): any {
    const normalized = targetName.trim().toLowerCase();
    if (n.name?.trim().toLowerCase().includes(normalized)) {
      return n;
    }
    if (n.children) {
      for (const child of n.children) {
        const found = findByName(child, targetName);
        if (found) return found;
      }
    }
    return null;
  }
  
  for (const name of commonNames) {
    const found = findByName(node, name);
    if (found) return found;
  }
  
  return null;
}

function findFrameLayer(node: any): any {
  const frameNames = ['frame', 'border', 'mat', 'opening', 'inner frame', 'window'];
  
  function findByName(n: any, targetName: string): any {
    const normalized = targetName.trim().toLowerCase();
    if (n.name?.trim().toLowerCase().includes(normalized)) {
      return n;
    }
    if (n.children) {
      for (const child of n.children) {
        const found = findByName(child, targetName);
        if (found) return found;
      }
    }
    return null;
  }
  
  for (const name of frameNames) {
    const found = findByName(node, name);
    if (found) return found;
  }
  
  return null;
}

function detectCategory(filename: string): string {
  const lower = filename.toLowerCase();
  
  if (lower.includes('bedroom')) return 'bedroom';
  if (lower.includes('living')) return 'living-room';
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('bathroom')) return 'bathroom';
  if (lower.includes('office')) return 'office';
  if (lower.includes('dining')) return 'dining-room';
  if (lower.includes('hallway') || lower.includes('corridor')) return 'hallway';
  if (lower.includes('outdoor') || lower.includes('exterior')) return 'outdoor';
  if (lower.includes('studio') || lower.includes('workspace')) return 'studio';
  
  return 'other';
}

processGoodMockups();

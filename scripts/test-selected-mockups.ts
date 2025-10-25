import { PSDMockupService } from '../server/services/psd-mockup-service';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test mockups that were manually selected (based on preview folder)
 */
async function testSelectedMockups() {
  console.log('🧪 Testing Manually Selected Mockups\n');
  console.log('='.repeat(80));
  
  try {
    const previewFolder = path.join(process.cwd(), 'psd-mockups-previews');
    const psdFolder = path.join(process.cwd(), 'psd-mockups');
    const artworkPath = path.join(process.cwd(), 'test_artwork.jpg');
    const outputFolder = path.join(process.cwd(), 'test-outputs-selected');
    
    // Get list of JPGs in preview folder (these are the ones user kept)
    const previewFiles = await fs.readdir(previewFolder);
    const selectedJpgs = previewFiles.filter(f => f.toLowerCase().endsWith('.jpg'));
    
    // Convert JPG names back to PSD names
    const selectedPsds = selectedJpgs.map(jpg => jpg.replace('.jpg', '.psd'));
    
    console.log(`📁 Found ${selectedPsds.length} manually selected mockups`);
    console.log(`📸 Will test each with your artwork...\n`);
    console.log('='.repeat(80));
    
    await fs.mkdir(outputFolder, { recursive: true });
    
    const artworkBuffer = await fs.readFile(artworkPath);
    const mockupService = new PSDMockupService();
    
    let successCount = 0;
    let failCount = 0;
    const failedList: string[] = [];
    
    for (let i = 0; i < selectedPsds.length; i++) {
      const filename = selectedPsds[i];
      
      console.log(`\n[${i + 1}/${selectedPsds.length}] Testing: ${filename}`);
      
      try {
        const psdPath = path.join(psdFolder, filename);
        
        // Check if PSD exists
        try {
          await fs.access(psdPath);
        } catch {
          console.log(`   ⚠️  PSD file not found, skipping...`);
          failCount++;
          failedList.push(filename);
          continue;
        }
        
        // Try to find design layer (common names)
        const layerNames = [
          'Add Design Here',
          'add design here',
          'Your Design Here',
          'Place Your Design Here',
          'Design',
          'Artwork'
        ];
        
        let mockupBuffer = null;
        let usedLayerName = null;
        
        for (const layerName of layerNames) {
          try {
            mockupBuffer = await mockupService.generateMockup(
              psdPath,
              artworkBuffer,
              layerName
            );
            usedLayerName = layerName;
            break;
          } catch (error) {
            // Try next layer name
            continue;
          }
        }
        
        if (!mockupBuffer) {
          console.log(`   ❌ Failed: Could not find design layer`);
          failCount++;
          failedList.push(filename);
          continue;
        }
        
        // Save output
        const outputFilename = filename.replace('.psd', '.png');
        const outputPath = path.join(outputFolder, outputFilename);
        await fs.writeFile(outputPath, mockupBuffer);
        
        const stats = await fs.stat(outputPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`   ✅ Success! Layer: "${usedLayerName}" (${sizeMB} MB)`);
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Failed:`, error instanceof Error ? error.message : error);
        failCount++;
        failedList.push(filename);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📁 Total: ${selectedPsds.length}`);
    console.log(`   📈 Success Rate: ${((successCount / selectedPsds.length) * 100).toFixed(1)}%`);
    
    if (failedList.length > 0) {
      console.log(`\n⚠️  Failed mockups:`);
      failedList.forEach(f => console.log(`   - ${f}`));
      
      // Save failed list
      const failedListPath = path.join(outputFolder, 'failed-mockups.txt');
      await fs.writeFile(failedListPath, failedList.join('\n'));
      console.log(`\n💾 Failed list saved to: failed-mockups.txt`);
    }
    
    console.log(`\n💾 Mockups saved to: ${outputFolder}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review the generated mockups');
    console.log('   2. Delete any that still look bad');
    console.log('   3. The remaining ones are your final usable set!');
    console.log('\n='.repeat(80) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testSelectedMockups();

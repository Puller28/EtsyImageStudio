import Psd from '@webtoon/psd';
import fs from 'fs/promises';
import path from 'path';

/**
 * Inspect failed mockups to find their layer names
 */
async function inspectFailedMockups() {
  console.log('🔍 Inspecting Failed Mockups\n');
  console.log('='.repeat(80));
  
  try {
    const failedListPath = path.join(process.cwd(), 'test-outputs-selected', 'failed-mockups.txt');
    const psdFolder = path.join(process.cwd(), 'psd-mockups');
    
    const failedContent = await fs.readFile(failedListPath, 'utf-8');
    const failedFiles = failedContent.split('\n').filter(f => f.trim());
    
    console.log(`📁 Found ${failedFiles.length} failed mockups to inspect\n`);
    console.log('='.repeat(80));
    
    const layerNames = new Set<string>();
    
    for (const filename of failedFiles.slice(0, 10)) { // Check first 10
      try {
        const psdPath = path.join(psdFolder, filename.trim());
        
        console.log(`\n📄 ${filename}`);
        
        const psdBuffer = await fs.readFile(psdPath);
        const arrayBuffer = psdBuffer.buffer.slice(
          psdBuffer.byteOffset,
          psdBuffer.byteOffset + psdBuffer.byteLength
        ) as ArrayBuffer;
        
        const psd = Psd.parse(arrayBuffer);
        
        // List all layer names
        function getAllLayerNames(node: any, depth: number = 0): void {
          if (node.name) {
            const indent = '  '.repeat(depth);
            console.log(`${indent}- ${node.name}`);
            layerNames.add(node.name.toLowerCase().trim());
          }
          if (node.children) {
            for (const child of node.children) {
              getAllLayerNames(child, depth + 1);
            }
          }
        }
        
        console.log('Layers:');
        getAllLayerNames(psd);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Unique Layer Names Found:');
    const sortedNames = Array.from(layerNames).sort();
    sortedNames.forEach(name => console.log(`   - ${name}`));
    
    console.log('\n💡 Add these to the layer search list if they look like design layers!');
    console.log('='.repeat(80) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectFailedMockups();

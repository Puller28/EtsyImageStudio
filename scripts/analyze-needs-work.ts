import Psd from '@webtoon/psd';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

interface AlignmentIssue {
  filename: string;
  issue: string;
  currentBounds: any;
  suggestedBounds: any;
  adjustmentType: 'shrink' | 'expand' | 'shift' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze mockups that need alignment work
 */
async function analyzeNeedsWork() {
  console.log('🔍 Analyzing "Needs Work" Mockups\n');
  console.log('='.repeat(80));
  
  try {
    const needsWorkFolder = path.join(process.cwd(), 'test-outputs-selected', 'Needs Work');
    const psdFolder = path.join(process.cwd(), 'psd-mockups');
    const outputFolder = path.join(process.cwd(), 'alignment-fixes');
    
    await fs.mkdir(outputFolder, { recursive: true });
    
    // Get PNG files in Needs Work folder
    const files = await fs.readdir(needsWorkFolder);
    const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
    
    console.log(`📁 Found ${pngFiles.length} mockups that need work\n`);
    console.log('='.repeat(80));
    
    const issues: AlignmentIssue[] = [];
    
    for (const pngFile of pngFiles) {
      const psdFile = pngFile.replace('.png', '.psd');
      
      console.log(`\n📄 Analyzing: ${psdFile}`);
      
      try {
        const psdPath = path.join(psdFolder, psdFile);
        const psdBuffer = await fs.readFile(psdPath);
        const arrayBuffer = psdBuffer.buffer.slice(
          psdBuffer.byteOffset,
          psdBuffer.byteOffset + psdBuffer.byteLength
        ) as ArrayBuffer;
        
        const psd = Psd.parse(arrayBuffer);
        
        // Find design layer
        const designLayer = findDesignLayer(psd);
        
        if (!designLayer) {
          console.log('   ⚠️  Could not find design layer');
          continue;
        }
        
        console.log(`   Layer: ${designLayer.name}`);
        
        // Get current bounds
        let currentBounds = null;
        if (designLayer.width && designLayer.height) {
          currentBounds = {
            left: designLayer.left || 0,
            top: designLayer.top || 0,
            width: designLayer.width,
            height: designLayer.height
          };
        } else if (designLayer.right && designLayer.bottom) {
          currentBounds = {
            left: designLayer.left || 0,
            top: designLayer.top || 0,
            width: designLayer.right - (designLayer.left || 0),
            height: designLayer.bottom - (designLayer.top || 0)
          };
        }
        
        if (!currentBounds) {
          console.log('   ⚠️  Could not determine bounds');
          continue;
        }
        
        console.log(`   Current Bounds: ${currentBounds.width}x${currentBounds.height} at (${currentBounds.left}, ${currentBounds.top})`);
        
        // Look for frame layer (more accurate bounds)
        const frameLayer = findFrameLayer(psd);
        
        let suggestedBounds = null;
        let issue = '';
        let adjustmentType: 'shrink' | 'expand' | 'shift' | 'none' = 'none';
        let confidence: 'high' | 'medium' | 'low' = 'low';
        
        if (frameLayer && frameLayer.width && frameLayer.height) {
          // Frame layer found - this is the accurate bounds
          suggestedBounds = {
            left: frameLayer.left || 0,
            top: frameLayer.top || 0,
            width: frameLayer.width,
            height: frameLayer.height
          };
          
          const widthDiff = Math.abs(suggestedBounds.width - currentBounds.width);
          const heightDiff = Math.abs(suggestedBounds.height - currentBounds.height);
          const leftDiff = Math.abs(suggestedBounds.left - currentBounds.left);
          const topDiff = Math.abs(suggestedBounds.top - currentBounds.top);
          
          console.log(`   ✅ Frame Layer Found: ${suggestedBounds.width}x${suggestedBounds.height} at (${suggestedBounds.left}, ${suggestedBounds.top})`);
          console.log(`   📏 Difference: width=${widthDiff}px, height=${heightDiff}px, left=${leftDiff}px, top=${topDiff}px`);
          
          if (widthDiff > 10 || heightDiff > 10) {
            if (suggestedBounds.width < currentBounds.width || suggestedBounds.height < currentBounds.height) {
              issue = `Artwork overshoots frame by ~${Math.max(widthDiff, heightDiff)}px - needs to shrink`;
              adjustmentType = 'shrink';
              confidence = 'high';
            } else {
              issue = `Artwork undershoots frame by ~${Math.max(widthDiff, heightDiff)}px - needs to expand`;
              adjustmentType = 'expand';
              confidence = 'high';
            }
          } else if (leftDiff > 10 || topDiff > 10) {
            issue = `Artwork misaligned by ${Math.max(leftDiff, topDiff)}px - needs repositioning`;
            adjustmentType = 'shift';
            confidence = 'high';
          } else {
            issue = `Minor alignment issue (< 10px difference)`;
            adjustmentType = 'none';
            confidence = 'medium';
          }
          
        } else {
          // No frame layer - try to detect issue from layer structure
          console.log('   ⚠️  No frame layer found - analyzing layer structure...');
          
          // Check if there are other layers that might indicate the frame
          const allLayers = getAllLayers(psd);
          console.log(`   📚 Total layers: ${allLayers.length}`);
          
          // Look for layers with "frame", "border", "mat", "opening" in name
          const potentialFrameLayers = allLayers.filter(l => 
            l.name && /frame|border|mat|opening|inner|window/i.test(l.name)
          );
          
          if (potentialFrameLayers.length > 0) {
            console.log(`   🔍 Found potential frame layers:`);
            potentialFrameLayers.forEach(l => {
              console.log(`      - ${l.name}`);
              if (l.width && l.height) {
                console.log(`        Size: ${l.width}x${l.height} at (${l.left}, ${l.top})`);
              }
            });
            
            // Use the first one as suggestion
            const potentialFrame = potentialFrameLayers[0];
            if (potentialFrame.width && potentialFrame.height) {
              suggestedBounds = {
                left: potentialFrame.left || 0,
                top: potentialFrame.top || 0,
                width: potentialFrame.width,
                height: potentialFrame.height
              };
              issue = `Potential frame layer "${potentialFrame.name}" found - try using these bounds`;
              adjustmentType = 'shift';
              confidence = 'medium';
            }
          } else {
            // Try padding adjustment (common issue: artwork needs margin)
            const padding = 10; // Try 10px padding
            suggestedBounds = {
              left: currentBounds.left + padding,
              top: currentBounds.top + padding,
              width: currentBounds.width - (padding * 2),
              height: currentBounds.height - (padding * 2)
            };
            issue = `No frame detected - try adding ${padding}px padding`;
            adjustmentType = 'shrink';
            confidence = 'low';
          }
        }
        
        issues.push({
          filename: psdFile,
          issue,
          currentBounds,
          suggestedBounds,
          adjustmentType,
          confidence
        });
        
        console.log(`   💡 ${issue}`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Analysis Summary:\n');
    
    const shrinkCount = issues.filter(i => i.adjustmentType === 'shrink').length;
    const expandCount = issues.filter(i => i.adjustmentType === 'expand').length;
    const shiftCount = issues.filter(i => i.adjustmentType === 'shift').length;
    const noneCount = issues.filter(i => i.adjustmentType === 'none').length;
    
    console.log(`   🔽 Need to shrink: ${shrinkCount}`);
    console.log(`   🔼 Need to expand: ${expandCount}`);
    console.log(`   ↔️  Need to reposition: ${shiftCount}`);
    console.log(`   ✅ Minor/no adjustment: ${noneCount}`);
    
    // Save detailed report
    const reportPath = path.join(outputFolder, 'alignment-analysis.json');
    await fs.writeFile(reportPath, JSON.stringify(issues, null, 2));
    console.log(`\n💾 Detailed analysis saved to: alignment-analysis.json`);
    
    // Generate fixes file
    const fixesPath = path.join(outputFolder, 'suggested-fixes.txt');
    let fixesText = 'SUGGESTED ALIGNMENT FIXES\n';
    fixesText += '='.repeat(80) + '\n\n';
    
    issues.forEach((issue, i) => {
      fixesText += `${i + 1}. ${issue.filename}\n`;
      fixesText += `   Issue: ${issue.issue}\n`;
      fixesText += `   Confidence: ${issue.confidence}\n`;
      fixesText += `   Current: ${issue.currentBounds.width}x${issue.currentBounds.height} at (${issue.currentBounds.left}, ${issue.currentBounds.top})\n`;
      if (issue.suggestedBounds) {
        fixesText += `   Suggested: ${issue.suggestedBounds.width}x${issue.suggestedBounds.height} at (${issue.suggestedBounds.left}, ${issue.suggestedBounds.top})\n`;
      }
      fixesText += '\n';
    });
    
    await fs.writeFile(fixesPath, fixesText);
    console.log(`💾 Suggested fixes saved to: suggested-fixes.txt`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Review suggested-fixes.txt');
    console.log('   2. For high-confidence fixes, we can auto-correct them');
    console.log('   3. For low-confidence, manual adjustment may be needed');
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

function getAllLayers(node: any): any[] {
  const layers: any[] = [];
  
  function collect(n: any) {
    if (n.name) {
      layers.push(n);
    }
    if (n.children) {
      for (const child of n.children) {
        collect(child);
      }
    }
  }
  
  collect(node);
  return layers;
}

analyzeNeedsWork();

import Psd from '@webtoon/psd';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface PSDTemplateInfo {
  id: string;
  name: string;
  psdPath: string;
  smartObjectLayerName: string;
  category: string;
  width: number;
  height: number;
}

export class PSDMockupService {
  private templatesDir: string;

  constructor(templatesDir: string = 'templates/psd') {
    this.templatesDir = templatesDir;
  }

  /**
   * Generate mockup by replacing smart object in PSD
   * @param psdPathOrBuffer - Path to PSD file or Buffer containing PSD data
   * @param artworkBuffer - Buffer containing artwork image
   * @param smartObjectLayerName - Name of smart object layer to replace
   */
  async generateMockup(
    psdPathOrBuffer: string | Buffer,
    artworkBuffer: Buffer,
    smartObjectLayerName: string = 'Your Design Here'
  ): Promise<Buffer> {
    try {
      // 1. Read PSD file
      let psdBuffer: Buffer;
      if (typeof psdPathOrBuffer === 'string') {
        console.log('📄 Loading PSD file:', psdPathOrBuffer);
        psdBuffer = await fs.readFile(psdPathOrBuffer);
      } else {
        console.log('📄 Using provided PSD buffer');
        psdBuffer = psdPathOrBuffer;
      }
      // Convert Node.js Buffer to ArrayBuffer for @webtoon/psd
      const arrayBuffer = psdBuffer.buffer.slice(
        psdBuffer.byteOffset,
        psdBuffer.byteOffset + psdBuffer.byteLength
      ) as ArrayBuffer;
      const psd = Psd.parse(arrayBuffer);
      
      console.log('✅ PSD parsed successfully');
      console.log(`📊 PSD dimensions: ${psd.width} x ${psd.height}`);
      console.log(`📚 Total layers: ${psd.children?.length || 0}\n`);
      
      // Memory optimization: If PSD is larger than 2400px, we'll scale down the final output
      const needsScaling = psd.width > 2400 || psd.height > 2400;
      const targetMaxDimension = 1920;
      const scaleFactor = needsScaling ? Math.min(targetMaxDimension / psd.width, targetMaxDimension / psd.height) : 1;
      
      if (needsScaling) {
        console.log(`⚠️ Large PSD detected (${psd.width}x${psd.height}), will scale output by ${(scaleFactor * 100).toFixed(0)}%`);
      }
      
      // 2. List all layers for debugging
      console.log('\n🔍 Layer structure:');
      this.printLayerStructure(psd, 0);
      
      // 3. Find smart object layer
      console.log(`🔍 Searching for layer: "${smartObjectLayerName}"`);
      console.log(`   Normalized: "${smartObjectLayerName.trim().toLowerCase()}"`);
      const smartLayer = this.findLayerByName(psd, smartObjectLayerName);
      
      if (!smartLayer) {
        console.warn(`⚠️ Smart object layer "${smartObjectLayerName}" not found`);
        console.log('💡 Available layers:', this.getAllLayerNames(psd));
        throw new Error(`Smart object layer "${smartObjectLayerName}" not found in PSD`);
      }
      
      console.log('✅ Found smart object layer:', smartLayer.name);
      console.log('📐 Layer properties:', JSON.stringify({
        left: smartLayer.left,
        top: smartLayer.top,
        right: smartLayer.right,
        bottom: smartLayer.bottom,
        width: smartLayer.width,
        height: smartLayer.height
      }, null, 2));
      
      // 4. Find the frame layer to get the actual visible area
      console.log('🔍 Looking for frame layer...');
      const frameLayer = this.findLayerByName(psd, 'frame');
      
      if (frameLayer) {
        console.log('📐 Frame layer properties:', JSON.stringify({
          left: frameLayer.left,
          top: frameLayer.top,
          right: frameLayer.right,
          bottom: frameLayer.bottom,
          width: frameLayer.width,
          height: frameLayer.height
        }, null, 2));
      }
      
      let layerWidth: number;
      let layerHeight: number;
      let layerLeft: number;
      let layerTop: number;
      
      if (frameLayer && frameLayer.left !== undefined && frameLayer.top !== undefined) {
        // Use frame dimensions for perfect fit
        // Frame layer uses width/height properties, not right/bottom
        layerWidth = frameLayer.width || (frameLayer.right - frameLayer.left);
        layerHeight = frameLayer.height || (frameLayer.bottom - frameLayer.top);
        layerLeft = frameLayer.left;
        layerTop = frameLayer.top;
        console.log('✅ Found frame layer!');
        console.log('🖼️  Using frame layer dimensions for perfect fit');
        console.log('📏 Frame size:', layerWidth, 'x', layerHeight);
        console.log('📍 Frame position:', layerLeft, ',', layerTop);
      } else {
        // Fallback to smart object dimensions
        console.log('⚠️ Frame layer not found or incomplete, using smart object dimensions');
        layerWidth = smartLayer.width || (smartLayer.right - smartLayer.left);
        layerHeight = smartLayer.height || (smartLayer.bottom - smartLayer.top);
        layerLeft = smartLayer.left;
        layerTop = smartLayer.top;
        console.log('📏 Smart object size:', layerWidth, 'x', layerHeight);
        console.log('📍 Smart object position:', layerLeft, ',', layerTop);
      }
      
      // 5. Resize artwork to fit smart object dimensions
      console.log('🖼️ Resizing artwork to fit smart object...');
      const resizedArtwork = await sharp(artworkBuffer)
        .resize(layerWidth, layerHeight, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      console.log('✅ Artwork resized');
      
      // 6. Replace smart object content
      // Note: @webtoon/psd doesn't support direct smart object replacement
      // We'll need to composite the artwork onto the layer
      console.log('🎨 Compositing artwork onto template...');
      
      // 7. Render layers with smart object hidden
      console.log('🎨 Rendering layers in correct order...');
      
      // Strategy: Hide the smart object layer, render PSD, then composite our artwork
      
      // Hide the smart object layer by setting it to invisible
      smartLayer.hidden = true;
      
      // Now composite the PSD without the smart object
      const baseWithoutArtwork = await psd.composite();
      
      // Convert to buffer
      const baseImageBuffer = await sharp(Buffer.from(baseWithoutArtwork), {
        raw: {
          width: psd.width,
          height: psd.height,
          channels: 4
        }
      })
        .png()
        .toBuffer();
      
      console.log('✅ PSD composited without smart object layer');
      
      // 8. Now composite in the correct order:
      // Base (background + frame) -> White rectangle (where smart object was) -> Artwork
      
      console.log('🎨 Creating white background for artwork area...');
      
      // Create a white rectangle the size of the smart object area
      const whiteRect = await sharp({
        create: {
          width: layerWidth,
          height: layerHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .png()
        .toBuffer();
      
      console.log('🎨 Compositing artwork into the frame...');
      
      // Composite: base -> white rectangle -> artwork
      let finalImage = await sharp(baseImageBuffer)
        .composite([
          {
            input: whiteRect,
            left: layerLeft,
            top: layerTop,
            blend: 'over'
          },
          {
            input: resizedArtwork,
            left: layerLeft,
            top: layerTop,
            blend: 'over'
          }
        ])
        .png()
        .toBuffer();
      
      // Apply scaling if needed to reduce memory usage
      if (needsScaling) {
        const newWidth = Math.round(psd.width * scaleFactor);
        const newHeight = Math.round(psd.height * scaleFactor);
        console.log(`📏 Scaling output from ${psd.width}x${psd.height} to ${newWidth}x${newHeight}`);
        finalImage = await sharp(finalImage)
          .resize(newWidth, newHeight, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 92 })
          .toBuffer();
      } else {
        // Convert to JPEG even if not scaling to reduce file size
        finalImage = await sharp(finalImage)
          .jpeg({ quality: 92 })
          .toBuffer();
      }
      
      console.log('✅ Mockup generated successfully!');
      
      return finalImage;
      
    } catch (error) {
      console.error('❌ Error generating PSD mockup:', error);
      throw error;
    }
  }

  /**
   * Analyze PSD file and extract metadata
   */
  async analyzePSD(psdPath: string): Promise<any> {
    const psdBuffer = await fs.readFile(psdPath);
    // Convert Node.js Buffer to ArrayBuffer for @webtoon/psd
    const arrayBuffer = psdBuffer.buffer.slice(
      psdBuffer.byteOffset,
      psdBuffer.byteOffset + psdBuffer.byteLength
    ) as ArrayBuffer;
    const psd = Psd.parse(arrayBuffer);
    
    return {
      width: psd.width,
      height: psd.height,
      channels: psd.channelCount,
      depth: psd.depth,
      colorMode: psd.colorMode,
      layers: this.getLayerInfo(psd),
      smartObjects: this.findAllSmartObjects(psd)
    };
  }

  /**
   * Find layer by name (recursive search with fuzzy matching)
   */
  private findLayerByName(node: any, name: string, depth: number = 0): any {
    // Normalize names for comparison (trim and lowercase)
    const normalizedSearchName = name.trim().toLowerCase();
    const normalizedNodeName = node.name?.trim().toLowerCase();
    
    // Debug logging - show all comparisons
    if (node.name) {
      console.log(`   ${'  '.repeat(depth)}Comparing "${normalizedSearchName}" with "${normalizedNodeName}"`);
    }
    
    // Check current node (exact match or fuzzy match)
    if (node.name === name || normalizedNodeName === normalizedSearchName) {
      console.log(`   ${'  '.repeat(depth)}✅ MATCH FOUND!`);
      return node;
    }
    
    // Search children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this.findLayerByName(child, name, depth + 1);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Get all layer names (for debugging)
   */
  private getAllLayerNames(node: any, names: string[] = []): string[] {
    if (node.name) {
      names.push(node.name);
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.getAllLayerNames(child, names);
      }
    }
    
    return names;
  }

  /**
   * Print layer structure (for debugging)
   */
  private printLayerStructure(node: any, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    
    if (node.name) {
      const type = node.type || 'unknown';
      const visible = node.visible !== false ? '👁️' : '🚫';
      console.log(`${indent}${visible} ${node.name} (${type})`);
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.printLayerStructure(child, depth + 1);
      }
    }
  }

  /**
   * Count total layers
   */
  private countLayers(node: any): number {
    let count = node.name ? 1 : 0;
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countLayers(child);
      }
    }
    
    return count;
  }

  /**
   * Get layer information
   */
  private getLayerInfo(node: any, layers: any[] = []): any[] {
    if (node.name) {
      layers.push({
        name: node.name,
        type: node.type,
        visible: node.visible !== false,
        bounds: {
          left: node.left,
          top: node.top,
          right: node.right,
          bottom: node.bottom
        }
      });
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.getLayerInfo(child, layers);
      }
    }
    
    return layers;
  }

  /**
   * Find all smart objects in PSD
   */
  private findAllSmartObjects(node: any, smartObjects: any[] = []): any[] {
    if (node.type === 'smartObject' || node.name?.toLowerCase().includes('smart')) {
      smartObjects.push({
        name: node.name,
        bounds: {
          left: node.left,
          top: node.top,
          right: node.right,
          bottom: node.bottom
        }
      });
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.findAllSmartObjects(child, smartObjects);
      }
    }
    
    return smartObjects;
  }
}

// Export singleton instance
export const psdMockupService = new PSDMockupService();

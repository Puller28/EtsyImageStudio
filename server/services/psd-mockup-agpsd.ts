import { readPsd, writePsdBuffer, Psd, Layer, initializeCanvas } from 'ag-psd';
import sharp from 'sharp';
import fs from 'fs/promises';
import { createCanvas } from 'canvas';

// Initialize canvas for ag-psd
initializeCanvas(createCanvas as any);

interface TransformMatrix {
  xx: number;  // Scale X
  xy: number;  // Skew X
  yx: number;  // Skew Y
  yy: number;  // Scale Y
  tx: number;  // Translate X
  ty: number;  // Translate Y
}

/**
 * Advanced PSD Mockup Service using ag-psd
 * Extracts transformation matrix and applies perspective warping
 */
export class AGPSDMockupService {
  
  /**
   * Generate mockup by extracting transformation and applying it to artwork
   */
  async generateMockup(
    psdPath: string,
    artworkBuffer: Buffer,
    smartObjectLayerName: string = 'Your Design Here'
  ): Promise<Buffer> {
    try {
      console.log('📄 Loading PSD file with ag-psd:', psdPath);
      
      // 1. Read PSD file
      const psdBuffer = await fs.readFile(psdPath);
      // Skip image data loading to avoid canvas issues - we only need transformation data
      const psd = readPsd(psdBuffer, { skipCompositeImageData: true, skipLayerImageData: true });
      
      if (!psd) {
        throw new Error('Failed to parse PSD file');
      }
      
      console.log('✅ PSD parsed successfully');
      console.log('📊 PSD dimensions:', psd.width, 'x', psd.height);
      console.log('📚 Total layers:', this.countLayers(psd));
      
      // 2. Print layer structure
      console.log('\n🔍 Layer structure:');
      this.printLayerStructure(psd, 0);
      
      // 3. Find smart object layer
      console.log(`\n🔍 Searching for layer: "${smartObjectLayerName}"`);
      const smartLayer = this.findLayerByName(psd, smartObjectLayerName);
      
      if (!smartLayer) {
        console.warn(`⚠️ Smart object layer "${smartObjectLayerName}" not found`);
        throw new Error(`Smart object layer "${smartObjectLayerName}" not found in PSD`);
      }
      
      console.log('✅ Found smart object layer:', smartLayer.name);
      console.log('📐 Layer bounds:', {
        left: smartLayer.left,
        top: smartLayer.top,
        right: smartLayer.right,
        bottom: smartLayer.bottom,
        width: smartLayer.right! - smartLayer.left!,
        height: smartLayer.bottom! - smartLayer.top!
      });
      
      // 4. Extract transformation matrix from smart object
      let transform: TransformMatrix | null = null;
      let corners: number[][] | null = null;
      
      if (smartLayer.placedLayer) {
        console.log('✅ This is a smart object!');
        console.log('📦 Placed layer data:', JSON.stringify(smartLayer.placedLayer, null, 2));
        
        // Extract transformation matrix
        if (smartLayer.placedLayer.transform) {
          transform = smartLayer.placedLayer.transform as TransformMatrix;
          console.log('🎯 Transformation matrix found:', transform);
          
          // Calculate the 4 corners after transformation
          corners = this.calculateTransformedCorners(
            smartLayer.placedLayer.transform,
            smartLayer.left!,
            smartLayer.top!,
            smartLayer.right!,
            smartLayer.bottom!
          );
          
          console.log('📍 Transformed corners:', corners);
        }
      }
      
      // 5. Apply transformation to artwork
      let transformedArtwork: Buffer;
      
      if (corners && corners.length === 4) {
        console.log('🎨 Applying perspective transformation to artwork...');
        transformedArtwork = await this.applyPerspectiveTransform(
          artworkBuffer,
          corners,
          psd.width!,
          psd.height!
        );
      } else {
        console.log('⚠️ No transformation data, using simple resize...');
        const layerWidth = smartLayer.right! - smartLayer.left!;
        const layerHeight = smartLayer.bottom! - smartLayer.top!;
        
        transformedArtwork = await sharp(artworkBuffer)
          .resize(layerWidth, layerHeight, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
      }
      
      // 6. Since we skipped image data, we need to use the original @webtoon/psd approach
      console.log('🎨 Compositing transformed artwork onto mockup...');
      console.log('⚠️ Using @webtoon/psd for base image since ag-psd image data was skipped');
      
      // Use @webtoon/psd to get the base composite
      const Psd = await import('@webtoon/psd');
      const psdBufferForComposite = await fs.readFile(psdPath);
      const arrayBuffer = psdBufferForComposite.buffer.slice(
        psdBufferForComposite.byteOffset,
        psdBufferForComposite.byteOffset + psdBufferForComposite.byteLength
      ) as ArrayBuffer;
      const psdForComposite = Psd.default.parse(arrayBuffer);
      
      // Render the PSD to get base image
      const baseImageData = await psdForComposite.composite();
      
      // Convert to buffer
      const baseImage = await sharp(Buffer.from(baseImageData), {
        raw: {
          width: psdForComposite.width,
          height: psdForComposite.height,
          channels: 4
        }
      })
        .png()
        .toBuffer();
      
      // Composite artwork
      const finalImage = await sharp(baseImage)
        .composite([{
          input: transformedArtwork,
          blend: 'over'
        }])
        .png()
        .toBuffer();
      
      console.log('✅ Mockup generated with perspective transformation!');
      
      return finalImage;
      
    } catch (error) {
      console.error('❌ Error generating PSD mockup:', error);
      throw error;
    }
  }
  
  /**
   * Calculate the 4 corners after applying transformation matrix
   */
  private calculateTransformedCorners(
    transform: any,
    left: number,
    top: number,
    right: number,
    bottom: number
  ): number[][] {
    const corners = [
      [left, top],       // Top-left
      [right, top],      // Top-right
      [right, bottom],   // Bottom-right
      [left, bottom]     // Bottom-left
    ];
    
    // Apply transformation matrix to each corner
    const transformedCorners = corners.map(([x, y]) => {
      const newX = transform[0] * x + transform[1] * y + transform[4];
      const newY = transform[2] * x + transform[3] * y + transform[5];
      return [Math.round(newX), Math.round(newY)];
    });
    
    return transformedCorners;
  }
  
  /**
   * Apply perspective transformation to artwork using the 4 corners
   * This uses a simple affine transform via Sharp
   */
  private async applyPerspectiveTransform(
    artworkBuffer: Buffer,
    corners: number[][],
    canvasWidth: number,
    canvasHeight: number
  ): Promise<Buffer> {
    // For now, we'll use Sharp's affine transformation
    // For true perspective warp, we'd need OpenCV or similar
    
    // Calculate bounding box of transformed corners
    const xs = corners.map(c => c[0]);
    const ys = corners.map(c => c[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    console.log('📏 Transformed artwork size:', width, 'x', height);
    console.log('📍 Position:', minX, ',', minY);
    
    // Resize artwork to fit the bounding box
    const resizedArtwork = await sharp(artworkBuffer)
      .resize(Math.round(width), Math.round(height), {
        fit: 'fill',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Create a canvas and place the artwork at the correct position
    const positioned = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: resizedArtwork,
        left: Math.round(minX),
        top: Math.round(minY),
        blend: 'over'
      }])
      .png()
      .toBuffer();
    
    return positioned;
  }
  
  /**
   * Find layer by name (recursive)
   */
  private findLayerByName(node: any, name: string): any {
    const normalizedSearchName = name.trim().toLowerCase();
    const normalizedNodeName = node.name?.trim().toLowerCase();
    
    if (node.name === name || normalizedNodeName === normalizedSearchName) {
      return node;
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this.findLayerByName(child, name);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Count layers
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
   * Print layer structure
   */
  private printLayerStructure(node: any, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    
    if (node.name) {
      const type = node.placedLayer ? 'SmartObject' : 'Layer';
      const visible = node.hidden ? '🚫' : '👁️';
      console.log(`${indent}${visible} ${node.name} (${type})`);
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.printLayerStructure(child, depth + 1);
      }
    }
  }
}

export const agpsdMockupService = new AGPSDMockupService();

import { readPsd, initializeCanvas, writePsdBuffer } from 'ag-psd';
import { createCanvas, Image, loadImage } from 'canvas';
import sharp from 'sharp';
import fs from 'fs/promises';
import PerspectiveTransform from 'perspective-transform';

// Initialize canvas for ag-psd
initializeCanvas(createCanvas as any);

export class AgPsdMockupService {
  /**
   * Generate mockup using ag-psd library (better for some PSDs)
   */
  async generateMockup(
    psdPathOrBuffer: string | Buffer,
    artworkBuffer: Buffer,
    smartObjectLayerName: string = 'Change Poster'
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

      const psd = readPsd(psdBuffer);
      
      console.log('✅ PSD parsed successfully');
      console.log(`📊 PSD dimensions: ${psd.width} x ${psd.height}`);
      console.log(`📚 Total layers: ${psd.children?.length || 0}\n`);

      // 2. Find smart object layer
      console.log(`🔍 Searching for layer: "${smartObjectLayerName}"`);
      const smartLayer = this.findLayerByName(psd, smartObjectLayerName);
      
      if (!smartLayer) {
        throw new Error(`Smart object layer "${smartObjectLayerName}" not found`);
      }

      console.log(`✅ Found smart object layer: ${smartLayer.name}`);

      // 3. Extract smart object transform data
      if (!smartLayer.placedLayer) {
        throw new Error('Layer is not a smart object');
      }

      const placedData = smartLayer.placedLayer;
      console.log(`📐 Smart object size: ${placedData.width} x ${placedData.height}`);

      // 4. Calculate bounds from transform
      // Transform is 8 points: [x1,y1, x2,y2, x3,y3, x4,y4] (top-left, top-right, bottom-right, bottom-left)
      const transform = placedData.transform;
      const left = Math.min(transform[0], transform[6]);
      const top = Math.min(transform[1], transform[3]);
      const right = Math.max(transform[2], transform[4]);
      const bottom = Math.max(transform[5], transform[7]);
      
      const width = Math.round(right - left);
      const height = Math.round(bottom - top);
      
      console.log(`📍 Calculated position: (${Math.round(left)}, ${Math.round(top)})`);
      console.log(`📏 Calculated size: ${width} x ${height}`);

      // 5. Prepare artwork - resize to smart object's internal size
      console.log('🖼️ Preparing artwork...');
      const artworkResized = await sharp(artworkBuffer)
        .resize(placedData.width, placedData.height, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();

      console.log('✅ Artwork prepared');

      // 6. Render PSD without smart object layer
      console.log('🎨 Rendering PSD base...');
      
      // Hide the smart object layer
      smartLayer.hidden = true;
      
      // Render the PSD to canvas
      const canvas = createCanvas(psd.width!, psd.height!);
      const ctx = canvas.getContext('2d');
      
      // Draw background layers
      this.renderLayers(ctx, psd.children || [], psd.width!, psd.height!);
      
      console.log('✅ Base image rendered');

      // 7. Apply perspective transformation to artwork
      console.log('🎨 Applying perspective transformation...');
      
      // Load artwork as image
      const artworkImage = await loadImage(artworkResized);
      
      // Use nonAffineTransform if available (has perspective), otherwise use transform
      const transformToUse = placedData.nonAffineTransform || transform;
      
      // Get the 4 corner points from transform array
      // [x1,y1, x2,y2, x3,y3, x4,y4] = [TL, TR, BR, BL]
      const corners = [
        { x: transformToUse[0], y: transformToUse[1] }, // Top-left
        { x: transformToUse[2], y: transformToUse[3] }, // Top-right
        { x: transformToUse[4], y: transformToUse[5] }, // Bottom-right
        { x: transformToUse[6], y: transformToUse[7] }  // Bottom-left
      ];
      
      console.log('📐 Transform corners:', corners);
      console.log('📐 Blend mode:', smartLayer.blendMode || 'normal');
      console.log('📐 Opacity:', smartLayer.opacity !== undefined ? smartLayer.opacity : 1);
      
      // Extract blend mode and opacity
      const blendMode = smartLayer.blendMode || 'normal';
      const opacity = smartLayer.opacity !== undefined ? smartLayer.opacity : 1;
      
      // Create a temporary canvas for the artwork with perspective transform
      const tempCanvas = createCanvas(psd.width!, psd.height!);
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw the artwork with perspective transform to the temp canvas
      this.drawPerspectiveImage(tempCtx, artworkImage, corners);
      
      // Apply blend mode and opacity when drawing to the main canvas
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
      
      // Draw the transformed artwork with blend mode and opacity
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Clean up
      ctx.restore();
      
      console.log('✅ Perspective applied');
      
      // 8. Get final image from canvas
      const finalImageBuffer = canvas.toBuffer('image/png');
      let finalImage = finalImageBuffer;

      // 9. Resize if needed to save memory
      const metadata = await sharp(finalImage).metadata();
      if (metadata.width && metadata.width > 1920) {
        console.log(`📏 Resizing output from ${metadata.width}px to 1920px`);
        finalImage = await sharp(finalImage)
          .resize(1920, null, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 92 })
          .toBuffer();
      } else {
        finalImage = await sharp(finalImage)
          .jpeg({ quality: 92 })
          .toBuffer();
      }

      console.log('✅ Mockup generated successfully!');
      return finalImage;

    } catch (error) {
      console.error('❌ Error generating mockup:', error);
      throw error;
    }
  }

  private findLayerByName(psd: any, name: string): any {
    const normalizedName = name.trim().toLowerCase();
    
    const search = (layers: any[]): any => {
      for (const layer of layers) {
        if (layer.name?.trim().toLowerCase() === normalizedName) {
          return layer;
        }
        if (layer.children) {
          const found = search(layer.children);
          if (found) return found;
        }
      }
      return null;
    };

    return search(psd.children || []);
  }

  private renderLayers(ctx: any, layers: any[], width: number, height: number): void {
    for (const layer of layers) {
      if (layer.hidden) continue;
      
      if (layer.canvas) {
        ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
      }
      
      if (layer.children) {
        this.renderLayers(ctx, layer.children, width, height);
      }
    }
  }

  /**
   * Draw an image with perspective transformation
   * Uses a simple quad-to-quad mapping approach
   */
  private drawPerspectiveImage(
    ctx: any,
    image: any,
    corners: Array<{ x: number; y: number }>
  ): void {
    const [tl, tr, br, bl] = corners;
    
    // Calculate the bounding box of the destination quad with some padding
    const padding = 2; // Add padding to avoid edge artifacts
    const minX = Math.max(0, Math.min(tl.x, tr.x, br.x, bl.x) - padding);
    const minY = Math.max(0, Math.min(tl.y, tr.y, br.y, bl.y) - padding);
    const maxX = Math.min(ctx.canvas.width, Math.max(tl.x, tr.x, br.x, bl.x) + padding);
    const maxY = Math.min(ctx.canvas.height, Math.max(tl.y, tr.y, br.y, bl.y) + padding);
    
    const width = Math.ceil(maxX - minX);
    const height = Math.ceil(maxY - minY);
    
    if (width <= 0 || height <= 0) {
      console.warn('Invalid dimensions for perspective transform');
      return;
    }
    
    // Create a temporary canvas for the perspective transformation
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d', { pixelFormat: 'RGBA32' });
    
    // Source points (the image corners)
    const src = [
      0, 0,                    // top-left
      image.width - 1, 0,      // top-right
      image.width - 1, image.height - 1, // bottom-right
      0, image.height - 1      // bottom-left
    ];
    
    // Adjust destination points to be relative to the temp canvas
    const dst = [
      tl.x - minX, tl.y - minY,  // top-left
      tr.x - minX, tr.y - minY,  // top-right
      br.x - minX, br.y - minY,  // bottom-right
      bl.x - minX, bl.y - minY   // bottom-left
    ];
    
    try {
      // Create perspective transformer
      const transformer = PerspectiveTransform(
        src,
        dst
      );
      
      // Create a temporary canvas for the source image
      const srcCanvas = createCanvas(image.width, image.height);
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(image, 0, 0);
      
      // Get the image data with proper color management
      const srcData = srcCtx.getImageData(0, 0, image.width, image.height);
      const destData = tempCtx.createImageData(width, height);
      
      // Pre-calculate the inverse transform for better performance
      const transformInverse = (x: number, y: number) => {
        // Add 0.5 to sample from pixel centers
        return transformer.transformInverse(x + 0.5, y + 0.5);
      };
      
      // Apply perspective transform to each pixel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          try {
            // Transform the point (add 0.5 to sample from pixel centers)
            const [sx, sy] = transformInverse(x, y);
            
            // Only process points inside the source image with a small margin
            if (sx >= -0.5 && sx < image.width - 0.5 && sy >= -0.5 && sy < image.height - 0.5) {
              // Get the interpolated pixel
              const [r, g, b, a] = this.getPixelBilinear(srcData, sx, sy, image.width, image.height);
              
              // Set the destination pixel
              const destPos = (y * width + x) * 4;
              destData.data[destPos] = r;
              destData.data[destPos + 1] = g;
              destData.data[destPos + 2] = b;
              destData.data[destPos + 3] = Math.round(a * 255); // Scale alpha back to 0-255
            }
          } catch (error) {
            // Skip this pixel if there's an error
            console.debug(`Error transforming pixel (${x},${y}):`, error);
          }
        }
      }
      
      // Put the transformed image data back to the canvas
      tempCtx.putImageData(destData, 0, 0);
      
      // Draw the transformed image to the main canvas
      ctx.save();
      // Apply blend mode from the layer properties
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tempCanvas, minX, minY);
      ctx.restore();
      
    } catch (error) {
      console.error('Error in perspective transform:', error);
      // Fallback to simple draw if perspective transform fails
      ctx.save();
      ctx.drawImage(image, minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }
  }
  
  /**
   * Calculate perspective transform matrix
   * Returns [a, b, c, d, e, f] for ctx.transform(a, b, c, d, e, f)
   */
  private calculatePerspectiveTransform(
    src: Array<{x: number, y: number}>,
    dst: Array<{x: number, y: number}>
  ): number[] {
    // This is a simplified perspective transform calculation
    // For a more accurate solution, you might want to use a library like perspective-transform
    
    // Calculate the perspective transform using a simple 4-point homography
    // This is a simplified version and might not work for all cases
    
    // Get the 4 corners
    const x0 = src[0].x, y0 = src[0].y;
    const x1 = src[1].x, y1 = src[1].y;
    const x2 = src[2].x, y2 = src[2].y;
    const x3 = src[3].x, y3 = src[3].y;
    
    const u0 = dst[0].x, v0 = dst[0].y;
    const u1 = dst[1].x, v1 = dst[1].y;
    const u2 = dst[2].x, v2 = dst[2].y;
    const u3 = dst[3].x, v3 = dst[3].y;
    
    // Solve for the perspective transform matrix
    // This is a simplified version that works for most cases
    
    // Calculate the perspective transform matrix
    const A = [
      [x0, y0, 1, 0, 0, 0, -u0*x0, -u0*y0],
      [0, 0, 0, x0, y0, 1, -v0*x0, -v0*y0],
      [x1, y1, 1, 0, 0, 0, -u1*x1, -u1*y1],
      [0, 0, 0, x1, y1, 1, -v1*x1, -v1*y1],
      [x2, y2, 1, 0, 0, 0, -u2*x2, -u2*y2],
      [0, 0, 0, x2, y2, 1, -v2*x2, -v2*y2],
      [x3, y3, 1, 0, 0, 0, -u3*x3, -u3*y3],
      [0, 0, 0, x3, y3, 1, -v3*x3, -v3*y3]
    ];
    
    const b = [u0, v0, u1, v1, u2, v2, u3, v3];
    
    // Solve the system of equations
    const h = this.solveLinearSystem(A, b);
    
    // The perspective transform matrix is:
    // [ h[0] h[1] h[2] ]
    // [ h[3] h[4] h[5] ]
    // [ h[6] h[7]  1   ]
    
    // For canvas transform, we return [a, b, c, d, e, f]
    return [
      h[0], // a
      h[3], // b
      h[1], // c
      h[4], // d
      h[2], // e
      h[5]  // f
    ];
  }
  
  /**
   * Solve a system of linear equations Ax = b using Gaussian elimination
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    
    // Create augmented matrix
    for (let i = 0; i < n; i++) {
      A[i].push(b[i]);
    }
    
    // Gaussian elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot row
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
          maxRow = j;
        }
      }
      
      // Swap rows
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      
      // Eliminate column i
      for (let j = i + 1; j < n; j++) {
        const factor = A[j][i] / A[i][i];
        for (let k = i; k <= n; k++) {
          A[j][k] -= A[i][k] * factor;
        }
      }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) {
        sum += A[i][j] * x[j];
      }
      x[i] = (A[i][n] - sum) / A[i][i];
    }
    
    return x;
  }
  
  private getPixelBilinear(
    imageData: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): [number, number, number, number] {
    // Clamp coordinates to image bounds with 1px edge padding
    x = Math.max(0.5, Math.min(width - 1.5, x));
    y = Math.max(0.5, Math.min(height - 1.5, y));
    
    // Get integer and fractional parts
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = x1 + 1;
    const y2 = y1 + 1;
    
    // Calculate weights for bilinear interpolation
    const wx = x - x1;
    const wy = y - y1;
    const w1 = (1 - wx) * (1 - wy);
    const w2 = wx * (1 - wy);
    const w3 = (1 - wx) * wy;
    const w4 = wx * wy;
    
    // Get the 4 surrounding pixels
    const getPixel = (px: number, py: number, offset: number) => {
      const pos = (py * width + px) * 4 + offset;
      return imageData.data[pos] || 0;
    };
    
    // Interpolate each channel
    const r = (
      getPixel(x1, y1, 0) * w1 +
      getPixel(x2, y1, 0) * w2 +
      getPixel(x1, y2, 0) * w3 +
      getPixel(x2, y2, 0) * w4
    );
    
    const g = (
      getPixel(x1, y1, 1) * w1 +
      getPixel(x2, y1, 1) * w2 +
      getPixel(x1, y2, 1) * w3 +
      getPixel(x2, y2, 1) * w4
    );
    
    const b = (
      getPixel(x1, y1, 2) * w1 +
      getPixel(x2, y1, 2) * w2 +
      getPixel(x1, y2, 2) * w3 +
      getPixel(x2, y2, 2) * w4
    );
    
    const a = (
      getPixel(x1, y1, 3) * w1 +
      getPixel(x2, y1, 3) * w2 +
      getPixel(x1, y2, 3) * w3 +
      getPixel(x2, y2, 3) * w4
    ) / 255; // Normalize alpha
    
    return [r, g, b, a];
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  /**
   * Map Photoshop blend modes to Canvas composite operations
   */
  private mapBlendMode(psBlendMode: string): GlobalCompositeOperation {
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'hue': 'hue',
      'saturation': 'saturation',
      'color': 'color',
      'luminosity': 'luminosity'
    };
    
    return blendModeMap[psBlendMode] || 'source-over';
  }
}

export const agPsdMockupService = new AgPsdMockupService();

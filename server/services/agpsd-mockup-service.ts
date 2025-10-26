import { readPsd, initializeCanvas, writePsdBuffer } from 'ag-psd';
import { createCanvas } from 'canvas';
import sharp from 'sharp';
import fs from 'fs/promises';

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

      // 5. Resize artwork to fill the smart object area completely
      console.log('🖼️ Resizing artwork to fill smart object...');
      const resizedArtwork = await sharp(artworkBuffer)
        .resize(width, height, {
          fit: 'cover',  // Fill entire area, crop if needed to maintain aspect
          position: 'center'
        })
        .png()
        .toBuffer();

      console.log('✅ Artwork resized');

      // 6. Render PSD without smart object layer
      console.log('🎨 Rendering PSD base...');
      
      // Hide the smart object layer
      smartLayer.hidden = true;
      
      // Render the PSD to canvas
      const canvas = createCanvas(psd.width!, psd.height!);
      const ctx = canvas.getContext('2d');
      
      // Draw background layers
      this.renderLayers(ctx, psd.children || [], psd.width!, psd.height!);
      
      const baseImageBuffer = canvas.toBuffer('image/png');
      console.log('✅ Base image rendered');

      // 7. Composite artwork directly onto base (no white background needed)
      console.log('🎨 Compositing final mockup...');
      let finalImage = await sharp(baseImageBuffer)
        .composite([
          {
            input: resizedArtwork,
            left: Math.round(left),
            top: Math.round(top),
            blend: 'over'
          }
        ])
        .png()
        .toBuffer();

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
}

export const agPsdMockupService = new AgPsdMockupService();

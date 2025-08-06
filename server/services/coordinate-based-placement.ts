import { createCanvas, loadImage } from 'canvas';

export interface CoordinatePlacementResult {
  success: boolean;
  mockup: string;
  placement: {
    method: string;
    coordinates: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    };
    artworkSize: {
      width: number;
      height: number;
    };
    artworkPosition: {
      x: number;
      y: number;
    };
  };
}

export class CoordinateBasedPlacer {
  
  // Default coordinates for the frame mockup template (optimized for various artwork types)
  private static DEFAULT_FRAME_COORDINATES = {
    topLeft: { x: 1320, y: 1160 }, 
    topRight: { x: 2792, y: 1164 },
    bottomLeft: { x: 1318, y: 2780 },
    bottomRight: { x: 2794, y: 2784 }
  };
  
  async generateCoordinateMockup(
    mockupBuffer: Buffer, 
    artworkBuffer: Buffer,
    coordinates?: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    },
    fillMode: 'crop-to-fill' | 'fit-within' = 'crop-to-fill'
  ): Promise<CoordinatePlacementResult> {
    try {
      console.log('📍 Starting coordinate-based placement...');
      
      // Use provided coordinates or fall back to defaults
      const finalCoordinates = coordinates || CoordinateBasedPlacer.DEFAULT_FRAME_COORDINATES;
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      
      // Draw mockup first
      ctx.drawImage(mockupImage, 0, 0);
      
      // Calculate frame dimensions from coordinates
      const frameWidth = Math.abs(finalCoordinates.topRight.x - finalCoordinates.topLeft.x);
      const frameHeight = Math.abs(finalCoordinates.bottomLeft.y - finalCoordinates.topLeft.y);
      const frameX = Math.min(finalCoordinates.topLeft.x, finalCoordinates.topRight.x);
      const frameY = Math.min(finalCoordinates.topLeft.y, finalCoordinates.bottomLeft.y);
      
      console.log(`📍 Frame area: ${frameWidth}x${frameHeight} at (${frameX}, ${frameY})`);
      
      // Calculate optimal artwork placement within the frame
      const artworkAspect = artworkImage.width / artworkImage.height;
      const frameAspect = frameWidth / frameHeight;
      
      let newWidth, newHeight, offsetX, offsetY;
      
      if (fillMode === 'crop-to-fill') {
        // CROP TO FILL - scale artwork to completely fill frame (may crop edges)
        // This ensures no gaps/white space in the frame
        const cropRatio = Math.max(frameWidth / artworkImage.width, frameHeight / artworkImage.height);
        
        newWidth = artworkImage.width * cropRatio;
        newHeight = artworkImage.height * cropRatio;
        
        // Center the scaled artwork in the frame
        offsetX = frameX - (newWidth - frameWidth) / 2;
        offsetY = frameY - (newHeight - frameHeight) / 2;
      } else {
        // FIT WITHIN - scale artwork to fit entirely within frame (may leave gaps)
        if (artworkAspect > frameAspect) {
          // Artwork is wider than frame - fit to frame width
          newWidth = frameWidth;
          newHeight = frameWidth / artworkAspect;
          offsetX = frameX;
          offsetY = frameY + (frameHeight - newHeight) / 2;
        } else {
          // Artwork is taller than frame - fit to frame height  
          newHeight = frameHeight;
          newWidth = frameHeight * artworkAspect;
          offsetX = frameX + (frameWidth - newWidth) / 2;
          offsetY = frameY;
        }
      }
      
      console.log(`📍 Placing artwork at (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) with size ${newWidth.toFixed(1)}x${newHeight.toFixed(1)}`);
      
      // Draw the artwork with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        placement: {
          method: 'Coordinate-Based Placement',
          coordinates: finalCoordinates,
          artworkSize: {
            width: Math.round(newWidth),
            height: Math.round(newHeight)
          },
          artworkPosition: {
            x: Math.round(offsetX),
            y: Math.round(offsetY)
          }
        }
      };
      
    } catch (error) {
      console.error('📍 Coordinate-based placement failed:', error);
      throw error;
    }
  }
}
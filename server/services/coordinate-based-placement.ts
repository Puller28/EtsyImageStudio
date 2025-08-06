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
  
  // Default coordinates for the frame mockup template (full black frame opening)
  private static DEFAULT_FRAME_COORDINATES = {
    topLeft: { x: 1320, y: 1135 }, 
    topRight: { x: 2792, y: 1139 },
    bottomLeft: { x: 1318, y: 2861 },
    bottomRight: { x: 2794, y: 2865 }
  };
  
  async generateCoordinateMockup(
    mockupBuffer: Buffer, 
    artworkBuffer: Buffer,
    coordinates?: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    }
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
      
      // No padding - fill the entire frame opening
      const padding = 0; // No padding for maximum fill
      const availableWidth = frameWidth;
      const availableHeight = frameHeight;
      
      if (artworkAspect > frameAspect) {
        // Artwork is wider than frame - fit to available width
        newWidth = availableWidth;
        newHeight = availableWidth / artworkAspect;
        offsetX = frameX;
        offsetY = frameY + (frameHeight - newHeight) / 2;
      } else {
        // Artwork is taller than frame - fit to available height  
        newHeight = availableHeight;
        newWidth = availableHeight * artworkAspect;
        offsetX = frameX + (frameWidth - newWidth) / 2;
        offsetY = frameY;
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
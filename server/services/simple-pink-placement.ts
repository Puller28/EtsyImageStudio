import { createCanvas, loadImage } from 'canvas';

export interface SimplePlacementResult {
  success: boolean;
  mockup: string;
  detection: {
    method: string;
    areas: number;
    totalPixels: number;
    largestArea: {
      x: number;
      y: number;
      width: number;
      height: number;
      pixels: number;
    } | null;
  };
}

export class SimplePinkPlacer {
  
  async generateSimpleMockup(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<SimplePlacementResult> {
    try {
      console.log('🎯 Starting simple pink area placement...');
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      
      // Draw mockup first
      ctx.drawImage(mockupImage, 0, 0);
      
      // Get image data for pink detection
      const imageData = ctx.getImageData(0, 0, mockupImage.width, mockupImage.height);
      const data = imageData.data;
      
      // Enhanced pink detection using same logic as Sharp-based method
      let minX = mockupImage.width, maxX = 0, minY = mockupImage.height, maxY = 0;
      let pinkPixelCount = 0;
      
      // Pink detection function matching the working Sharp implementation
      const isPink = (r: number, g: number, b: number): boolean => {
        // Use exact same logic as the working Sharp-based detection
        return (
          r > 180 && // High red component
          g < 150 && // Low green component
          b > 100 && // Moderate to high blue component
          r > g + 50 && // Red significantly higher than green
          r > b - 50 // Red higher than or close to blue
        ) || (
          // Bright magenta/fuchsia detection
          r > 200 && b > 200 && g < 100
        ) || (
          // Light pink detection
          r > 220 && g > 150 && b > 150 && r > g && r > b
        );
      };
      
      // Sample pixels efficiently - check every pixel for better accuracy
      for (let y = 0; y < mockupImage.height; y++) {
        for (let x = 0; x < mockupImage.width; x++) {
          const index = (y * mockupImage.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          if (isPink(r, g, b)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            pinkPixelCount++;
          }
        }
      }
      
      if (pinkPixelCount === 0 || minX >= maxX || minY >= maxY) {
        throw new Error('No pink areas detected in mockup template');
      }
      
      // Calculate the pink area bounds
      const pinkArea = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        pixels: pinkPixelCount
      };
      
      console.log(`🎯 Found pink area: ${pinkArea.width}x${pinkArea.height} at (${pinkArea.x}, ${pinkArea.y}) with ${pinkPixelCount} samples`);
      
      // Fill pink area with intelligent background color
      this.fillPinkAreaIntelligently(ctx, pinkArea, data, mockupImage.width, mockupImage.height);
      
      // Calculate optimal artwork placement
      const artworkAspect = artworkImage.width / artworkImage.height;
      const areaAspect = pinkArea.width / pinkArea.height;
      
      // Add 8% padding inside the area
      const padding = 0.08;
      const availableWidth = pinkArea.width * (1 - padding * 2);
      const availableHeight = pinkArea.height * (1 - padding * 2);
      
      let newWidth, newHeight, offsetX, offsetY;
      
      if (artworkAspect > areaAspect) {
        // Artwork is wider - fit to available width
        newWidth = availableWidth;
        newHeight = availableWidth / artworkAspect;
        offsetX = pinkArea.x + pinkArea.width * padding;
        offsetY = pinkArea.y + (pinkArea.height - newHeight) / 2;
      } else {
        // Artwork is taller - fit to available height  
        newHeight = availableHeight;
        newWidth = availableHeight * artworkAspect;
        offsetX = pinkArea.x + (pinkArea.width - newWidth) / 2;
        offsetY = pinkArea.y + pinkArea.height * padding;
      }
      
      console.log(`🎯 Placing artwork at (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) with size ${newWidth.toFixed(1)}x${newHeight.toFixed(1)}`);
      
      // Draw the artwork with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        detection: {
          method: 'Simple Pink Area Placement',
          areas: 1,
          totalPixels: pinkPixelCount * 16, // Estimate full pixels from samples
          largestArea: pinkArea
        }
      };
      
    } catch (error) {
      console.error('🎯 Simple pink placement failed:', error);
      throw error;
    }
  }
  
  private fillPinkAreaIntelligently(ctx: any, pinkArea: any, data: Uint8ClampedArray, width: number, height: number) {
    // Sample colors around the pink area to find best fill color
    const samplePoints = [
      { x: pinkArea.x - 10, y: pinkArea.y + pinkArea.height / 2 }, // Left
      { x: pinkArea.x + pinkArea.width + 10, y: pinkArea.y + pinkArea.height / 2 }, // Right
      { x: pinkArea.x + pinkArea.width / 2, y: pinkArea.y - 10 }, // Top
      { x: pinkArea.x + pinkArea.width / 2, y: pinkArea.y + pinkArea.height + 10 } // Bottom
    ];
    
    const colors: Array<{r: number, g: number, b: number}> = [];
    
    for (const point of samplePoints) {
      if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
        const index = (Math.floor(point.y) * width + Math.floor(point.x)) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Skip if this is also a pink pixel (use same detection logic)
        const isPinkPixel = (
          r > 180 && g < 150 && b > 100 && r > g + 50 && r > b - 50
        ) || (
          r > 200 && b > 200 && g < 100
        ) || (
          r > 220 && g > 150 && b > 150 && r > g && r > b
        );
        
        if (!isPinkPixel) {
          colors.push({ r, g, b });
        }
      }
    }
    
    // Calculate average color or use neutral gray
    let avgR = 240, avgG = 240, avgB = 240; // Default light gray
    
    if (colors.length > 0) {
      avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
      avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
      avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
    }
    
    console.log(`🎯 Filling pink area with color: rgb(${avgR}, ${avgG}, ${avgB})`);
    
    // Fill the entire pink area with the calculated color
    ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
    ctx.fillRect(pinkArea.x, pinkArea.y, pinkArea.width, pinkArea.height);
  }
}
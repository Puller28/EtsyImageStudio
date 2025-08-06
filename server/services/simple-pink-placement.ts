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
      
      // Find discrete pink areas using flood-fill approach like the original method
      const visitedPixels = new Set<string>();
      const pinkAreas: Array<{x: number, y: number, width: number, height: number, pixels: number}> = [];
      
      // Pink detection function matching the working Sharp implementation
      const isPink = (r: number, g: number, b: number): boolean => {
        return (
          r > 180 && g < 150 && b > 100 && r > g + 50 && r > b - 50
        ) || (
          r > 200 && b > 200 && g < 100
        ) || (
          r > 220 && g > 150 && b > 150 && r > g && r > b
        );
      };
      
      // Scan for pink pixels and perform flood fill to find discrete areas
      for (let y = 0; y < mockupImage.height; y += 2) { // Sample every 2nd pixel for efficiency
        for (let x = 0; x < mockupImage.width; x += 2) {
          const pixelKey = `${x},${y}`;
          if (visitedPixels.has(pixelKey)) continue;
          
          const index = (y * mockupImage.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          if (isPink(r, g, b)) {
            // Found a pink pixel, perform flood fill to find the entire area
            const area = this.floodFillPinkArea(data, mockupImage.width, mockupImage.height, x, y, visitedPixels, isPink);
            if (area.pixels > 1000) { // Minimum area threshold
              pinkAreas.push(area);
            }
          }
        }
      }
      
      console.log(`🎯 Found ${pinkAreas.length} discrete pink areas`);
      
      if (pinkAreas.length === 0) {
        throw new Error('No pink areas detected in mockup template');
      }
      
      // Use the largest pink area (like the original method)
      const largestArea = pinkAreas.reduce((largest, current) => 
        current.pixels > largest.pixels ? current : largest
      );
      
      const pinkArea = {
        x: largestArea.x,
        y: largestArea.y,
        width: largestArea.width,
        height: largestArea.height,
        pixels: largestArea.pixels
      };
      
      console.log(`🎯 Found largest pink area: ${pinkArea.width}x${pinkArea.height} at (${pinkArea.x}, ${pinkArea.y}) with ${pinkArea.pixels} pixels`);
      
      // Fill pink area with intelligent background color
      this.fillPinkAreaIntelligently(ctx, pinkArea, data, mockupImage.width, mockupImage.height);
      
      // Calculate optimal artwork placement (matching original method's approach)
      const artworkAspect = artworkImage.width / artworkImage.height;
      console.log(`🎯 Artwork dimensions: ${artworkImage.width}x${artworkImage.height}, aspect ratio: ${artworkAspect.toFixed(3)}`);
      
      // Use minimal padding for maximum frame utilization
      const padding = 0.02; // Reduced from 8% to 2%
      const availableWidth = pinkArea.width * (1 - padding * 2);
      const availableHeight = pinkArea.height * (1 - padding * 2);
      
      let newWidth, newHeight, offsetX, offsetY;
      
      // For square artworks, prioritize fitting to the smaller dimension for better centering
      if (Math.abs(artworkAspect - 1.0) < 0.1) {
        // Square artwork - use smaller dimension to ensure it fits completely
        const targetSize = Math.min(availableWidth, availableHeight);
        newWidth = targetSize;
        newHeight = targetSize;
        offsetX = pinkArea.x + (pinkArea.width - newWidth) / 2;
        offsetY = pinkArea.y + (pinkArea.height - newHeight) / 2;
      } else if (artworkAspect > 1.2) {
        // Wide artwork - fit to width
        newWidth = availableWidth;
        newHeight = availableWidth / artworkAspect;
        offsetX = pinkArea.x + pinkArea.width * padding;
        offsetY = pinkArea.y + (pinkArea.height - newHeight) / 2;
      } else {
        // Tall or nearly square artwork - fit to height
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
          areas: pinkAreas.length,
          totalPixels: pinkAreas.reduce((sum, area) => sum + area.pixels, 0),
          largestArea: pinkArea
        }
      };
      
    } catch (error) {
      console.error('🎯 Simple pink placement failed:', error);
      throw error;
    }
  }

  /**
   * Flood fill algorithm to find connected pink pixels (Canvas version)
   */
  private floodFillPinkArea(
    data: Uint8ClampedArray, 
    width: number, 
    height: number,
    startX: number, 
    startY: number, 
    visitedPixels: Set<string>,
    isPink: (r: number, g: number, b: number) => boolean
  ): {x: number, y: number, width: number, height: number, pixels: number} {
    const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
    let pixelCount = 0;
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      const pixelKey = `${x},${y}`;
      
      if (visitedPixels.has(pixelKey) || x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      
      if (!isPink(r, g, b)) continue;
      
      visitedPixels.add(pixelKey);
      pixelCount++;
      
      // Update bounds
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add neighboring pixels
      stack.push({x: x + 1, y});
      stack.push({x: x - 1, y});
      stack.push({x, y: y + 1});
      stack.push({x, y: y - 1});
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      pixels: pixelCount
    };
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
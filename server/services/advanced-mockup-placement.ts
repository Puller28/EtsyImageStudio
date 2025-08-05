import sharp from 'sharp';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';

export interface PlacementArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: number;
}

export interface MockupPlacementResult {
  success: boolean;
  mockup: string;
  detection: {
    method: string;
    areas: number;
    totalPixels: number;
    largestArea: PlacementArea | null;
  };
}

export class AdvancedMockupPlacer {
  
  /**
   * Method 1: Enhanced Pink Area Detection with Better Color Matching
   */
  async enhancedPinkAreaPlacement(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<MockupPlacementResult> {
    try {
      console.log('🎨 Starting enhanced pink area placement...');
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      
      // Draw mockup
      ctx.drawImage(mockupImage, 0, 0);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, mockupImage.width, mockupImage.height);
      const data = imageData.data;
      
      // Enhanced pink detection with multiple pink ranges
      const pinkRanges = [
        { r: [200, 255], g: [100, 200], b: [150, 255] }, // Bright pink/magenta
        { r: [180, 255], g: [50, 150], b: [120, 255] },  // Hot pink
        { r: [220, 255], g: [20, 100], b: [147, 220] },  // Deep magenta
        { r: [255, 255], g: [0, 100], b: [255, 255] },   // Pure magenta
      ];
      
      const pinkPixels: Array<{x: number, y: number}> = [];
      
      for (let y = 0; y < mockupImage.height; y++) {
        for (let x = 0; x < mockupImage.width; x++) {
          const index = (y * mockupImage.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Check if pixel matches any pink range
          const isPink = pinkRanges.some(range => 
            r >= range.r[0] && r <= range.r[1] &&
            g >= range.g[0] && g <= range.g[1] &&
            b >= range.b[0] && b <= range.b[1]
          );
          
          if (isPink) {
            pinkPixels.push({ x, y });
          }
        }
      }
      
      if (pinkPixels.length === 0) {
        throw new Error('No pink areas detected');
      }
      
      // Find largest connected area using flood fill
      const areas = this.findConnectedAreas(pinkPixels, mockupImage.width, mockupImage.height);
      const largestArea = areas.reduce((max, area) => area.pixels > max.pixels ? area : max);
      
      console.log(`🎨 Found ${areas.length} pink areas, largest: ${largestArea.width}x${largestArea.height}`);
      
      // Calculate optimal artwork size maintaining aspect ratio
      const artworkAspect = artworkImage.width / artworkImage.height;
      const areaAspect = largestArea.width / largestArea.height;
      
      let newWidth, newHeight;
      if (artworkAspect > areaAspect) {
        // Artwork is wider - fit to width
        newWidth = largestArea.width;
        newHeight = largestArea.width / artworkAspect;
      } else {
        // Artwork is taller - fit to height
        newHeight = largestArea.height;
        newWidth = largestArea.height * artworkAspect;
      }
      
      // Center the artwork in the pink area
      const offsetX = largestArea.x + (largestArea.width - newWidth) / 2;
      const offsetY = largestArea.y + (largestArea.height - newHeight) / 2;
      
      // First, fill pink area with white/transparent to remove pink
      this.fillPinkAreas(ctx, pinkPixels, 'white');
      
      // Draw artwork with proper scaling and positioning
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        detection: {
          method: 'Enhanced Pink Area Detection',
          areas: areas.length,
          totalPixels: pinkPixels.length,
          largestArea
        }
      };
      
    } catch (error) {
      console.error('🎨 Enhanced pink placement failed:', error);
      throw error;
    }
  }
  
  /**
   * Method 2: Template Matching - Find rectangular frames automatically
   */
  async templateMatching(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<MockupPlacementResult> {
    try {
      console.log('🔍 Starting template matching...');
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mockupImage, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, mockupImage.width, mockupImage.height);
      const frames = this.detectFrames(imageData);
      
      if (frames.length === 0) {
        throw new Error('No frames detected');
      }
      
      const largestFrame = frames.reduce((max, frame) => frame.pixels > max.pixels ? frame : max);
      
      // Place artwork in detected frame
      const artworkAspect = artworkImage.width / artworkImage.height;
      const frameAspect = largestFrame.width / largestFrame.height;
      
      let newWidth, newHeight;
      if (artworkAspect > frameAspect) {
        newWidth = largestFrame.width;
        newHeight = largestFrame.width / artworkAspect;
      } else {
        newHeight = largestFrame.height;
        newWidth = largestFrame.height * artworkAspect;
      }
      
      const offsetX = largestFrame.x + (largestFrame.width - newWidth) / 2;
      const offsetY = largestFrame.y + (largestFrame.height - newHeight) / 2;
      
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        detection: {
          method: 'Template Matching',
          areas: frames.length,
          totalPixels: largestFrame.pixels,
          largestArea: largestFrame
        }
      };
      
    } catch (error) {
      console.error('🔍 Template matching failed:', error);
      throw error;
    }
  }
  
  /**
   * Method 3: Edge Detection - Find frame boundaries by detecting edges
   */
  async edgeDetection(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<MockupPlacementResult> {
    try {
      console.log('📐 Starting edge detection...');
      
      // Convert to grayscale and detect edges using Sharp
      const edges = await sharp(mockupBuffer)
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      // Find rectangular regions from edge data
      const rectangles = this.findRectangularRegions(edges.data, edges.info.width, edges.info.height);
      
      if (rectangles.length === 0) {
        throw new Error('No rectangular regions detected');
      }
      
      const largestRect = rectangles.reduce((max, rect) => rect.pixels > max.pixels ? rect : max);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mockupImage, 0, 0);
      
      // Place artwork in detected rectangle
      const artworkAspect = artworkImage.width / artworkImage.height;
      const rectAspect = largestRect.width / largestRect.height;
      
      let newWidth, newHeight;
      if (artworkAspect > rectAspect) {
        newWidth = largestRect.width * 0.9; // Leave 10% margin
        newHeight = (largestRect.width * 0.9) / artworkAspect;
      } else {
        newHeight = largestRect.height * 0.9;
        newWidth = (largestRect.height * 0.9) * artworkAspect;
      }
      
      const offsetX = largestRect.x + (largestRect.width - newWidth) / 2;
      const offsetY = largestRect.y + (largestRect.height - newHeight) / 2;
      
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        detection: {
          method: 'Edge Detection',
          areas: rectangles.length,
          totalPixels: largestRect.pixels,
          largestArea: largestRect
        }
      };
      
    } catch (error) {
      console.error('📐 Edge detection failed:', error);
      throw error;
    }
  }
  
  /**
   * Method 4: Smart Auto-Detection - Tries multiple methods and picks the best result
   */
  async smartAutoDetection(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<MockupPlacementResult> {
    console.log('🤖 Starting smart auto-detection...');
    
    const methods = [
      () => this.enhancedPinkAreaPlacement(mockupBuffer, artworkBuffer),
      () => this.templateMatching(mockupBuffer, artworkBuffer),
      () => this.edgeDetection(mockupBuffer, artworkBuffer)
    ];
    
    const results: MockupPlacementResult[] = [];
    
    for (const method of methods) {
      try {
        const result = await method();
        results.push(result);
      } catch (error) {
        console.log(`Method failed: ${error.message}`);
      }
    }
    
    if (results.length === 0) {
      throw new Error('All detection methods failed');
    }
    
    // Pick the result with the largest detected area
    const bestResult = results.reduce((best, current) => {
      const bestArea = best.detection.largestArea?.pixels || 0;
      const currentArea = current.detection.largestArea?.pixels || 0;
      return currentArea > bestArea ? current : best;
    });
    
    bestResult.detection.method = 'Smart Auto-Detection';
    return bestResult;
  }
  
  // Helper methods
  private findConnectedAreas(pixels: Array<{x: number, y: number}>, width: number, height: number): PlacementArea[] {
    const visited = new Set<string>();
    const areas: PlacementArea[] = [];
    
    for (const pixel of pixels) {
      const key = `${pixel.x},${pixel.y}`;
      if (visited.has(key)) continue;
      
      const area = this.floodFill(pixel.x, pixel.y, pixels, visited, width, height);
      if (area.pixels > 100) { // Filter out tiny areas
        areas.push(area);
      }
    }
    
    return areas;
  }
  
  private floodFill(startX: number, startY: number, allPixels: Array<{x: number, y: number}>, visited: Set<string>, width: number, height: number): PlacementArea {
    const pixelSet = new Set(allPixels.map(p => `${p.x},${p.y}`));
    const stack = [{x: startX, y: startY}];
    const areaPixels: Array<{x: number, y: number}> = [];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key) || !pixelSet.has(key)) continue;
      
      visited.add(key);
      areaPixels.push(current);
      
      // Check 4-connected neighbors
      const neighbors = [
        {x: current.x - 1, y: current.y},
        {x: current.x + 1, y: current.y},
        {x: current.x, y: current.y - 1},
        {x: current.x, y: current.y + 1}
      ];
      
      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
          stack.push(neighbor);
        }
      }
    }
    
    const minX = Math.min(...areaPixels.map(p => p.x));
    const maxX = Math.max(...areaPixels.map(p => p.x));
    const minY = Math.min(...areaPixels.map(p => p.y));
    const maxY = Math.max(...areaPixels.map(p => p.y));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels: areaPixels.length
    };
  }
  
  private fillPinkAreas(ctx: CanvasRenderingContext2D, pinkPixels: Array<{x: number, y: number}>, fillColor: string) {
    ctx.fillStyle = fillColor;
    for (const pixel of pinkPixels) {
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }
  
  private detectFrames(imageData: any): PlacementArea[] {
    // Simplified frame detection - look for rectangular bright/white areas
    const { data, width, height } = imageData;
    const frames: PlacementArea[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd use more sophisticated computer vision techniques
    
    return frames;
  }
  
  private findRectangularRegions(edgeData: Buffer, width: number, height: number): PlacementArea[] {
    // Simplified rectangular region detection from edge data
    const regions: PlacementArea[] = [];
    
    // This would implement Hough transform or similar for rectangle detection
    // For now, return a placeholder
    
    return regions;
  }
}
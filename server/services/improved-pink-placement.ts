import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';

export interface ImprovedPlacementResult {
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

export class ImprovedPinkPlacer {
  
  async generateImprovedMockup(mockupBuffer: Buffer, artworkBuffer: Buffer): Promise<ImprovedPlacementResult> {
    try {
      console.log('🎨 Starting improved pink area placement...');
      
      const mockupImage = await loadImage(mockupBuffer);
      const artworkImage = await loadImage(artworkBuffer);
      
      const canvas = createCanvas(mockupImage.width, mockupImage.height);
      const ctx = canvas.getContext('2d');
      
      // Draw mockup first
      ctx.drawImage(mockupImage, 0, 0);
      
      // Get image data for pink detection
      const imageData = ctx.getImageData(0, 0, mockupImage.width, mockupImage.height);
      const data = imageData.data;
      
      // Optimized pink detection - sample pixels for performance
      const pinkPixels: Array<{x: number, y: number}> = [];
      const step = 2; // Sample every 2nd pixel for initial detection
      
      for (let y = 0; y < mockupImage.height; y += step) {
        for (let x = 0; x < mockupImage.width; x += step) {
          const index = (y * mockupImage.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Enhanced pink detection - multiple approaches
          const isPink = this.isPinkPixel(r, g, b);
          
          if (isPink) {
            // Fill in the area around detected pink pixel
            for (let dy = 0; dy < step && y + dy < mockupImage.height; dy++) {
              for (let dx = 0; dx < step && x + dx < mockupImage.width; dx++) {
                pinkPixels.push({ x: x + dx, y: y + dy });
              }
            }
          }
        }
      }
      
      if (pinkPixels.length === 0) {
        throw new Error('No pink areas detected in mockup template');
      }
      
      console.log(`🎨 Found ${pinkPixels.length} pink pixels`);
      
      // Find connected areas using flood fill
      const areas = this.findConnectedAreas(pinkPixels, mockupImage.width, mockupImage.height);
      const largestArea = areas.reduce((max, area) => area.pixels > max.pixels ? area : max);
      
      console.log(`🎨 Found ${areas.length} connected areas, largest: ${largestArea.width}x${largestArea.height}`);
      
      // Step 1: Remove ALL pink pixels by filling with background color
      this.fillPinkAreasIntelligently(ctx, pinkPixels, mockupImage.width, mockupImage.height);
      
      // Step 2: Calculate optimal artwork placement with proper aspect ratio
      const artworkAspect = artworkImage.width / artworkImage.height;
      const areaAspect = largestArea.width / largestArea.height;
      
      let newWidth, newHeight;
      let offsetX, offsetY;
      
      // Add 5% padding inside the area
      const paddingPercent = 0.05;
      const availableWidth = largestArea.width * (1 - paddingPercent * 2);
      const availableHeight = largestArea.height * (1 - paddingPercent * 2);
      
      if (artworkAspect > areaAspect) {
        // Artwork is wider - fit to available width
        newWidth = availableWidth;
        newHeight = availableWidth / artworkAspect;
        
        // Center vertically
        offsetX = largestArea.x + largestArea.width * paddingPercent;
        offsetY = largestArea.y + (largestArea.height - newHeight) / 2;
      } else {
        // Artwork is taller - fit to available height
        newHeight = availableHeight;
        newWidth = availableHeight * artworkAspect;
        
        // Center horizontally
        offsetX = largestArea.x + (largestArea.width - newWidth) / 2;
        offsetY = largestArea.y + largestArea.height * paddingPercent;
      }
      
      console.log(`🎨 Placing artwork at (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) with size ${newWidth.toFixed(1)}x${newHeight.toFixed(1)}`);
      
      // Step 3: Draw the artwork with anti-aliasing for smooth edges
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(artworkImage, offsetX, offsetY, newWidth, newHeight);
      
      return {
        success: true,
        mockup: canvas.toDataURL('image/jpeg', 0.95),
        detection: {
          method: 'Improved Pink Area Placement',
          areas: areas.length,
          totalPixels: pinkPixels.length,
          largestArea
        }
      };
      
    } catch (error) {
      console.error('🎨 Improved pink placement failed:', error);
      throw error;
    }
  }
  
  private isPinkPixel(r: number, g: number, b: number): boolean {
    // Method 1: HSV-based pink detection
    const hsv = this.rgbToHsv(r, g, b);
    const isPinkHSV = (hsv.h >= 300 || hsv.h <= 30) && hsv.s > 0.3 && hsv.v > 0.4;
    
    // Method 2: RGB ratio-based detection
    const isPinkRGB = r > 150 && g < 200 && b > 100 && r > g && r > b * 0.8;
    
    // Method 3: Magenta detection
    const isMagenta = r > 200 && g < 150 && b > 150 && Math.abs(r - b) < 50;
    
    // Method 4: Specific pink ranges
    const isHotPink = r > 220 && g > 20 && g < 120 && b > 150 && b < 220;
    
    return isPinkHSV || isPinkRGB || isMagenta || isHotPink;
  }
  
  private rgbToHsv(r: number, g: number, b: number): {h: number, s: number, v: number} {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    
    if (diff !== 0) {
      switch (max) {
        case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / diff + 2) / 6; break;
        case b: h = ((r - g) / diff + 4) / 6; break;
      }
    }
    
    return { h: h * 360, s, v };
  }
  
  private findConnectedAreas(pixels: Array<{x: number, y: number}>, width: number, height: number) {
    const visited = new Set<string>();
    const pixelSet = new Set(pixels.map(p => `${p.x},${p.y}`));
    const areas: Array<{x: number, y: number, width: number, height: number, pixels: number}> = [];
    
    // Limit processing to avoid overwhelming the system
    const maxPixelsToProcess = 100000; // Process max 100k pixels
    const pixelsToProcess = pixels.length > maxPixelsToProcess ? 
      pixels.slice(0, maxPixelsToProcess) : pixels;
    
    console.log(`🎨 Processing ${pixelsToProcess.length} of ${pixels.length} pink pixels for area detection`);
    
    for (let i = 0; i < pixelsToProcess.length; i += 100) { // Sample every 100th pixel to reduce processing
      const pixel = pixelsToProcess[i];
      const key = `${pixel.x},${pixel.y}`;
      if (visited.has(key)) continue;
      
      const area = this.floodFill(pixel.x, pixel.y, pixelSet, visited, width, height);
      if (area.pixels > 1000) { // Only keep substantial areas
        areas.push(area);
        console.log(`🎨 Found area: ${area.width}x${area.height} with ${area.pixels} pixels`);
      }
      
      // Stop if we found a large area (likely the main frame)
      if (area.pixels > 50000) {
        console.log(`🎨 Found large area, stopping search early`);
        break;
      }
    }
    
    return areas;
  }
  
  private floodFill(startX: number, startY: number, pixelSet: Set<string>, visited: Set<string>, width: number, height: number) {
    const queue = [{x: startX, y: startY}];
    const areaPixels: Array<{x: number, y: number}> = [];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key) || !pixelSet.has(key)) continue;
      
      visited.add(key);
      areaPixels.push(current);
      
      // Update bounds efficiently
      minX = Math.min(minX, current.x);
      maxX = Math.max(maxX, current.x);
      minY = Math.min(minY, current.y);
      maxY = Math.max(maxY, current.y);
      
      // Check 4-connected neighbors (simpler and more stable)
      const neighbors = [
        {x: current.x, y: current.y - 1},     // top
        {x: current.x - 1, y: current.y},     // left
        {x: current.x + 1, y: current.y},     // right
        {x: current.x, y: current.y + 1}      // bottom
      ];
      
      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          if (!visited.has(neighborKey) && pixelSet.has(neighborKey)) {
            queue.push(neighbor);
          }
        }
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels: areaPixels.length
    };
  }
  
  private fillPinkAreasIntelligently(ctx: CanvasRenderingContext2D, pinkPixels: Array<{x: number, y: number}>, width: number, height: number) {
    // Sample surrounding colors to determine best fill color
    const surroundingColors: Array<{r: number, g: number, b: number}> = [];
    
    for (const pixel of pinkPixels.slice(0, 100)) { // Sample first 100 pixels
      // Check surrounding pixels
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const x = pixel.x + dx;
          const y = pixel.y + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const imageData = ctx.getImageData(x, y, 1, 1);
            const data = imageData.data;
            const r = data[0];
            const g = data[1];
            const b = data[2];
            
            // Skip if this is also a pink pixel
            if (!this.isPinkPixel(r, g, b)) {
              surroundingColors.push({ r, g, b });
            }
          }
        }
      }
    }
    
    // Calculate average surrounding color
    let avgR = 255, avgG = 255, avgB = 255; // Default to white
    
    if (surroundingColors.length > 0) {
      avgR = Math.round(surroundingColors.reduce((sum, c) => sum + c.r, 0) / surroundingColors.length);
      avgG = Math.round(surroundingColors.reduce((sum, c) => sum + c.g, 0) / surroundingColors.length);
      avgB = Math.round(surroundingColors.reduce((sum, c) => sum + c.b, 0) / surroundingColors.length);
    }
    
    console.log(`🎨 Filling pink areas with average surrounding color: rgb(${avgR}, ${avgG}, ${avgB})`);
    
    // Fill all pink pixels with the calculated color
    ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
    for (const pixel of pinkPixels) {
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }
}
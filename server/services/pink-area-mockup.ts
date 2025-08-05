import sharp from 'sharp';
import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';

interface PinkAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: Array<{x: number, y: number}>; // For irregular shapes
}

/**
 * Detects pink areas in an image and returns their bounds
 * Pink detection uses a range of pink/magenta colors
 */
async function detectPinkAreas(imageBuffer: Buffer): Promise<PinkAreaBounds[]> {
  try {
    // Get image data using Sharp
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    const pinkAreas: PinkAreaBounds[] = [];
    const visitedPixels = new Set<string>();
    
    // Pink color detection parameters (RGB values)
    const isPink = (r: number, g: number, b: number): boolean => {
      // Detect various shades of pink/magenta
      // Hot pink: RGB(255, 20, 147)
      // Fuchsia: RGB(255, 0, 255) 
      // Light pink: RGB(255, 182, 193)
      // Deep pink: RGB(255, 20, 147)
      
      const pinkThreshold = 50; // Tolerance for color matching
      
      // Check if it's predominantly red with some blue, minimal green
      const isPinkish = (
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
      
      return isPinkish;
    };
    
    // Scan for pink pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelKey = `${x},${y}`;
        
        if (visitedPixels.has(pixelKey)) continue;
        
        const pixelIndex = (y * width + x) * channels;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        if (isPink(r, g, b)) {
          // Found a pink pixel, perform flood fill to find the entire area
          const area = floodFillPinkArea(data, width, height, channels, x, y, visitedPixels, isPink);
          if (area.pixels.length > 100) { // Minimum area threshold
            pinkAreas.push(area);
          }
        }
      }
    }
    
    console.log(`🌸 Detected ${pinkAreas.length} pink areas in mockup template`);
    return pinkAreas;
    
  } catch (error) {
    console.error('Failed to detect pink areas:', error);
    throw new Error('Pink area detection failed');
  }
}

/**
 * Flood fill algorithm to find connected pink pixels
 */
function floodFillPinkArea(
  data: Buffer, 
  width: number, 
  height: number, 
  channels: number,
  startX: number, 
  startY: number, 
  visitedPixels: Set<string>,
  isPink: (r: number, g: number, b: number) => boolean
): PinkAreaBounds {
  const pixels: Array<{x: number, y: number}> = [];
  const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
  
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  
  while (stack.length > 0) {
    const {x, y} = stack.pop()!;
    const pixelKey = `${x},${y}`;
    
    if (visitedPixels.has(pixelKey) || x < 0 || x >= width || y < 0 || y >= height) {
      continue;
    }
    
    const pixelIndex = (y * width + x) * channels;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    
    if (!isPink(r, g, b)) continue;
    
    visitedPixels.add(pixelKey);
    pixels.push({x, y});
    
    // Update bounds
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // Add adjacent pixels to stack
    stack.push({x: x + 1, y});
    stack.push({x: x - 1, y});
    stack.push({x, y: y + 1});
    stack.push({x, y: y - 1});
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels
  };
}

/**
 * Generate a mockup by replacing pink areas with the provided image
 */
export async function generatePinkAreaMockup(
  mockupTemplateBuffer: Buffer, 
  artworkImageBuffer: Buffer
): Promise<Buffer> {
  try {
    console.log('🌸 Starting pink area mockup generation...');
    
    // Detect pink areas in the mockup template
    const pinkAreas = await detectPinkAreas(mockupTemplateBuffer);
    
    if (pinkAreas.length === 0) {
      throw new Error('No pink areas detected in mockup template. Please ensure the template has pink-colored areas where images should be placed.');
    }
    
    // Use the largest pink area for image placement
    const targetArea = pinkAreas.reduce((largest, current) => 
      (current.width * current.height) > (largest.width * largest.height) ? current : largest
    );
    
    console.log(`🌸 Using pink area: ${targetArea.width}x${targetArea.height} at (${targetArea.x}, ${targetArea.y})`);
    
    // Load the mockup template and artwork
    const mockupImage = await loadImage(mockupTemplateBuffer);
    const artworkImage = await loadImage(artworkImageBuffer);
    
    // Create canvas with mockup dimensions
    const canvas = createCanvas(mockupImage.width, mockupImage.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the original mockup template
    ctx.drawImage(mockupImage, 0, 0);
    
    // Calculate artwork scaling to fit pink area while maintaining aspect ratio
    const artworkAspect = artworkImage.width / artworkImage.height;
    const areaAspect = targetArea.width / targetArea.height;
    
    let drawWidth = targetArea.width;
    let drawHeight = targetArea.height;
    
    if (artworkAspect > areaAspect) {
      // Artwork is wider than area
      drawHeight = targetArea.width / artworkAspect;
    } else {
      // Artwork is taller than area
      drawWidth = targetArea.height * artworkAspect;
    }
    
    // Center the artwork in the pink area
    const drawX = targetArea.x + (targetArea.width - drawWidth) / 2;
    const drawY = targetArea.y + (targetArea.height - drawHeight) / 2;
    
    // Draw the artwork over the pink area
    ctx.drawImage(artworkImage, drawX, drawY, drawWidth, drawHeight);
    
    console.log(`🌸 Placed artwork at (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
    
    // Convert canvas to buffer and process with Sharp for 300 DPI
    const canvasBuffer = canvas.toBuffer('image/jpeg');
    
    const finalBuffer = await sharp(canvasBuffer)
      .jpeg({ quality: 95 })
      .withMetadata({
        density: 300 // Ensure 300 DPI for print quality
      })
      .toBuffer();
    
    console.log('✅ Pink area mockup generated successfully');
    return finalBuffer;
    
  } catch (error) {
    console.error('Failed to generate pink area mockup:', error);
    throw new Error(`Pink area mockup generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test function to validate pink area detection
 */
export async function testPinkAreaDetection(mockupTemplateBuffer: Buffer): Promise<{
  areas: PinkAreaBounds[],
  totalPixels: number,
  largestArea: PinkAreaBounds | null
}> {
  const areas = await detectPinkAreas(mockupTemplateBuffer);
  const totalPixels = areas.reduce((sum, area) => sum + area.pixels.length, 0);
  const largestArea = areas.length > 0 ? 
    areas.reduce((largest, current) => 
      (current.width * current.height) > (largest.width * largest.height) ? current : largest
    ) : null;
  
  return {
    areas,
    totalPixels,
    largestArea
  };
}
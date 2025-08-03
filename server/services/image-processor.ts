import sharp from "sharp";
import { createCanvas, loadImage } from "canvas";

export const PRINT_FORMATS = {
  "4x5": { width: 2400, height: 3000 }, // 8x10 at 300dpi
  "3x4": { width: 5400, height: 7200 }, // 18x24 at 300dpi
  "2x3": { width: 3600, height: 5400 }, // 12x18 at 300dpi
  "11x14": { width: 3300, height: 4200 }, // 11x14 at 300dpi
  "A4": { width: 2480, height: 3508 }, // A4 at 300dpi
};

export async function resizeImageToFormats(imageBuffer: Buffer): Promise<{ [format: string]: Buffer }> {
  const results: { [format: string]: Buffer } = {};
  
  for (const [format, dimensions] of Object.entries(PRINT_FORMATS)) {
    try {
      const resized = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: "inside",
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ 
          quality: 95,
        })
        .withMetadata({
          density: 300 // Set DPI to 300
        })
        .toBuffer();
      
      results[format] = resized;
    } catch (error) {
      console.error(`Failed to resize to ${format}:`, error);
    }
  }
  
  return results;
}

export async function generateMockup(imageBuffer: Buffer, template: string): Promise<Buffer> {
  try {
    // Create a canvas for the mockup
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext("2d");
    
    // Set background based on template
    const backgrounds = {
      "living-room": "#f5f5f5",
      "bedroom": "#e8e8e8",
      "office": "#ffffff",
      "kitchen": "#f9f9f9",
      "hallway": "#eeeeee",
      "gallery": "#fafafa"
    };
    
    ctx.fillStyle = backgrounds[template as keyof typeof backgrounds] || "#ffffff";
    ctx.fillRect(0, 0, 1200, 800);
    
    // Load and draw the artwork image
    const image = await loadImage(imageBuffer);
    
    // Calculate aspect ratio and positioning
    const maxWidth = 400;
    const maxHeight = 300;
    const aspectRatio = image.width / image.height;
    
    let drawWidth = maxWidth;
    let drawHeight = maxWidth / aspectRatio;
    
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = maxHeight * aspectRatio;
    }
    
    const x = (1200 - drawWidth) / 2;
    const y = (800 - drawHeight) / 2;
    
    // Add shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Draw white frame
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 20, y - 20, drawWidth + 40, drawHeight + 40);
    
    // Draw the artwork
    ctx.shadowColor = "transparent";
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    
    // Convert canvas to buffer
    return canvas.toBuffer("image/jpeg");
  } catch (error) {
    throw new Error("Failed to generate mockup: " + (error as Error).message);
  }
}

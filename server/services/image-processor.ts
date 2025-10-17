import sharp from "sharp";
import { createCanvas, loadImage } from "canvas";
import { DEFAULT_PRINT_FORMAT_IDS, PRINT_FORMATS, type PrintFormatId } from "@shared/print-formats";

/**
 * Generate a smaller thumbnail/preview version of an image for mockups and UI display
 * This significantly reduces database size and improves performance
 * @param imageBuffer - Original image buffer (can be very large)
 * @param maxWidth - Maximum width for thumbnail (default: 1200px)
 * @param maxHeight - Maximum height for thumbnail (default: 1200px)
 * @param quality - JPEG quality (default: 85)
 * @returns Thumbnail as base64 data URL
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 85
): Promise<string> {
  try {
    const thumbnail = await sharp(imageBuffer, {
      limitInputPixels: 500000000
    })
      .resize(maxWidth, maxHeight, {
        fit: "inside", // Maintain aspect ratio, fit within bounds
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({
        quality,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    const base64 = thumbnail.toString('base64');
    console.log(`📸 Generated thumbnail: ${Math.round(base64.length / 1024)}KB (from ${Math.round(imageBuffer.length / 1024)}KB)`);
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw new Error('Failed to generate thumbnail: ' + (error as Error).message);
  }
}

export async function resizeImageToFormats(
  imageBuffer: Buffer,
  requestedFormats?: PrintFormatId[]
): Promise<{ [format in PrintFormatId]?: Buffer }> {
  const results: { [format in PrintFormatId]?: Buffer } = {};

  // Get original image dimensions for debugging
  // Increase pixel limit to handle large upscaled images (4x upscaling can create very large images)
  const originalMeta = await sharp(imageBuffer, { 
    limitInputPixels: 500000000 // 500 megapixels (increased from default 268MP)
  }).metadata();
  console.log(`dY-��,? Original image dimensions: ${originalMeta.width}x${originalMeta.height}`);

  const formatsToProcess = (requestedFormats && requestedFormats.length > 0
    ? requestedFormats
    : DEFAULT_PRINT_FORMAT_IDS
  ).filter((format): format is PrintFormatId => format in PRINT_FORMATS);

  for (const format of formatsToProcess) {
    const dimensions = PRINT_FORMATS[format];
    try {
      console.log(`dY", Resizing to ${format}: ${dimensions.width}x${dimensions.height}`);

      const resized = await sharp(imageBuffer, {
          limitInputPixels: 500000000 // Same limit for processing
        })
        .resize(dimensions.width, dimensions.height, {
          fit: "fill", // Fill the entire target dimensions
          withoutEnlargement: false, // Allow enlargement for print formats
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .jpeg({
          quality: 95,
        })
        .withMetadata({
          density: 300, // Set DPI to 300
        })
        .toBuffer();

      // Check actual dimensions of resized image
      const resizedMeta = await sharp(resized, {
        limitInputPixels: 500000000
      }).metadata();
      console.log(`�o. ${format} resized to: ${resizedMeta.width}x${resizedMeta.height}`);

      results[format] = resized;
    } catch (error) {
      console.error(`Failed to resize to ${format}:`, error);
    }
  }

  console.log(`dYZ_ Created ${Object.keys(results).length} print format variations`);
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
      bedroom: "#e8e8e8",
      office: "#ffffff",
      kitchen: "#f9f9f9",
      hallway: "#eeeeee",
      gallery: "#fafafa",
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

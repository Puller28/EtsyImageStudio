// Fallback image upscaling using Sharp library for basic upscaling
// This provides a working solution when external APIs are unavailable

import sharp from 'sharp';

export async function fallbackUpscale(imageBuffer: Buffer, scale: number): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const newWidth = Math.round((metadata.width || 100) * scale);
    const newHeight = Math.round((metadata.height || 100) * scale);

    // Use Sharp's Lanczos algorithm for high-quality upscaling
    const upscaledBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill'
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    return upscaledBuffer;
  } catch (error) {
    console.error('Fallback upscaling error:', error);
    throw new Error('Failed to upscale image using fallback method');
  }
}

// Convert base64 to buffer and back
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
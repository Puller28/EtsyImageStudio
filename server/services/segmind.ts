// Segmind API integration for image upscaling
// Uses Real-ESRGAN models for 2x and 4x image enhancement
import sharp from 'sharp';

interface SegmindUpscaleOptions {
  scale: 2 | 4;
  image: string; // base64 encoded image
}

interface SegmindResponse {
  image: string; // base64 encoded result
}

export class SegmindService {
  private apiKey: string;
  private baseUrl = 'https://api.segmind.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Compress image if it exceeds Segmind's 20MB limit
   * Reduces quality and/or dimensions to fit within limit
   */
  private async compressImageIfNeeded(base64Image: string): Promise<string> {
    const MAX_SIZE_MB = 18; // Target 18MB to have buffer below 20MB limit
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    
    // Calculate current size
    const currentSizeBytes = Buffer.from(base64Image, 'base64').length;
    const currentSizeMB = currentSizeBytes / (1024 * 1024);
    
    console.log(`📏 Image size: ${currentSizeMB.toFixed(2)}MB`);
    
    // If under limit, return as-is
    if (currentSizeBytes <= MAX_SIZE_BYTES) {
      console.log('✅ Image size OK, no compression needed');
      return base64Image;
    }
    
    console.log(`⚠️ Image exceeds ${MAX_SIZE_MB}MB, compressing...`);
    
    try {
      const imageBuffer = Buffer.from(base64Image, 'base64');
      let quality = 85;
      let compressed: Buffer = imageBuffer;
      
      // Try compression with decreasing quality
      while (compressed.length > MAX_SIZE_BYTES && quality > 50) {
        compressed = await sharp(imageBuffer)
          .jpeg({ quality })
          .toBuffer() as Buffer;
        
        const compressedSizeMB = compressed.length / (1024 * 1024);
        console.log(`🔄 Compressed to ${compressedSizeMB.toFixed(2)}MB at quality ${quality}`);
        
        if (compressed.length <= MAX_SIZE_BYTES) {
          break;
        }
        
        quality -= 10;
      }
      
      // If still too large, resize dimensions
      if (compressed.length > MAX_SIZE_BYTES) {
        console.log('🔄 Still too large, resizing dimensions...');
        const metadata = await sharp(imageBuffer).metadata();
        const currentWidth = metadata.width || 1024;
        const currentHeight = metadata.height || 1024;
        
        // Reduce to 80% of original size
        const newWidth = Math.floor(currentWidth * 0.8);
        const newHeight = Math.floor(currentHeight * 0.8);
        
        compressed = await sharp(imageBuffer)
          .resize(newWidth, newHeight, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer() as Buffer;
        
        const finalSizeMB = compressed.length / (1024 * 1024);
        console.log(`✅ Resized to ${newWidth}x${newHeight}, final size: ${finalSizeMB.toFixed(2)}MB`);
      }
      
      const finalBase64 = compressed.toString('base64');
      const finalSizeMB = compressed.length / (1024 * 1024);
      console.log(`✅ Compression complete: ${currentSizeMB.toFixed(2)}MB → ${finalSizeMB.toFixed(2)}MB`);
      
      return finalBase64;
    } catch (error) {
      console.error('❌ Compression failed:', error);
      throw new Error('Failed to compress image for upscaling');
    }
  }

  async upscaleImage(options: SegmindUpscaleOptions): Promise<string> {
    // Validate API key exists
    if (!this.apiKey || this.apiKey.length === 0) {
      throw new Error('Segmind API key is not configured. Please add SEGMIND_API_KEY to your environment variables.');
    }

    console.log('Starting Segmind upscaling with scale:', options.scale);
    console.log('🔍 Image format check:', {
      imageStart: options.image.substring(0, 50),
      imageLength: options.image.length,
      containsDataURL: options.image.includes('data:'),
      containsBase64: options.image.includes('base64')
    });
    
    // Clean the base64 data - remove data URL prefix if present
    let cleanBase64 = options.image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    console.log('🔍 Cleaned base64:', {
      originalLength: options.image.length,
      cleanedLength: cleanBase64.length,
      cleanedStart: cleanBase64.substring(0, 50)
    });
    
    // Compress if needed to fit within Segmind's 20MB limit
    cleanBase64 = await this.compressImageIfNeeded(cleanBase64);
    
    try {
      const response = await fetch(`${this.baseUrl}/esrgan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          image: cleanBase64,
          scale: options.scale
        }),
      });

      console.log('Segmind API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Segmind API error response:', errorText);
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Invalid Segmind API key. Please check your SEGMIND_API_KEY in environment variables.');
        } else if (response.status === 402) {
          throw new Error('Insufficient credits in your Segmind account. Please add more credits.');
        } else if (response.status === 404) {
          throw new Error('Segmind ESRGAN model not found. Please check the API documentation.');
        } else {
          throw new Error(`Segmind API error (${response.status}): ${errorText}`);
        }
      }

      // Check if response is JSON or binary image
      const contentType = response.headers.get('content-type');
      console.log('Segmind response content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        // JSON response format
        const result: SegmindResponse = await response.json();
        console.log('Segmind upscaling completed successfully (JSON format)');
        return result.image;
      } else {
        // Binary image response format - process through Sharp to set 300 DPI
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        
        // Process with Sharp to ensure 300 DPI metadata
        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 95 })
          .withMetadata({
            density: 300 // Ensure 300 DPI
          })
          .toBuffer();
        
        const base64Image = processedBuffer.toString('base64');
        console.log('Segmind upscaling completed successfully (binary format with 300 DPI)');
        return base64Image;
      }
    } catch (error) {
      console.error('Segmind upscaling error:', error);
      throw new Error(`Failed to upscale image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      // Use a minimal 1x1 pixel test image
      const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      await this.upscaleImage({ image: testImage, scale: 2 });
      return true;
    } catch (error) {
      console.error('Segmind connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const segmindService = new SegmindService(process.env.SEGMIND_API_KEY || '');
// Segmind API integration for image upscaling
// Uses Real-ESRGAN models for 2x and 4x image enhancement

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

  async upscaleImage(options: SegmindUpscaleOptions): Promise<string> {
    // Validate API key exists
    if (!this.apiKey || this.apiKey.length === 0) {
      throw new Error('Segmind API key is not configured. Please add SEGMIND_API_KEY to your environment variables.');
    }

    console.log('Starting Segmind upscaling with scale:', options.scale);
    
    try {
      const response = await fetch(`${this.baseUrl}/esrgan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          image: options.image,
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
        // Binary image response format
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const base64Image = imageBuffer.toString('base64');
        console.log('Segmind upscaling completed successfully (binary format)');
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